use std::{
    collections::{BTreeMap, BTreeSet},
    fmt,
    num::NonZeroUsize,
    str::FromStr,
};

use midly::{num::u4, MetaMessage, MidiMessage, Smf, TrackEventKind};
use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use crate::{
    idx::Idx,
    midi::{CodecError, TrackNo},
    note::Note,
};

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

/// Why converting a file, or reading the hits converting it would rewrite, failed.
#[derive(thiserror::Error, Debug)]
pub enum ConvertError {
    #[error(transparent)]
    Codec(#[from] CodecError),
    #[error("the file has no notes on channel {} of track {}", .0.channel, .0.track)]
    NoSuchPart(Part),
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

/// One filter per track of the file it was made for, in track order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct TrackFilters(Vec<ChannelFilter>);

impl TrackFilters {
    fn uniform(smf: &Smf, filter: ChannelFilter) -> Self {
        Self(vec![filter; smf.tracks.len()])
    }

    /// Accepting in each track of `smf` the channels `parts` names in it, every one of which
    /// has hits in `smf`.
    fn of<'p>(smf: &Smf, parts: impl IntoIterator<Item = &'p Part>) -> Self {
        let mut filters = vec![ChannelFilter::NONE; smf.tracks.len()];
        for part in parts {
            let filter = &mut filters[part.track.index()];
            *filter = filter.with(part.channel);
        }
        Self(filters)
    }

    /// Whether it accepts `part`, a part with hits in its file.
    fn accepts(&self, part: Part) -> bool {
        self.0[part.track.index()].accepts(part.channel)
    }
}

impl IntoIterator for TrackFilters {
    type Item = ChannelFilter;
    type IntoIter = std::vec::IntoIter<ChannelFilter>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

/// What a selection comes to for one file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Choice {
    /// Rewrites what `filters` accept, which are the parts with hits in `picked`; leaves
    /// `offers` as they are: parts beside channel-10 hits in their track that nothing says
    /// are drums.
    Convert {
        filters: TrackFilters,
        picked: PartSet,
        offers: PartSet,
    },
    /// Rewrites nothing: these parts have hits, none on channel 10, and only the user can
    /// tell which are the drums.
    Ask(Parts),
}

/// What `selection` rewrites in `smf`, or the picked part `smf` has no hit in. `Auto` takes
/// every channel-10 part when the file has one, offering the other parts of their tracks;
/// else its one part with hits; else it asks.
pub(crate) fn choose(smf: &Smf, selection: &Selection) -> Result<Choice, Part> {
    let present: PartSet = part_hits(smf).into_keys().collect();
    let (filters, offers) = match selection {
        Selection::Parts(parts) => match parts.iter().find(|p| !present.contains(p)) {
            Some(&missing) => return Err(missing),
            None => (TrackFilters::of(smf, parts.iter()), PartSet::new()),
        },
        Selection::Scope(ChannelScope::All) => (
            TrackFilters::uniform(smf, ChannelFilter::ALL),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Only(channel)) => (
            TrackFilters::uniform(smf, ChannelFilter::NONE.with(*channel)),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Auto) => {
            let (drums, others): (PartSet, PartSet) =
                present.iter().partition(|p| p.channel == Channel::DRUMS);
            if drums.is_empty() && others.len() > 1 {
                return Ok(Choice::Ask(Parts(others)));
            }
            let drum_tracks: BTreeSet<TrackNo> = drums.iter().map(|p| p.track).collect();
            let (offers, alone): (PartSet, PartSet) = others
                .into_iter()
                .partition(|p| drum_tracks.contains(&p.track));
            let picked = if drums.is_empty() { alone } else { drums };
            (TrackFilters::of(smf, &picked), offers)
        }
    };
    let picked = present
        .into_iter()
        .filter(|&p| filters.accepts(p))
        .collect();
    Ok(Choice::Convert {
        filters,
        picked,
        offers,
    })
}

/// The note of every hit in `smf` that a conversion with `selection` rewrites, track by
/// track; none when it would ask.
pub(crate) fn hit_notes(smf: &Smf, selection: &Selection) -> Result<Vec<Note>, Part> {
    let Choice::Convert { filters, .. } = choose(smf, selection)? else {
        return Ok(Vec::new());
    };
    Ok(smf
        .tracks
        .iter()
        .zip(filters)
        .flat_map(|(track, filter)| {
            track.iter().filter_map(move |ev| {
                hit(&ev.kind)
                    .filter(|&(channel, _)| filter.accepts(channel))
                    .map(|(_, note)| note)
            })
        })
        .collect())
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
