use std::fmt;

use midly::num::u7;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

/// A MIDI note number, always within `0..=127`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct Note(u8);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("note {0} out of range 0..=127")]
pub struct NoteOutOfRange(pub u8);

impl Note {
    pub const MAX: u8 = 127;

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

    /// Every note, ascending.
    pub fn all() -> impl Iterator<Item = Self> {
        (0..=Self::MAX).map(Self)
    }
}

impl TryFrom<u8> for Note {
    type Error = NoteOutOfRange;

    fn try_from(n: u8) -> Result<Self, Self::Error> {
        Self::new(n).ok_or(NoteOutOfRange(n))
    }
}

impl From<u7> for Note {
    fn from(key: u7) -> Self {
        Self(key.as_int())
    }
}

impl From<Note> for u7 {
    fn from(note: Note) -> Self {
        u7::from_int_lossy(note.0)
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
    fn accepts_0_to_127_only() {
        assert_eq!(Note::new(0).map(Note::get), Some(0));
        assert_eq!(Note::new(127).map(Note::get), Some(127));
        assert_eq!(Note::new(128), None);
        assert_eq!(Note::try_from(200), Err(NoteOutOfRange(200)));
    }

    #[test]
    fn all_is_every_note_ascending() {
        assert_eq!(
            Note::all().map(Note::get).collect::<Vec<_>>(),
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
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(Note::from(u7::from(n)), n);
    }

    #[test]
    fn map_keys_serialize_as_strings() {
        let map = std::collections::HashMap::from([(Note::new(51).unwrap(), 1u32)]);
        assert_eq!(serde_json::to_string(&map).unwrap(), r#"{"51":1}"#);
    }
}
