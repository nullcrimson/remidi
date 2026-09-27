use std::str::FromStr;

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
    #[error("MIDI parse error: {0}")]
    Parse(String),
    #[error("MIDI write error: {0}")]
    Write(String),
}

pub fn parse(bytes: &[u8]) -> Result<Smf<'_>, CodecError> {
    Smf::parse(bytes).map_err(|e| CodecError::Parse(e.to_string()))
}

pub fn write(smf: &Smf) -> Result<Vec<u8>, CodecError> {
    let mut bytes = Vec::new();
    smf.write_std(&mut bytes)
        .map_err(|e| CodecError::Write(e.to_string()))?;
    Ok(bytes)
}

const DRUM_CHANNEL: u4 = u4::new(9);
const CHANNELS: u8 = 16;

/// Which MIDI channels a conversion rewrites.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ChannelScope {
    /// Every channel of each track with a channel-10 note-on, leaving other tracks
    /// untouched; every track when none has one.
    #[default]
    Auto,
    Only(u4),
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
                .filter(|n| (1..=CHANNELS).contains(n))
                .map(|n| Self::Only(u4::new(n - 1)))
                .ok_or_else(|| ChannelScopeError(s.to_string())),
        }
    }
}

impl ChannelScope {
    /// One filter per track of `smf`, in track order.
    pub fn resolve(self, smf: &Smf) -> Vec<ChannelFilter> {
        let uniform = |filter| vec![filter; smf.tracks.len()];
        match self {
            Self::Only(channel) => uniform(ChannelFilter::Only(channel)),
            Self::All => uniform(ChannelFilter::All),
            Self::Auto => {
                let drum_tracks: Vec<bool> = smf
                    .tracks
                    .iter()
                    .map(|t| has_hits_on(t, DRUM_CHANNEL))
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

fn has_hits_on(track: &Track, channel: u4) -> bool {
    track.iter().any(|ev| {
        matches!(
            ev.kind,
            TrackEventKind::Midi {
                channel: c,
                message: MidiMessage::NoteOn { vel, .. },
            } if c == channel && vel.as_int() > 0
        )
    })
}

/// The channels one track's conversion rewrites, resolved from a [`ChannelScope`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChannelFilter {
    Only(u4),
    All,
    Skip,
}

impl ChannelFilter {
    pub fn accepts(self, channel: u4) -> bool {
        match self {
            Self::Only(c) => c == channel,
            Self::All => true,
            Self::Skip => false,
        }
    }
}

/// Rewrites every note event the scope accepts through `table`, removing dropped and
/// unmapped notes (their deltas fold into the next kept event) and tallying `report`.
pub fn rewrite(smf: &mut Smf, table: &NoteTable, scope: ChannelScope, report: &mut Report) {
    let filters = scope.resolve(smf);
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        let events = std::mem::take(track);
        let mut out = Vec::with_capacity(events.len());
        let mut pending_delta: u32 = 0;

        for mut ev in events {
            let this_delta = pending_delta.saturating_add(ev.delta.as_int());
            let keep = match &mut ev.kind {
                TrackEventKind::Midi { channel, message } if filter.accepts(*channel) => {
                    match message {
                        MidiMessage::NoteOn { key, vel } => {
                            let note = Note::from(*key);
                            let res = table.get(note);
                            if vel.as_int() > 0 {
                                report.record(note, res);
                            }
                            apply(res, key)
                        }
                        MidiMessage::NoteOff { key, .. } | MidiMessage::Aftertouch { key, .. } => {
                            apply(table.get(Note::from(*key)), key)
                        }
                        _ => true,
                    }
                }
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { vel, .. },
                    ..
                } => {
                    if vel.as_int() > 0 {
                        report.untouched += 1;
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
            *key = u7::from(*note);
            true
        }
        Resolution::Unmapped | Resolution::Resolved(CanonResolution::Dropped { .. }) => false,
    }
}
