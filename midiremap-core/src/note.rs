use std::{fmt, str::FromStr};

use midly::num::u7;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

const SEMITONES: u8 = 12;

const NAMES: [&str; SEMITONES as usize] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/// Which octave number middle C (note 60) gets: `C1` calls it C4 (Reaper, Logic, Ableton,
/// Guitar Pro), `C2` calls it C3 (Cubase, FL Studio, Studio One).
#[derive(Copy, Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum OctaveBase {
    #[default]
    C1,
    C2,
}

impl OctaveBase {
    const fn offset(self) -> i16 {
        match self {
            Self::C1 => 1,
            Self::C2 => 2,
        }
    }
}

/// A MIDI note number, always within `0..=127`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct Note(u8);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("note {0} out of range 0..={max}", max = Note::MAX)]
pub struct NoteOutOfRange(pub u8);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("'{0}' is not a MIDI note in 0..={max}", max = Note::MAX)]
pub struct NoteParseError(String);

impl Note {
    const MAX: u8 = 127;

    pub(crate) const COUNT: usize = Self::MAX as usize + 1;

    /// Every note, ascending.
    pub const ALL: [Self; Self::COUNT] = {
        let mut notes = [Self(0); Self::COUNT];
        let mut n = 0;
        while n <= Self::MAX {
            notes[n as usize] = Self(n);
            n += 1;
        }
        notes
    };

    pub const fn new(n: u8) -> Option<Self> {
        if n <= Self::MAX {
            Some(Self(n))
        } else {
            None
        }
    }

    pub const fn get(self) -> u8 {
        self.0
    }

    /// The note's position in [`Note::ALL`].
    pub(crate) const fn index(self) -> usize {
        self.0 as usize
    }

    pub(crate) fn from_key(key: u7) -> Self {
        Self(key.as_int())
    }

    pub(crate) fn key(self) -> u7 {
        u7::from_int_lossy(self.0)
    }

    /// The note's name, such as `F#2`, in the given octave convention.
    pub fn name(self, base: OctaveBase) -> String {
        let octave = i16::from(self.0 / SEMITONES) - base.offset();
        format!("{}{octave}", NAMES[usize::from(self.0 % SEMITONES)])
    }
}

impl FromStr for Note {
    type Err = NoteParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.parse::<u8>()
            .ok()
            .and_then(Self::new)
            .ok_or_else(|| NoteParseError(s.to_owned()))
    }
}

impl TryFrom<u8> for Note {
    type Error = NoteOutOfRange;

    fn try_from(n: u8) -> Result<Self, Self::Error> {
        Self::new(n).ok_or(NoteOutOfRange(n))
    }
}

impl fmt::Display for Note {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl Serialize for Note {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_u8(self.0)
    }
}

impl<'de> Deserialize<'de> for Note {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let n = u64::deserialize(d)?;
        u8::try_from(n).ok().and_then(Self::new).ok_or_else(|| {
            de::Error::invalid_value(de::Unexpected::Unsigned(n), &"a MIDI note in 0..=127")
        })
    }
}

#[cfg(test)]
pub(crate) const fn n(x: u8) -> Note {
    Note::new(x).expect("test note in range")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_notes_in_both_octave_conventions() {
        let cases = [
            (0, "C-1", "C-2"),
            (36, "C2", "C1"),
            (42, "F#2", "F#1"),
            (60, "C4", "C3"),
            (127, "G9", "G8"),
        ];
        for (note, c1, c2) in cases {
            assert_eq!(n(note).name(OctaveBase::C1), c1);
            assert_eq!(n(note).name(OctaveBase::C2), c2);
        }
    }

    #[test]
    fn an_octave_base_serializes_in_lowercase() {
        assert_eq!(serde_json::to_string(&OctaveBase::C2).unwrap(), r#""c2""#);
    }

    #[test]
    fn accepts_0_to_127_only() {
        assert_eq!(Note::new(0).map(Note::get), Some(0));
        assert_eq!(Note::new(127).map(Note::get), Some(127));
        assert_eq!(Note::new(128), None);
        assert_eq!(Note::try_from(200), Err(NoteOutOfRange(200)));
    }

    #[test]
    fn all_is_every_note_ascending() {
        assert_eq!(
            Note::ALL.map(Note::get).to_vec(),
            (0..=127).collect::<Vec<_>>()
        );
    }

    #[test]
    fn serde_is_a_plain_number() {
        let n = Note::new(36).unwrap();
        assert_eq!(serde_json::to_string(&n).unwrap(), "36");
        assert_eq!(serde_json::from_str::<Note>("36").unwrap(), n);
    }

    #[test]
    fn deserialize_rejects_out_of_range_with_the_range() {
        for bad in ["128", "200", "70000"] {
            let err = serde_json::from_str::<Note>(bad).unwrap_err();
            assert!(err.to_string().contains("0..=127"), "{bad}: {err}");
        }
    }

    #[test]
    fn a_note_parses_from_its_number_only_in_range() {
        assert_eq!("36".parse::<Note>(), Ok(n(36)));
        assert!("128".parse::<Note>().is_err());
        assert!("kick".parse::<Note>().is_err());
    }

    #[test]
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(Note::from_key(n.key()), n);
    }

    #[test]
    fn map_keys_serialize_as_strings() {
        let map = std::collections::HashMap::from([(Note::new(51).unwrap(), 1u32)]);
        assert_eq!(serde_json::to_string(&map).unwrap(), r#"{"51":1}"#);
    }
}
