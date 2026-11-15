use serde::{Deserialize, Serialize};

use crate::canon::Canon;

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
    pub(super) fn allows(self, canon: Canon, alt: Canon) -> bool {
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

/// What happens to a note the source layout does not recognize.
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
    parse_err_ty = UnrecognizedParseError,
    parse_err_fn = UnrecognizedParseError::of
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum Unrecognized {
    /// Leave it out of the output.
    #[default]
    Remove,
    /// Write it out as it is: the same note on the same channel, at the same time and velocity.
    Keep,
}

impl Unrecognized {
    pub(crate) fn keeps(self) -> bool {
        match self {
            Self::Remove => false,
            Self::Keep => true,
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("unrecognized notes must be 'remove' or 'keep', not '{0}'")]
pub struct UnrecognizedParseError(String);

impl UnrecognizedParseError {
    fn of(s: &str) -> Self {
        Self(s.to_owned())
    }
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

    #[test]
    fn unrecognized_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&Unrecognized::Keep).unwrap(),
            r#""keep""#
        );
    }

    #[test]
    fn unrecognized_deserializes_from_its_lowercase_name() {
        assert_eq!(
            serde_json::from_str::<Unrecognized>(r#""remove""#).unwrap(),
            Unrecognized::Remove
        );
    }

    #[test]
    fn remove_round_trips_through_its_name() {
        let u = Unrecognized::Remove;
        assert_eq!(u.to_string().parse::<Unrecognized>().unwrap(), u);
    }

    #[test]
    fn keep_round_trips_through_its_name() {
        let u = Unrecognized::Keep;
        assert_eq!(u.to_string().parse::<Unrecognized>().unwrap(), u);
    }

    #[test]
    fn an_unknown_unrecognized_value_names_the_choices() {
        let err = "maybe".parse::<Unrecognized>().unwrap_err().to_string();
        assert!(
            err.contains("maybe") && err.contains("remove") && err.contains("keep"),
            "{err}"
        );
    }
}
