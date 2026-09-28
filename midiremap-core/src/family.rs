use std::fmt;

use serde::{Serialize, Serializer};

/// A group of drums, declared in the order the app and the site list them.
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(
        type = "\"Kick\" | \"Snare\" | \"Toms\" | \"Hi-Hat\" | \"Cymbals\" | \"Percussion\" | \"Aux\""
    )
)]
pub enum Family {
    Kick,
    Snare,
    Toms,
    HiHat,
    Cymbals,
    Percussion,
    Aux,
}

impl Family {
    /// Every family, in display order.
    pub const ALL: [Self; 7] = [
        Self::Kick,
        Self::Snare,
        Self::Toms,
        Self::HiHat,
        Self::Cymbals,
        Self::Percussion,
        Self::Aux,
    ];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Kick => "Kick",
            Self::Snare => "Snare",
            Self::Toms => "Toms",
            Self::HiHat => "Hi-Hat",
            Self::Cymbals => "Cymbals",
            Self::Percussion => "Percussion",
            Self::Aux => "Aux",
        }
    }
}

impl fmt::Display for Family {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.label())
    }
}

impl Serialize for Family {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(self.label())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Canon;

    #[test]
    fn families_are_listed_in_display_order() {
        let labels: Vec<&str> = Family::ALL.iter().map(|f| f.label()).collect();
        assert_eq!(
            labels,
            [
                "Kick",
                "Snare",
                "Toms",
                "Hi-Hat",
                "Cymbals",
                "Percussion",
                "Aux"
            ]
        );
        let mut sorted = Family::ALL;
        sorted.sort_unstable();
        assert_eq!(sorted, Family::ALL);
    }

    #[test]
    fn a_family_serializes_and_prints_as_its_label() {
        assert_eq!(
            serde_json::to_string(&Family::HiHat).unwrap(),
            r#""Hi-Hat""#
        );
        assert_eq!(Family::Percussion.to_string(), "Percussion");
    }

    #[test]
    fn every_drum_belongs_to_a_listed_family() {
        for &c in Canon::all() {
            assert!(Family::ALL.contains(&c.family()), "{c:?}");
        }
    }
}
