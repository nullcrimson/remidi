use std::{
    collections::{BTreeMap, BTreeSet},
    fmt,
    num::NonZeroUsize,
    str::FromStr,
};

use midly::{num::u4, MetaMessage, MidiMessage, Smf, TrackEventKind};
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use crate::{idx::Idx, note::Note};

type ChannelIdx = Idx<16>;

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

/// A track of a file, numbered from 1 as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct TrackNo(NonZeroUsize);

impl TrackNo {
    /// The track a file stores at `index`, counted from zero.
    pub(crate) fn at(index: usize) -> Self {
        Self(NonZeroUsize::MIN.saturating_add(index))
    }

    /// Where a file stores this track, counted from zero.
    pub(crate) fn index(self) -> usize {
        self.0.get() - 1
    }
}

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
            track: TrackNo(track),
            channel,
        })
    }
}

impl fmt::Display for Part {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.track, self.channel)
    }
}

/// The note of every hit of each part of `smf`, in order.
pub(crate) fn part_hits(smf: &Smf) -> BTreeMap<Part, Vec<Note>> {
    let mut hits: BTreeMap<Part, Vec<Note>> = BTreeMap::new();
    for (index, track) in smf.tracks.iter().enumerate() {
        for (channel, note) in track.iter().filter_map(|ev| hit(&ev.kind)) {
            let part = Part {
                track: TrackNo::at(index),
                channel,
            };
            hits.entry(part).or_default().push(note);
        }
    }
    hits
}

/// The name each track of `smf` gives itself, when it gives a non-empty one.
pub(crate) fn track_names(smf: &Smf) -> Vec<Option<String>> {
    smf.tracks
        .iter()
        .map(|track| {
            track.iter().find_map(|ev| match ev.kind {
                TrackEventKind::Meta(MetaMessage::TrackName(name)) => {
                    let name = String::from_utf8_lossy(name).trim().to_owned();
                    (!name.is_empty()).then_some(name)
                }
                TrackEventKind::Midi { .. }
                | TrackEventKind::SysEx(_)
                | TrackEventKind::Escape(_)
                | TrackEventKind::Meta(_) => None,
            })
        })
        .collect()
}

/// Every part of `smf` that has a hit.
pub(crate) fn parts_with_hits(smf: &Smf) -> PartSet {
    smf.tracks
        .iter()
        .enumerate()
        .flat_map(|(index, track)| {
            track.iter().filter_map(move |ev| {
                hit(&ev.kind).map(|(channel, _)| Part {
                    track: TrackNo::at(index),
                    channel,
                })
            })
        })
        .collect()
}

/// One filter per track of `smf` that accepts exactly the channels `parts` names in it, or
/// the first part `smf` has no hit in.
pub(crate) fn part_filters(smf: &Smf, parts: &PartSet) -> Result<Vec<ChannelFilter>, Part> {
    let present = parts_with_hits(smf);
    match parts.iter().find(|p| !present.contains(p)) {
        Some(&missing) => Err(missing),
        None => Ok(filters_of(smf, parts)),
    }
}

/// One filter per track of `smf` accepting the channels of `parts`, all of which `smf` has.
fn filters_of(smf: &Smf, parts: &PartSet) -> Vec<ChannelFilter> {
    let mut filters = vec![ChannelFilter::NONE; smf.tracks.len()];
    for part in parts {
        let filter = &mut filters[part.track.index()];
        *filter = filter.with(part.channel);
    }
    filters
}

/// What `Auto` does with a file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum AutoChoice {
    /// Converts `parts`, and offers each of `offers`: a part beside channel-10 hits in their
    /// track that is left as it is, since nothing says whether it is drums.
    Picked { parts: PartSet, offers: PartSet },
    /// Converts nothing: several parts have hits, none on channel 10, and only the user can
    /// tell which are the drums.
    Ask(PartSet),
}

/// `Auto`'s choice for `smf`: every channel-10 part when it has one; else its one part with
/// hits; else ask.
pub(crate) fn auto_choice(smf: &Smf) -> AutoChoice {
    let present = parts_with_hits(smf);
    let (drums, others): (PartSet, PartSet) =
        present.iter().partition(|p| p.channel == Channel::DRUMS);
    if drums.is_empty() {
        return if others.len() <= 1 {
            AutoChoice::Picked {
                parts: others,
                offers: PartSet::new(),
            }
        } else {
            AutoChoice::Ask(others)
        };
    }
    let drum_tracks: BTreeSet<TrackNo> = drums.iter().map(|p| p.track).collect();
    let offers = others
        .into_iter()
        .filter(|p| drum_tracks.contains(&p.track))
        .collect();
    AutoChoice::Picked {
        parts: drums,
        offers,
    }
}

impl fmt::Display for TrackNo {
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
            .chain(ChannelIdx::all().map(|channel| Self::Only(Channel(channel))))
    }

    /// One filter per track of `smf`, in track order.
    pub(crate) fn resolve(self, smf: &Smf) -> Vec<ChannelFilter> {
        let uniform = |filter| vec![filter; smf.tracks.len()];
        match self {
            Self::Only(channel) => uniform(ChannelFilter::NONE.with(channel)),
            Self::All => uniform(ChannelFilter::ALL),
            Self::Auto => match auto_choice(smf) {
                AutoChoice::Picked { parts, .. } => filters_of(smf, &parts),
                AutoChoice::Ask(_) => uniform(ChannelFilter::NONE),
            },
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
    fn a_part_reads_and_prints_as_track_colon_channel() {
        let part: Part = "2:10".parse().unwrap();
        assert_eq!((part.track.index(), part.channel), (1, Channel::DRUMS));
        assert_eq!(part.to_string(), "2:10");
    }

    #[test]
    fn a_part_counts_both_from_one() {
        for bad in ["0:1", "1:0", "1:17", "1", "1:", ":1", "a:b"] {
            assert!(bad.parse::<Part>().is_err(), "{bad}");
        }
    }

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
