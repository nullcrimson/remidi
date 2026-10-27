use std::{collections::BTreeMap, fmt, str::FromStr};

use midly::num::u7;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};
use strum::VariantArray;

const SEMITONES: u8 = 12;

const NAMES: [&str; SEMITONES as usize] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/// Which octave number middle C (note 60) gets: `C1` calls it C4 (Reaper, Logic, Ableton,
/// Guitar Pro), `C2` calls it C3 (Cubase, FL Studio, Studio One).
#[derive(
    Copy,
    Clone,
    Debug,
    Default,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Serialize,
    Deserialize,
    VariantArray,
)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum OctaveBase {
    #[default]
    C1,
    C2,
}

impl OctaveBase {
    /// Every octave convention.
    pub const ALL: &[Self] = Self::VARIANTS;

    const fn offset(self) -> i8 {
        match self {
            Self::C1 => 1,
            Self::C2 => 2,
        }
    }
}

/// A MIDI note number, always within `0..=127`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(type = r#"number & { readonly __brand: "Note" }"#)
)]
pub struct Note(u8);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("'{0}' is not a MIDI note in 0..={max}", max = Note::MAX)]
pub struct NoteParseError(String);

impl Note {
    pub(crate) const MAX: u8 = 127;

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

    pub fn new(n: u8) -> Option<Self> {
        (n <= Self::MAX).then_some(Self(n))
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

    /// How many semitones `to` lies above this note; negative when it lies below.
    pub(crate) fn semitones_to(self, to: Note) -> i16 {
        i16::from(to.0) - i16::from(self.0)
    }

    /// Serializes a map keyed by note with every key as text, which a JavaScript object
    /// needs of its keys: `#[serde(serialize_with = "Note::text_keys")]`.
    pub fn text_keys<V: Serialize, S: Serializer>(
        map: &BTreeMap<Self, V>,
        s: S,
    ) -> Result<S::Ok, S::Error> {
        s.collect_map(map.iter().map(|(note, value)| (note.to_string(), value)))
    }

    /// Reads a map keyed by note numbers written as text, as [`Note::text_keys`] writes it.
    pub(crate) fn from_text_keys<'de, V: Deserialize<'de>, D: Deserializer<'de>>(
        d: D,
    ) -> Result<BTreeMap<Self, V>, D::Error> {
        BTreeMap::<String, V>::deserialize(d)?
            .into_iter()
            .map(|(key, value)| {
                key.parse()
                    .map(|note| (note, value))
                    .map_err(de::Error::custom)
            })
            .collect()
    }

    /// The number of the octave the note is in, in the given octave convention.
    pub fn octave(self, base: OctaveBase) -> i8 {
        (self.0 / SEMITONES).cast_signed() - base.offset()
    }

    /// The note's name, such as `F#2`, in the given octave convention.
    pub fn name(self, base: OctaveBase) -> String {
        format!(
            "{}{}",
            NAMES[usize::from(self.0 % SEMITONES)],
            self.octave(base)
        )
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
            de::Error::invalid_value(
                de::Unexpected::Unsigned(n),
                &format!("a MIDI note in 0..={}", Self::MAX).as_str(),
            )
        })
    }
}

#[cfg(test)]
pub(crate) fn n(x: u8) -> Note {
    Note::new(x).expect("test note in range")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_notes_in_the_c1_octave_convention() {
        assert_eq!(n(0).name(OctaveBase::C1), "C-1");
        assert_eq!(n(36).name(OctaveBase::C1), "C2");
        assert_eq!(n(42).name(OctaveBase::C1), "F#2");
        assert_eq!(n(60).name(OctaveBase::C1), "C4");
        assert_eq!(n(127).name(OctaveBase::C1), "G9");
    }

    #[test]
    fn names_notes_in_the_c2_octave_convention() {
        assert_eq!(n(0).name(OctaveBase::C2), "C-2");
        assert_eq!(n(36).name(OctaveBase::C2), "C1");
        assert_eq!(n(42).name(OctaveBase::C2), "F#1");
        assert_eq!(n(60).name(OctaveBase::C2), "C3");
        assert_eq!(n(127).name(OctaveBase::C2), "G8");
    }

    #[test]
    fn middle_c_is_in_octave_4_when_c1_names_it() {
        assert_eq!(n(60).octave(OctaveBase::C1), 4);
    }

    #[test]
    fn middle_c_is_in_octave_3_when_c2_names_it() {
        assert_eq!(n(60).octave(OctaveBase::C2), 3);
    }

    #[test]
    fn the_lowest_octave_is_negative() {
        assert_eq!(n(11).octave(OctaveBase::C2), -2);
    }

    #[test]
    fn an_octave_base_serializes_in_lowercase() {
        assert_eq!(serde_json::to_string(&OctaveBase::C2).unwrap(), r#""c2""#);
    }

    #[test]
    fn accepts_0_to_127() {
        assert_eq!(Note::new(0).map(Note::get), Some(0));
        assert_eq!(Note::new(127).map(Note::get), Some(127));
    }

    #[test]
    fn rejects_128() {
        assert_eq!(Note::new(128), None);
    }

    #[test]
    fn all_is_every_note_ascending() {
        assert_eq!(
            Note::ALL.map(Note::get).to_vec(),
            (0..=127).collect::<Vec<_>>()
        );
    }

    #[test]
    fn a_note_serializes_as_a_plain_number() {
        let n = Note::new(36).unwrap();
        assert_eq!(serde_json::to_string(&n).unwrap(), "36");
    }

    #[test]
    fn a_note_deserializes_from_a_plain_number() {
        let n = Note::new(36).unwrap();
        assert_eq!(serde_json::from_str::<Note>("36").unwrap(), n);
    }

    #[test]
    fn deserialize_rejects_128_with_the_range() {
        let error = serde_json::from_str::<Note>("128").unwrap_err().to_string();
        assert!(error.contains("0..=127"));
    }

    #[test]
    fn deserialize_rejects_70000_with_the_range() {
        let error = serde_json::from_str::<Note>("70000")
            .unwrap_err()
            .to_string();
        assert!(error.contains("0..=127"));
    }

    #[test]
    fn a_note_parses_from_its_number() {
        assert_eq!("36".parse::<Note>(), Ok(n(36)));
    }

    #[test]
    fn a_number_out_of_range_does_not_parse_as_a_note() {
        assert!("128".parse::<Note>().is_err());
    }

    #[test]
    fn text_that_is_not_a_number_does_not_parse_as_a_note() {
        assert!("kick".parse::<Note>().is_err());
    }

    #[test]
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(Note::from_key(n.key()), n);
    }

    #[test]
    fn semitones_to_counts_up_and_down() {
        assert_eq!(
            (n(36).semitones_to(n(40)), n(40).semitones_to(n(36))),
            (4, -4)
        );
    }

    #[test]
    fn map_keys_serialize_as_strings() {
        let map = std::collections::HashMap::from([(Note::new(51).unwrap(), 1u32)]);
        assert_eq!(serde_json::to_string(&map).unwrap(), r#"{"51":1}"#);
    }
}
