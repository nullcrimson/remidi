use std::fmt;

use midly::num::u4;
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use crate::idx::Idx;

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

    pub(crate) fn of(wire: u4) -> Self {
        Self(ChannelIdx::new(wire.as_int() + 1).expect("a 4-bit channel is 1..=16"))
    }

    /// The channel as a MIDI file stores it, counted from zero.
    pub(crate) fn wire(self) -> u4 {
        u4::new(self.0.offset())
    }
}

impl fmt::Display for Channel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// The channels one track's conversion rewrites: a set of the sixteen, one bit each.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ChannelFilter(u16);

impl ChannelFilter {
    pub(crate) const ALL: Self = Self(u16::MAX);
    pub(crate) const NONE: Self = Self(0);

    pub(crate) fn with(self, channel: Channel) -> Self {
        Self(self.0 | Self::bit(channel))
    }

    pub(crate) fn accepts(self, channel: Channel) -> bool {
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

    #[test]
    fn a_channel_counts_from_one_on_the_wire() {
        assert_eq!(Some(Channel::of(u4::new(0))), Channel::new(1));
        assert_eq!(Channel::of(u4::new(9)), Channel::DRUMS);
        assert_eq!(Some(Channel::of(u4::new(15))), Channel::new(16));
    }

    #[test]
    fn every_channel_reads_back_from_the_wire() {
        for channel in ChannelIdx::all().map(Channel) {
            assert_eq!(Channel::of(channel.wire()), channel);
        }
    }
}
