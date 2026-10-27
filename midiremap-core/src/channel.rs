use std::{fmt, str::FromStr};

use midly::{num::u4, MidiMessage, Smf, Track, TrackEventKind};
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use crate::{idx::Idx, note::Note};

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
            .chain(ChannelIdx::all().map(|channel| Self::Only(Channel(channel))))
    }

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

    /// The note of every hit in `smf` that a conversion with this scope rewrites, track by
    /// track.
    pub(crate) fn hit_notes<'a>(self, smf: &'a Smf<'a>) -> impl Iterator<Item = Note> + 'a {
        smf.tracks
            .iter()
            .zip(self.resolve(smf))
            .flat_map(|(track, filter)| {
                track.iter().filter_map(move |ev| {
                    hit(&ev.kind)
                        .filter(|&(channel, _)| filter.accepts(channel))
                        .map(|(_, note)| note)
                })
            })
    }
}

/// The channel and note of `kind` when it sounds a note: a note-on with a velocity.
pub(crate) fn hit(kind: &TrackEventKind) -> Option<(Channel, Note)> {
    match *kind {
        TrackEventKind::Midi {
            channel,
            message: MidiMessage::NoteOn { key, vel },
        } if vel.as_int() > 0 => Some((Channel::of(channel), Note::from_key(key))),
        _ => None,
    }
}

fn has_hits_on(track: &Track, channel: Channel) -> bool {
    track
        .iter()
        .any(|ev| hit(&ev.kind).is_some_and(|(c, _)| c == channel))
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
    fn a_channel_outside_one_to_sixteen_is_rejected() {
        assert_eq!(Channel::new(0), None);
        assert_eq!(Channel::new(17), None);
    }

    #[test]
    fn a_channel_from_one_to_sixteen_is_accepted() {
        assert_eq!(Channel::new(1).map(Channel::get), Some(1));
        assert_eq!(Channel::new(16).map(Channel::get), Some(16));
    }

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

    #[test]
    fn a_channel_counts_from_one_on_the_wire() {
        assert_eq!(Channel::of(u4::new(0)).get(), 1);
        assert_eq!(Channel::of(u4::new(9)), Channel::DRUMS);
        assert_eq!(Channel::of(u4::new(15)).get(), 16);
    }

    #[test]
    fn every_channel_reads_back_from_the_wire() {
        for channel in ChannelIdx::all().map(Channel) {
            assert_eq!(Channel::of(channel.wire()), channel);
        }
    }
}
