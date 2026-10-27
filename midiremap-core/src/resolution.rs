use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{canon::Canon, note::Note};

/// Where a drum lands on the target: on its own note, on the note of the drum that stands
/// in for it, or nowhere. Serialized tagged by `status`, without the drum itself.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize)]
#[serde(
    tag = "status",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum Outcome {
    /// The target has the drum.
    Direct {
        #[serde(skip)]
        canon: Canon,
        note: Note,
    },
    /// Another drum plays it.
    Fallback(StandIn),
    /// Nothing plays it; `other_drum` when only another drum could have, so the
    /// [`MissingDrums`] setting decided it.
    Dropped {
        #[serde(skip)]
        canon: Canon,
        other_drum: bool,
    },
}

/// The drum `stand_in` playing `canon` on `note`; `other_drum` when the stand-in is another
/// drum, not the same one played another way.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub struct StandIn {
    #[serde(skip)]
    canon: Canon,
    stand_in: Canon,
    note: Note,
    other_drum: bool,
}

impl StandIn {
    pub fn new(canon: Canon, stand_in: Canon, note: Note) -> Self {
        Self {
            canon,
            stand_in,
            note,
            other_drum: !canon.same_drum(stand_in),
        }
    }

    pub fn stand_in(&self) -> Canon {
        self.stand_in
    }

    pub fn note(&self) -> Note {
        self.note
    }
}

impl Outcome {
    /// Whether the target lacks the drum and its nearest stand-in is another drum, so the
    /// [`MissingDrums`] setting decides what plays it.
    pub fn moves_to_other_drum(&self) -> bool {
        match *self {
            Self::Direct { .. } => false,
            Self::Fallback(s) => s.other_drum,
            Self::Dropped { other_drum, .. } => other_drum,
        }
    }

    /// The drum it is about.
    pub fn canon(&self) -> Canon {
        match *self {
            Self::Direct { canon, .. } | Self::Dropped { canon, .. } => canon,
            Self::Fallback(s) => s.canon,
        }
    }

    /// The target drum that plays it and that drum's note, when anything plays it.
    pub fn played(&self) -> Option<(Canon, Note)> {
        match *self {
            Self::Direct { canon, note } => Some((canon, note)),
            Self::Fallback(s) => Some((s.stand_in, s.note)),
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

pub(crate) fn resolve(canon: Canon, encode: &Encoding, missing: MissingDrums) -> Outcome {
    if let Some(&note) = encode.get(&canon) {
        return Outcome::Direct { canon, note };
    }
    substitute(canon, encode, missing).map_or_else(
        || Outcome::Dropped {
            canon,
            other_drum: substitute(canon, encode, MissingDrums::Nearest).is_some(),
        },
        |(stand_in, note)| Outcome::Fallback(StandIn::new(canon, stand_in, note)),
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
