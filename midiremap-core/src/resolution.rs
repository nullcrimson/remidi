use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{canon::Canon, note::Note};

/// Where a drum lands on the target: on its own note, on the note of the drum that stands
/// in for it, or nowhere.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum CanonResolution {
    Direct {
        canon: Canon,
        note: Note,
    },
    Fallback {
        canon: Canon,
        stand_in: Canon,
        note: Note,
    },
    /// Nothing plays it; `other_drum` when only another drum could have, so the
    /// [`MissingDrums`] setting decided it.
    Dropped {
        canon: Canon,
        other_drum: bool,
    },
}

impl CanonResolution {
    /// Whether the target lacks the drum and its nearest stand-in is another drum, so the
    /// [`MissingDrums`] setting decides what plays it.
    pub fn moves_to_other_drum(&self) -> bool {
        match *self {
            Self::Direct { .. } => false,
            Self::Fallback {
                canon, stand_in, ..
            } => !canon.same_drum(stand_in),
            Self::Dropped { other_drum, .. } => other_drum,
        }
    }

    /// The target drum that plays it and that drum's note, when anything plays it.
    pub fn played(&self) -> Option<(Canon, Note)> {
        match *self {
            Self::Direct { canon, note } => Some((canon, note)),
            Self::Fallback { stand_in, note, .. } => Some((stand_in, note)),
            Self::Dropped { .. } => None,
        }
    }

    pub fn note(&self) -> Option<Note> {
        self.played().map(|(_, note)| note)
    }
}

/// What happens to a drum the target engine lacks.
#[derive(
    Copy,
    Clone,
    Debug,
    Default,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
)]
#[serde(rename_all = "lowercase")]
#[strum(
    serialize_all = "lowercase",
    parse_err_ty = MissingDrumsParseError,
    parse_err_fn = MissingDrumsParseError::of
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum MissingDrums {
    /// Play it on the nearest drum the target has.
    #[default]
    Nearest,
    /// Leave it out; another way of playing the same drum still stands in for it.
    Drop,
}

impl MissingDrums {
    fn allows(self, canon: Canon, alt: Canon) -> bool {
        match self {
            Self::Nearest => true,
            Self::Drop => canon.same_drum(alt),
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("missing drums must be 'nearest' or 'drop', not '{0}'")]
pub struct MissingDrumsParseError(String);

impl MissingDrumsParseError {
    fn of(s: &str) -> Self {
        Self(s.to_owned())
    }
}

pub(crate) type Encoding = HashMap<Canon, Note>;

fn substitute(canon: Canon, encode: &Encoding, missing: MissingDrums) -> Option<(Canon, Note)> {
    canon
        .fallback_chain()
        .iter()
        .copied()
        .filter(|&alt| missing.allows(canon, alt))
        .find_map(|alt| encode.get(&alt).map(|&note| (alt, note)))
}

pub(crate) fn resolve(canon: Canon, encode: &Encoding, missing: MissingDrums) -> CanonResolution {
    if let Some(&note) = encode.get(&canon) {
        return CanonResolution::Direct { canon, note };
    }
    substitute(canon, encode, missing).map_or_else(
        || CanonResolution::Dropped {
            canon,
            other_drum: substitute(canon, encode, MissingDrums::Nearest).is_some(),
        },
        |(stand_in, note)| CanonResolution::Fallback {
            canon,
            stand_in,
            note,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_drums_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&MissingDrums::Drop).unwrap(),
            r#""drop""#
        );
    }

    #[test]
    fn missing_drums_deserializes_from_its_lowercase_name() {
        assert_eq!(
            serde_json::from_str::<MissingDrums>(r#""nearest""#).unwrap(),
            MissingDrums::Nearest
        );
    }

    #[test]
    fn an_unknown_missing_drums_name_does_not_deserialize() {
        assert!(serde_json::from_str::<MissingDrums>(r#""maybe""#).is_err());
    }

    #[test]
    fn nearest_round_trips_through_its_name() {
        let m = MissingDrums::Nearest;
        assert_eq!(m.to_string().parse::<MissingDrums>().unwrap(), m);
    }

    #[test]
    fn drop_round_trips_through_its_name() {
        let m = MissingDrums::Drop;
        assert_eq!(m.to_string().parse::<MissingDrums>().unwrap(), m);
    }

    #[test]
    fn an_unknown_missing_drums_value_names_the_choices() {
        let err = "maybe".parse::<MissingDrums>().unwrap_err().to_string();
        assert!(
            err.contains("maybe") && err.contains("nearest") && err.contains("drop"),
            "{err}"
        );
    }
}
