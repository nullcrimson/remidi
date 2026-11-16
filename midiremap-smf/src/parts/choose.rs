use std::collections::BTreeSet;

use midiremap_note::Note;
use serde::Serialize;

use super::{
    part::{Part, PartSet, Parts},
    scan::PartIndex,
    selection::{ChannelScope, Selection},
};
use crate::midi::{Channel, ChannelFilter, TrackNo};

/// One filter per track of the file it was made for, in track order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrackFilters(Vec<ChannelFilter>);

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

/// What a conversion does with a hit on a note, as its caller knows it: plays it, drops it
/// since the target has no drum for it, or meets a note the source does not know.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitFate {
    Played,
    Dropped,
    Unknown,
}

/// Why `Auto` asks which parts of a file are the drums.
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum AskReason {
    /// Several parts have hits, none on channel 10.
    NoChannelTen,
}

/// What a selection comes to for one file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Choice {
    /// Rewrites what `filters` accept, which are the parts with hits in `picked`; leaves
    /// `offers` as they are: parts beside channel-10 hits in their track that nothing says
    /// are drums.
    Convert {
        filters: TrackFilters,
        picked: PartSet,
        offers: PartSet,
    },
    /// Rewrites nothing: these parts have hits, and for the reason `why` only the user can
    /// tell which are the drums.
    Ask { parts: Parts, why: AskReason },
}

/// What `selection` rewrites in `index`'s file, or the picked part the file has no hit in.
/// `Auto` takes every channel-10 part when the file has one, offering the other parts of their
/// tracks; else its one part with hits; else it asks. `judge` tells what the conversion does
/// with a hit on each note.
pub fn choose(
    index: &PartIndex,
    selection: &Selection,
    _judge: impl Fn(Note) -> HitFate,
) -> Result<Choice, Part> {
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
                return Ok(Choice::Ask {
                    parts: Parts::from_set(others),
                    why: AskReason::NoChannelTen,
                });
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
/// when it would ask, for any reason, judging every note played: no mapping is known while a
/// source is being fitted. The notes come part by part, in part order, not in file order: the
/// only reader, `note_hits`, counts them per note, which no order changes.
pub fn hit_notes(index: &PartIndex, selection: &Selection) -> Result<Vec<Note>, Part> {
    let Choice::Convert { picked, .. } = choose(index, selection, |_| HitFate::Played)? else {
        return Ok(Vec::new());
    };
    Ok(index
        .hits()
        .filter(|(part, _)| picked.contains(part))
        .flat_map(|(_, notes)| notes.iter().copied())
        .collect())
}
