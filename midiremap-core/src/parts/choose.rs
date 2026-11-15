use std::collections::BTreeSet;

use super::{
    part::{Part, PartSet, Parts},
    scan::PartIndex,
    selection::{ChannelScope, Selection},
};
use crate::{
    midi::{Channel, ChannelFilter, TrackNo},
    note::Note,
};

/// One filter per track of the file it was made for, in track order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct TrackFilters(Vec<ChannelFilter>);

impl TrackFilters {
    fn uniform(index: &PartIndex, filter: ChannelFilter) -> Self {
        Self(vec![filter; index.tracks()])
    }

    /// Accepting in each track of `index`'s file the channels `parts` names in it, every one of
    /// which has hits in the file.
    fn of<'p>(index: &PartIndex, parts: impl IntoIterator<Item = &'p Part>) -> Self {
        let mut filters = vec![ChannelFilter::NONE; index.tracks()];
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

/// What `selection` rewrites in `index`'s file, or the picked part the file has no hit in.
/// `Auto` takes every channel-10 part when the file has one, offering the other parts of their
/// tracks; else its one part with hits; else it asks.
pub(crate) fn choose(index: &PartIndex, selection: &Selection) -> Result<Choice, Part> {
    let present = index.parts();
    let (filters, offers) = match selection {
        Selection::Parts(parts) => match parts.iter().find(|p| !present.contains(p)) {
            Some(&missing) => return Err(missing),
            None => (TrackFilters::of(index, parts.iter()), PartSet::new()),
        },
        Selection::Scope(ChannelScope::All) => (
            TrackFilters::uniform(index, ChannelFilter::ALL),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Only(channel)) => (
            TrackFilters::uniform(index, ChannelFilter::NONE.with(*channel)),
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
            (TrackFilters::of(index, &picked), offers)
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

/// The note of every hit of `index`'s file that a conversion with `selection` rewrites; none
/// when it would ask. The notes come part by part, in part order, not in file order: the only
/// reader, `note_hits`, counts them per note, which no order changes.
pub(crate) fn hit_notes(index: &PartIndex, selection: &Selection) -> Result<Vec<Note>, Part> {
    let Choice::Convert { picked, .. } = choose(index, selection)? else {
        return Ok(Vec::new());
    };
    Ok(index
        .hits()
        .filter(|(part, _)| picked.contains(part))
        .flat_map(|(_, notes)| notes.iter().copied())
        .collect())
}
