use std::{cmp::Reverse, collections::BTreeMap, iter::Sum, ops::AddAssign};

use super::summary::{PlayedDrum, Plays};
use crate::{
    canon::Canon,
    engine::EngineMap,
    midi,
    note::Note,
    parts::{hit_notes, ConvertError, PartIndex, Selection},
};

/// How many hits each note has among the note-ons a conversion reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoteHits([u32; Note::COUNT]);

impl Default for NoteHits {
    fn default() -> Self {
        Self([0; Note::COUNT])
    }
}

impl NoteHits {
    fn get(&self, note: Note) -> u32 {
        self.0[note.index()]
    }

    pub(super) fn total(&self) -> u32 {
        self.0.iter().sum()
    }

    pub(super) fn recognized_by(&self, engine: &EngineMap) -> u32 {
        engine.decodings().map(|(note, _)| self.get(note)).sum()
    }

    pub(super) fn played_on(&self, engine: &EngineMap) -> Plays {
        let mut by_drum: BTreeMap<Canon, u32> = BTreeMap::new();
        let mut unknown = 0;
        let decoded = Note::ALL
            .into_iter()
            .filter(|&note| self.get(note) > 0)
            .map(|note| (engine.decode(note), self.get(note)));
        for (canon, hits) in decoded {
            match canon {
                Some(canon) => *by_drum.entry(canon).or_default() += hits,
                None => unknown += hits,
            }
        }
        let mut drums: Vec<PlayedDrum> = by_drum
            .into_iter()
            .map(|(canon, hits)| PlayedDrum { canon, hits })
            .collect();
        drums.sort_by_key(|d| Reverse(d.hits));
        Plays { drums, unknown }
    }
}

impl AddAssign<&Self> for NoteHits {
    fn add_assign(&mut self, other: &Self) {
        for (mine, theirs) in self.0.iter_mut().zip(other.0) {
            *mine += theirs;
        }
    }
}

impl FromIterator<Note> for NoteHits {
    fn from_iter<I: IntoIterator<Item = Note>>(notes: I) -> Self {
        let mut hits = Self::default();
        for note in notes {
            hits.0[note.index()] += 1;
        }
        hits
    }
}

impl Sum for NoteHits {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::default(), |mut total, hits| {
            total += &hits;
            total
        })
    }
}

/// The hits on each note among the note-ons a conversion with `selection` rewrites in
/// `midi`; none when it would ask which parts are the drums.
pub fn note_hits(midi: &[u8], selection: impl Into<Selection>) -> Result<NoteHits, ConvertError> {
    let index = PartIndex::of(&midi::parse(midi)?.smf);
    let notes = hit_notes(&index, &selection.into()).map_err(ConvertError::NoSuchPart)?;
    Ok(notes.into_iter().collect())
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, off, on, silent_on, tracks, DRUMS};

    use super::*;
    use crate::{midi::Channel, note::n, parts::ChannelScope};

    fn hits_of(midi: &[u8], scope: ChannelScope) -> Vec<(u8, u32)> {
        let hits = note_hits(midi, scope).unwrap();
        Note::ALL
            .into_iter()
            .filter(|&note| hits.get(note) > 0)
            .map(|note| (note.get(), hits.get(note)))
            .collect()
    }

    #[test]
    fn note_hits_counts_each_note_on_with_a_velocity() {
        let midi = drums(&[
            (0, on(36)),
            (10, off(36)),
            (0, on(36)),
            (10, silent_on(36)),
            (0, on(38)),
        ]);
        assert_eq!(hits_of(&midi, ChannelScope::Auto), [(36, 2), (38, 1)]);
    }

    fn drum_track_and_bass_track() -> Vec<u8> {
        tracks(&[&[(0, DRUMS, on(36)), (10, 1, on(38))], &[(0, 1, on(40))]])
    }

    #[test]
    fn note_hits_reads_only_the_parts_auto_converts() {
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), ChannelScope::Auto),
            [(36, 1)]
        );
    }

    #[test]
    fn note_hits_leaves_out_a_file_auto_must_ask_about() {
        let midi = tracks(&[&[(0, 1, on(36))], &[(0, 2, on(38))]]);
        assert_eq!(hits_of(&midi, ChannelScope::Auto), []);
    }

    #[test]
    fn note_hits_reads_only_the_channel_a_scope_names() {
        let one = ChannelScope::Only(Channel::new(1).unwrap());
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), one),
            [(38, 1), (40, 1)]
        );
    }

    #[test]
    fn note_hits_of_a_file_that_does_not_parse_is_an_error() {
        assert!(note_hits(b"garbage", ChannelScope::Auto).is_err());
    }

    #[test]
    fn note_hits_add_up_note_by_note() {
        let a = note_hits(&drums(&[(0, on(36)), (0, on(38))]), ChannelScope::Auto).unwrap();
        let b = note_hits(&drums(&[(0, on(36))]), ChannelScope::Auto).unwrap();
        let sum: NoteHits = [a, b].into_iter().sum();
        assert_eq!((sum.get(n(36)), sum.get(n(38)), sum.total()), (2, 1, 3));
    }
}
