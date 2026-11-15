use std::collections::{BTreeMap, BTreeSet};

use midly::{MetaMessage, Smf, TrackEventKind};

use super::{
    part::{Part, PartSet, Parts},
    selection::{ChannelScope, Selection},
};
use crate::{
    midi::{hit, Channel, ChannelFilter, TrackNo},
    note::Note,
};

/// The note of every hit of each part of `smf`, in order.
pub(crate) fn part_hits(smf: &Smf) -> BTreeMap<Part, Vec<Note>> {
    let mut hits: BTreeMap<Part, Vec<Note>> = BTreeMap::new();
    for (index, track) in smf.tracks.iter().enumerate() {
        for (channel, note) in track.iter().filter_map(|ev| hit(&ev.kind)) {
            let part = Part {
                track: TrackNo::at(index),
                channel,
            };
            hits.entry(part).or_default().push(note);
        }
    }
    hits
}

/// The name each track of `smf` gives itself, when it gives a non-empty one.
pub(crate) fn track_names(smf: &Smf) -> Vec<Option<String>> {
    smf.tracks
        .iter()
        .map(|track| {
            track.iter().find_map(|ev| match ev.kind {
                TrackEventKind::Meta(MetaMessage::TrackName(name)) => {
                    let name = String::from_utf8_lossy(name).trim().to_owned();
                    (!name.is_empty()).then_some(name)
                }
                TrackEventKind::Midi { .. }
                | TrackEventKind::SysEx(_)
                | TrackEventKind::Escape(_)
                | TrackEventKind::Meta(_) => None,
            })
        })
        .collect()
}

/// One filter per track of the file it was made for, in track order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct TrackFilters(Vec<ChannelFilter>);

impl TrackFilters {
    fn uniform(smf: &Smf, filter: ChannelFilter) -> Self {
        Self(vec![filter; smf.tracks.len()])
    }

    /// Accepting in each track of `smf` the channels `parts` names in it, every one of which
    /// has hits in `smf`.
    fn of<'p>(smf: &Smf, parts: impl IntoIterator<Item = &'p Part>) -> Self {
        let mut filters = vec![ChannelFilter::NONE; smf.tracks.len()];
        for part in parts {
            let filter = &mut filters[part.track.index()];
            *filter = filter.with(part.channel);
        }
        Self(filters)
    }

    /// Whether it accepts `part`, a part with hits in its file.
    fn accepts(&self, part: Part) -> bool {
        self.0[part.track.index()].accepts(part.channel)
    }
}

impl IntoIterator for TrackFilters {
    type Item = ChannelFilter;
    type IntoIter = std::vec::IntoIter<ChannelFilter>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

/// What a selection comes to for one file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Choice {
    /// Rewrites what `filters` accept, which are the parts with hits in `picked`; leaves
    /// `offers` as they are: parts beside channel-10 hits in their track that nothing says
    /// are drums.
    Convert {
        filters: TrackFilters,
        picked: PartSet,
        offers: PartSet,
    },
    /// Rewrites nothing: these parts have hits, none on channel 10, and only the user can
    /// tell which are the drums.
    Ask(Parts),
}

/// What `selection` rewrites in `smf`, or the picked part `smf` has no hit in. `Auto` takes
/// every channel-10 part when the file has one, offering the other parts of their tracks;
/// else its one part with hits; else it asks.
pub(crate) fn choose(smf: &Smf, selection: &Selection) -> Result<Choice, Part> {
    let present: PartSet = part_hits(smf).into_keys().collect();
    let (filters, offers) = match selection {
        Selection::Parts(parts) => match parts.iter().find(|p| !present.contains(p)) {
            Some(&missing) => return Err(missing),
            None => (TrackFilters::of(smf, parts.iter()), PartSet::new()),
        },
        Selection::Scope(ChannelScope::All) => (
            TrackFilters::uniform(smf, ChannelFilter::ALL),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Only(channel)) => (
            TrackFilters::uniform(smf, ChannelFilter::NONE.with(*channel)),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Auto) => {
            let (drums, others): (PartSet, PartSet) =
                present.iter().partition(|p| p.channel == Channel::DRUMS);
            if drums.is_empty() && others.len() > 1 {
                return Ok(Choice::Ask(Parts::from_set(others)));
            }
            let drum_tracks: BTreeSet<TrackNo> = drums.iter().map(|p| p.track).collect();
            let (offers, alone): (PartSet, PartSet) = others
                .into_iter()
                .partition(|p| drum_tracks.contains(&p.track));
            let picked = if drums.is_empty() { alone } else { drums };
            (TrackFilters::of(smf, &picked), offers)
        }
    };
    let picked = present
        .into_iter()
        .filter(|&p| filters.accepts(p))
        .collect();
    Ok(Choice::Convert {
        filters,
        picked,
        offers,
    })
}

/// The note of every hit in `smf` that a conversion with `selection` rewrites, track by
/// track; none when it would ask.
pub(crate) fn hit_notes(smf: &Smf, selection: &Selection) -> Result<Vec<Note>, Part> {
    let Choice::Convert { filters, .. } = choose(smf, selection)? else {
        return Ok(Vec::new());
    };
    Ok(smf
        .tracks
        .iter()
        .zip(filters)
        .flat_map(|(track, filter)| {
            track.iter().filter_map(move |ev| {
                hit(&ev.kind)
                    .filter(|&(channel, _)| filter.accepts(channel))
                    .map(|(_, note)| note)
            })
        })
        .collect())
}
