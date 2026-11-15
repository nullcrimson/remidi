use std::{collections::BTreeSet, fmt, num::NonZeroUsize, str::FromStr};

use serde::{Deserialize, Serialize};

use crate::midi::{Channel, TrackNo};

/// One track's notes on one channel: what a user picks as the drums of a file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub struct Part {
    pub track: TrackNo,
    pub channel: Channel,
}

/// The parts of a file a conversion rewrites.
pub type PartSet = BTreeSet<Part>;

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("a part is track:channel, both counted from 1, got {0:?}")]
pub struct PartError(String);

impl FromStr for Part {
    type Err = PartError;

    /// Parses `track:channel`, such as `2:10`.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bad = || PartError(s.to_string());
        let (track, channel) = s.split_once(':').ok_or_else(bad)?;
        let track = track.parse::<NonZeroUsize>().map_err(|_| bad())?;
        let channel = channel
            .parse::<u8>()
            .ok()
            .and_then(Channel::new)
            .ok_or_else(bad)?;
        Ok(Self {
            track: TrackNo::new(track),
            channel,
        })
    }
}

impl fmt::Display for Part {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.track, self.channel)
    }
}

/// A set of parts that holds at least one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "Vec<Part>", into = "Vec<Part>")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "Part[]"))]
pub struct Parts(PartSet);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("pick at least one part")]
pub struct NoParts;

impl Parts {
    /// `parts`, when it holds one or more.
    pub fn new(parts: PartSet) -> Option<Self> {
        (!parts.is_empty()).then_some(Self(parts))
    }

    /// `parts`, which the caller knows holds one or more.
    pub(super) fn from_set(parts: PartSet) -> Self {
        Self(parts)
    }

    pub fn iter(&self) -> impl Iterator<Item = &Part> {
        self.0.iter()
    }
}

impl TryFrom<Vec<Part>> for Parts {
    type Error = NoParts;

    fn try_from(parts: Vec<Part>) -> Result<Self, Self::Error> {
        Self::new(parts.into_iter().collect()).ok_or(NoParts)
    }
}

impl From<Parts> for Vec<Part> {
    fn from(parts: Parts) -> Self {
        parts.0.into_iter().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_part_reads_as_track_colon_channel() {
        let part: Part = "2:10".parse().unwrap();
        assert_eq!((part.track.index(), part.channel), (1, Channel::DRUMS));
    }

    #[test]
    fn a_part_prints_as_track_colon_channel() {
        let part = Part {
            track: TrackNo::at(1),
            channel: Channel::DRUMS,
        };
        assert_eq!(part.to_string(), "2:10");
    }

    #[test]
    fn a_part_track_counts_from_one() {
        assert!("0:1".parse::<Part>().is_err());
    }

    #[test]
    fn a_part_channel_counts_from_one() {
        assert!("1:0".parse::<Part>().is_err());
    }

    #[test]
    fn a_part_channel_ends_at_sixteen() {
        assert!("1:17".parse::<Part>().is_err());
    }

    #[test]
    fn a_part_without_a_channel_is_rejected() {
        assert!("1".parse::<Part>().is_err());
        assert!("1:".parse::<Part>().is_err());
    }

    #[test]
    fn a_part_without_a_track_is_rejected() {
        assert!(":1".parse::<Part>().is_err());
    }

    #[test]
    fn a_part_of_words_is_rejected() {
        assert!("a:b".parse::<Part>().is_err());
    }

    #[test]
    fn no_parts_are_not_a_selection() {
        assert_eq!(Parts::new(PartSet::new()), None);
        assert!(serde_json::from_str::<Parts>("[]").is_err());
    }
}
