use std::{fmt, str::FromStr};

use midly::{num::u4, Smf, Track, TrackEventKind};

use crate::{idx::Idx, midi::is_hit};

type ChannelIdx = Idx<16>;

/// A MIDI channel, numbered `1..=16` as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Channel(ChannelIdx);

impl Channel {
    /// Channel 10, where General MIDI puts drums.
    pub const DRUMS: Self = Self(ChannelIdx::new(10).expect("10 is a channel"));

    pub fn new(n: u8) -> Option<Self> {
        ChannelIdx::new(n).map(Self)
    }

    pub const fn get(self) -> u8 {
        self.0.get()
    }

    pub(crate) fn of(wire: u4) -> Self {
        Self(ChannelIdx::new(wire.as_int() + 1).expect("a 4-bit channel is 1..=16"))
    }
}

impl fmt::Display for Channel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// Which MIDI channels a conversion rewrites.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ChannelScope {
    /// Every channel of each track with a channel-10 note-on, leaving other tracks
    /// untouched; every track when none has one.
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
            "auto" => Ok(Self::Auto),
            "all" => Ok(Self::All),
            _ => s
                .parse::<u8>()
                .ok()
                .and_then(Channel::new)
                .map(Self::Only)
                .ok_or_else(|| ChannelScopeError(s.to_string())),
        }
    }
}

impl ChannelScope {
    /// One filter per track of `smf`, in track order.
    pub(crate) fn resolve(self, smf: &Smf) -> Vec<ChannelFilter> {
        let uniform = |filter| vec![filter; smf.tracks.len()];
        match self {
            Self::Only(channel) => uniform(ChannelFilter::Only(channel)),
            Self::All => uniform(ChannelFilter::All),
            Self::Auto => {
                let drum_tracks: Vec<bool> = smf
                    .tracks
                    .iter()
                    .map(|t| has_hits_on(t, Channel::DRUMS))
                    .collect();
                let any_drums = drum_tracks.contains(&true);
                drum_tracks
                    .into_iter()
                    .map(|drums| {
                        if drums || !any_drums {
                            ChannelFilter::All
                        } else {
                            ChannelFilter::Skip
                        }
                    })
                    .collect()
            }
        }
    }
}

fn has_hits_on(track: &Track, channel: Channel) -> bool {
    track.iter().any(|ev| {
        matches!(
            ev.kind,
            TrackEventKind::Midi { channel: c, message } if Channel::of(c) == channel && is_hit(&message)
        )
    })
}

/// The channels one track's conversion rewrites, resolved from a [`ChannelScope`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ChannelFilter {
    Only(Channel),
    All,
    Skip,
}

impl ChannelFilter {
    pub(crate) fn accepts(self, channel: Channel) -> bool {
        match self {
            Self::Only(c) => c == channel,
            Self::All => true,
            Self::Skip => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_channel_is_one_to_sixteen() {
        assert_eq!(Channel::new(0), None);
        assert_eq!(Channel::new(17), None);
        assert_eq!(Channel::new(1).map(Channel::get), Some(1));
        assert_eq!(Channel::new(16).map(Channel::get), Some(16));
    }

    #[test]
    fn a_channel_counts_from_one_on_the_wire() {
        assert_eq!(Channel::of(u4::new(0)).get(), 1);
        assert_eq!(Channel::of(u4::new(9)), Channel::DRUMS);
        assert_eq!(Channel::of(u4::new(15)).get(), 16);
    }
}
