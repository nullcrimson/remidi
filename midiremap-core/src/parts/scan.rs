use std::collections::BTreeMap;

use midly::{MetaMessage, Smf, TrackEventKind};

use super::part::{Part, PartSet};
use crate::{
    midi::{hit, TrackNo},
    note::Note,
};

/// The note of every hit of each part of `smf`, in order.
fn part_hits(smf: &Smf) -> BTreeMap<Part, Vec<Note>> {
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
fn track_names(smf: &Smf) -> Vec<Option<String>> {
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

/// The parts of one file: how many tracks it has, the note of every hit of each part in order,
/// and the name each track gives itself. Read from the file once; the choice of what to convert,
/// the hit notes and the part summaries all read it.
pub(crate) struct PartIndex {
    tracks: usize,
    hits: BTreeMap<Part, Vec<Note>>,
    names: Vec<Option<String>>,
}

impl PartIndex {
    /// The parts of `smf`.
    pub(crate) fn of(smf: &Smf) -> Self {
        Self {
            tracks: smf.tracks.len(),
            hits: part_hits(smf),
            names: track_names(smf),
        }
    }

    /// How many tracks the file has.
    pub(crate) fn tracks(&self) -> usize {
        self.tracks
    }

    /// Every part with hits, in part order, and the note of each of its hits in order.
    pub(crate) fn hits(&self) -> impl Iterator<Item = (Part, &[Note])> {
        self.hits
            .iter()
            .map(|(&part, notes)| (part, notes.as_slice()))
    }

    /// Every part with hits.
    pub(crate) fn parts(&self) -> PartSet {
        self.hits.keys().copied().collect()
    }

    /// The name the track of `part` gives itself, when it gives one.
    pub(crate) fn track_name(&self, part: Part) -> Option<&str> {
        self.names[part.track.index()].as_deref()
    }
}
