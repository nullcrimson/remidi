use std::{fmt, str::FromStr};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use super::part::Parts;
use crate::midi::{Channel, ChannelIdx};

/// What a conversion rewrites: the channels a scope selects, or the parts a user picked.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Selection {
    Scope(ChannelScope),
    Parts(Parts),
}

impl Default for Selection {
    fn default() -> Self {
        Self::Scope(ChannelScope::default())
    }
}

impl From<ChannelScope> for Selection {
    fn from(scope: ChannelScope) -> Self {
        Self::Scope(scope)
    }
}

impl From<Parts> for Selection {
    fn from(parts: Parts) -> Self {
        Self::Parts(parts)
    }
}

const AUTO: &str = "auto";
const ALL: &str = "all";

/// Which MIDI channels a conversion rewrites: `auto`, `all`, or one channel by its number.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(
        type = r#""auto" | "all" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15" | "16""#
    )
)]
pub enum ChannelScope {
    /// Channel 10 when the file has hits there, offering the other channels of its drum
    /// tracks; the one part with hits when there is only one; else nothing, asking which
    /// parts are the drums.
    #[default]
    Auto,
    Only(Channel),
    All,
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("channel must be auto, all or 1-{max}, got {0:?}", max = ChannelIdx::MAX)]
pub struct ChannelScopeError(String);

impl FromStr for ChannelScope {
    type Err = ChannelScopeError;

    /// Parses `auto`, `all`, or a 1-based channel number `1`..=`16`.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            AUTO => Ok(Self::Auto),
            ALL => Ok(Self::All),
            _ => s
                .parse::<u8>()
                .ok()
                .and_then(Channel::new)
                .map(Self::Only)
                .ok_or_else(|| ChannelScopeError(s.to_string())),
        }
    }
}

impl fmt::Display for ChannelScope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Auto => f.write_str(AUTO),
            Self::All => f.write_str(ALL),
            Self::Only(channel) => channel.fmt(f),
        }
    }
}

impl Serialize for ChannelScope {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.collect_str(self)
    }
}

impl<'de> Deserialize<'de> for ChannelScope {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let text = String::deserialize(d)?;
        text.parse().map_err(de::Error::custom)
    }
}

impl ChannelScope {
    /// Every scope: `Auto`, `All`, then each channel in order.
    pub fn all() -> impl Iterator<Item = Self> {
        [Self::Auto, Self::All]
            .into_iter()
            .chain(ChannelIdx::all().map(|channel| Self::Only(Channel::from_idx(channel))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_eighteen_scopes_starting_with_auto_and_all() {
        let texts: Vec<String> = ChannelScope::all().map(|s| s.to_string()).collect();
        assert_eq!(texts.len(), 18);
        assert_eq!(texts[..3], ["auto", "all", "1"]);
        assert_eq!(texts[17], "16");
    }

    #[test]
    fn every_scope_parses_back_from_its_text() {
        assert!(ChannelScope::all().all(|scope| scope.to_string().parse() == Ok(scope)));
    }

    #[test]
    fn a_scope_serializes_as_its_text() {
        let drums = ChannelScope::Only(Channel::DRUMS);
        assert_eq!(serde_json::to_string(&drums).unwrap(), r#""10""#);
    }

    #[test]
    fn a_scope_deserializes_from_its_text() {
        assert_eq!(
            serde_json::from_str::<ChannelScope>(r#""10""#).unwrap(),
            ChannelScope::Only(Channel::DRUMS)
        );
    }

    #[test]
    fn a_scope_outside_the_eighteen_does_not_deserialize() {
        assert!(serde_json::from_str::<ChannelScope>(r#""17""#).is_err());
    }
}
