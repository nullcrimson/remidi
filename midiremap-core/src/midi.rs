use std::{error::Error, fmt, str::FromStr};

use midly::{
    num::{u28, u4, u7},
    MidiMessage, Smf, Track, TrackEventKind,
};

use crate::{
    note::Note,
    table::NoteTable,
    translate::{CanonResolution, Report, Resolution},
};

#[derive(thiserror::Error, Debug)]
pub enum CodecError {
    #[error("MIDI parse error")]
    Parse(#[source] Box<dyn Error + Send + Sync>),
    #[error("MIDI write error")]
    Write(#[source] std::io::Error),
}

pub(crate) fn parse(bytes: &[u8]) -> Result<Smf<'_>, CodecError> {
    Smf::parse(bytes).map_err(|e| CodecError::Parse(Box::new(e)))
}

pub(crate) fn write(smf: &Smf) -> Result<Vec<u8>, CodecError> {
    let mut bytes = Vec::new();
    smf.write_std(&mut bytes).map_err(CodecError::Write)?;
    Ok(bytes)
}

/// A MIDI channel, numbered `1..=16` as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Channel(u8);

impl Channel {
    /// Channel 10, where General MIDI puts drums.
    pub const DRUMS: Self = Self(10);

    pub const fn new(n: u8) -> Option<Self> {
        if n >= 1 && n <= 16 {
            Some(Self(n))
        } else {
            None
        }
    }

    pub const fn get(self) -> u8 {
        self.0
    }

    fn of(wire: u4) -> Self {
        Self(wire.as_int() + 1)
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
#[error("channel must be auto, all or 1-16, got {0:?}")]
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
            TrackEventKind::Midi {
                channel: c,
                message: MidiMessage::NoteOn { vel, .. },
            } if Channel::of(c) == channel && vel.as_int() > 0
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
    fn accepts(self, channel: Channel) -> bool {
        match self {
            Self::Only(c) => c == channel,
            Self::All => true,
            Self::Skip => false,
        }
    }
}

/// Rewrites every note event the scope accepts through `table`, removing dropped and
/// unmapped notes (their deltas fold into the next kept event) and tallying `report`.
pub(crate) fn rewrite(smf: &mut Smf, table: &NoteTable, scope: ChannelScope, report: &mut Report) {
    let filters = scope.resolve(smf);
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        let events = std::mem::take(track);
        let mut out = Vec::with_capacity(events.len());
        let mut pending_delta: u32 = 0;

        for mut ev in events {
            let this_delta = pending_delta.saturating_add(ev.delta.as_int());
            let keep = match &mut ev.kind {
                TrackEventKind::Midi { channel, message }
                    if filter.accepts(Channel::of(*channel)) =>
                {
                    match message {
                        MidiMessage::NoteOn { key, vel } => {
                            let note = Note::from_key(*key);
                            let res = table.get(note);
                            if vel.as_int() > 0 {
                                report.record(note, res);
                            }
                            apply(res, key)
                        }
                        MidiMessage::NoteOff { key, .. } | MidiMessage::Aftertouch { key, .. } => {
                            apply(table.get(Note::from_key(*key)), key)
                        }
                        _ => true,
                    }
                }
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { vel, .. },
                    ..
                } => {
                    if vel.as_int() > 0 {
                        report.record_untouched();
                    }
                    true
                }
                _ => true,
            };

            if keep {
                ev.delta = u28::try_from(this_delta).unwrap_or(u28::max_value());
                out.push(ev);
                pending_delta = 0;
            } else {
                pending_delta = this_delta;
            }
        }
        *track = out;
    }
}

fn apply(res: &Resolution, key: &mut u7) -> bool {
    match res {
        Resolution::Resolved(CanonResolution::Direct { note, .. })
        | Resolution::Resolved(CanonResolution::Fallback { note, .. }) => {
            *key = note.key();
            true
        }
        Resolution::Unmapped | Resolution::Resolved(CanonResolution::Dropped { .. }) => false,
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
        assert_eq!(Channel::DRUMS.get(), 10);
        assert_eq!(Channel::DRUMS.to_string(), "10");
    }

    #[test]
    fn a_channel_counts_from_one_on_the_wire() {
        assert_eq!(Channel::of(u4::new(0)).get(), 1);
        assert_eq!(Channel::of(u4::new(9)), Channel::DRUMS);
        assert_eq!(Channel::of(u4::new(15)).get(), 16);
    }

    #[test]
    fn a_scope_names_a_channel_by_its_number() {
        assert_eq!(
            "10".parse::<ChannelScope>(),
            Ok(ChannelScope::Only(Channel::DRUMS))
        );
        assert!("0".parse::<ChannelScope>().is_err());
    }

    #[test]
    fn codec_errors_keep_their_cause() {
        let err = parse(b"garbage").unwrap_err();
        assert_eq!(err.to_string(), "MIDI parse error");
        assert!(err.source().is_some_and(|e| !e.to_string().is_empty()));
    }
}
