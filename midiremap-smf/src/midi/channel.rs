use std::fmt;

use midiremap_idx::Idx;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

pub(crate) type ChannelIdx = Idx<16>;

/// A MIDI channel, numbered `1..=16` as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct Channel(ChannelIdx);

impl Serialize for Channel {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_u8(self.0.get())
    }
}

impl<'de> Deserialize<'de> for Channel {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let n = u8::deserialize(d)?;
        Self::new(n).ok_or_else(|| de::Error::custom(format!("channel must be 1-16, got {n}")))
    }
}

impl Channel {
    /// Channel 10, where General MIDI puts drums.
    pub const DRUMS: Self = Self(ChannelIdx::new(10).expect("10 is a channel"));

    pub fn new(n: u8) -> Option<Self> {
        ChannelIdx::new(n).map(Self)
    }

    /// The channel at `idx`.
    pub(crate) const fn from_idx(idx: ChannelIdx) -> Self {
        Self(idx)
    }

    /// The channel's number counted from zero.
    pub(crate) fn offset(self) -> u8 {
        self.0.offset()
    }
}

impl fmt::Display for Channel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// The channels one track's conversion rewrites: a set of the sixteen, one bit each.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ChannelFilter(u16);

impl ChannelFilter {
    pub const ALL: Self = Self(u16::MAX);
    pub const NONE: Self = Self(0);

    pub fn with(self, channel: Channel) -> Self {
        Self(self.0 | Self::bit(channel))
    }

    pub fn accepts(self, channel: Channel) -> bool {
        self.0 & Self::bit(channel) != 0
    }

    fn bit(channel: Channel) -> u16 {
        1 << channel.0.offset()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_channel_outside_one_to_sixteen_is_rejected() {
        assert_eq!(Channel::new(0), None);
        assert_eq!(Channel::new(17), None);
    }

    #[test]
    fn a_channel_from_one_to_sixteen_is_accepted() {
        assert_eq!(Channel::new(1).map(|c| c.to_string()), Some("1".into()));
        assert_eq!(Channel::new(16).map(|c| c.to_string()), Some("16".into()));
    }
}
