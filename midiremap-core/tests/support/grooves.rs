use std::collections::HashSet;

use midiremap_core::{resolve_on, sample_file, Canon, EngineMap, MissingDrums};
use midiremap_testkit::{drums, on};

/// The rounds a groove plays: the first plays every note, the others only the core notes.
const ROUNDS: usize = 4;

/// The ticks between two note-ons.
const STEP: u32 = 120;

/// A file of one engine's notes, as the proofs play it.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Corpus {
    /// The notes the engine plays the core kit's drums on.
    Kit,
    /// Every note the engine plays a drum on.
    Full,
    /// The product's own sample groove.
    Sample,
}

impl Corpus {
    pub const ALL: [Self; 3] = [Self::Kit, Self::Full, Self::Sample];

    pub fn name(self) -> &'static str {
        match self {
            Self::Kit => "kit",
            Self::Full => "full",
            Self::Sample => "sample",
        }
    }

    /// The groove of this corpus written for `engine`.
    pub fn groove(self, engine: &EngineMap) -> Vec<u8> {
        match self {
            Self::Kit => kit_groove(engine),
            Self::Full => full_groove(engine),
            Self::Sample => sample_file(engine),
        }
    }
}

/// One track on the drum channel, a note-on every [`STEP`] ticks: the first round plays every
/// note in its listed order, the later rounds again the notes whose drum is a kick, a snare or
/// a hi-hat.
fn rounds(notes: &[(u8, bool)]) -> Vec<u8> {
    let played: Vec<_> = (0..ROUNDS)
        .flat_map(|round| {
            notes
                .iter()
                .filter(move |&&(_, core)| round == 0 || core)
                .map(|&(note, _)| (STEP, on(note)))
        })
        .collect();
    drums(&played)
}

/// The notes `engine` plays the drums of [`Canon::CORE_KIT`] on, with the nearest drum it has
/// for one it lacks, in that order, each note listed once.
pub fn kit_groove(engine: &EngineMap) -> Vec<u8> {
    let mut seen = HashSet::new();
    let notes: Vec<(u8, bool)> = Canon::CORE_KIT
        .into_iter()
        .filter_map(|drum| {
            let note = resolve_on(engine, drum, MissingDrums::Nearest).note()?;
            Some((note.get(), drum.family().is_core()))
        })
        .filter(|&(note, _)| seen.insert(note))
        .collect();
    rounds(&notes)
}

/// Every note `engine` plays a drum on, ascending.
pub fn full_groove(engine: &EngineMap) -> Vec<u8> {
    let mut notes: Vec<(u8, bool)> = engine
        .encodings()
        .map(|(canon, note)| (note.get(), canon.family().is_core()))
        .collect();
    notes.sort_unstable();
    rounds(&notes)
}
