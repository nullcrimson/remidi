use std::error::Error;

use midly::{num::u28, MetaMessage, Smf, Track, TrackEvent, TrackEventKind};
use serde::Serialize;

use crate::{
    channel::{Part, TrackNo},
    meter::{Meter, Position},
};

const MTHD_TRACKS: usize = 2;
const MTHD_DIVISION: usize = 4;
const SMPTE_MINUS_128: u8 = 0x80;

#[derive(thiserror::Error, Debug)]
pub enum CodecError {
    #[error("MIDI parse error")]
    Parse(#[source] Box<dyn Error + Send + Sync>),
    #[error("invalid SMPTE frame rate -128")]
    SmpteRate,
    #[error("removed notes leave a gap longer than a MIDI delta time can hold")]
    DeltaOverflow,
    #[error("MIDI write error")]
    Write(#[source] std::io::Error),
    #[error("the file has no notes on channel {} of track {}", .0.channel, .0.track)]
    NoSuchPart(Part),
}

/// What a file had lost before it was read: notes that were in it once and cannot be
/// converted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Damage {
    /// `track` stops without its End-of-Track after `events_read` events, the last at `at`:
    /// the rest of it was not in the file.
    TrackCut {
        track: TrackNo,
        at: Position,
        events_read: usize,
    },
    /// The file says it has `declared` tracks, and only `read` could be read.
    TracksMissing { declared: u16, read: usize },
}

/// A file as read, and what it had lost.
#[derive(Debug)]
pub(crate) struct Parsed<'a> {
    pub(crate) smf: Smf<'a>,
    pub(crate) damage: Vec<Damage>,
}

pub(crate) fn parse(bytes: &[u8]) -> Result<Parsed<'_>, CodecError> {
    if has_smpte_rate_minus_128(bytes) {
        return Err(CodecError::SmpteRate);
    }
    let smf = Smf::parse(bytes).map_err(|e| CodecError::Parse(Box::new(e)))?;
    let damage = damage(bytes, &smf);
    Ok(Parsed { smf, damage })
}

fn damage(bytes: &[u8], smf: &Smf) -> Vec<Damage> {
    let meter = Meter::new(smf);
    let cut = smf.tracks.iter().enumerate().filter_map(|(index, track)| {
        let ended = track
            .last()
            .is_some_and(|ev| ev.kind == TrackEventKind::Meta(MetaMessage::EndOfTrack));
        let last_tick = track
            .iter()
            .fold(0u32, |tick, ev| tick.saturating_add(ev.delta.as_int()));
        (!ended).then(|| Damage::TrackCut {
            track: TrackNo::at(index),
            at: meter.position(last_tick),
            events_read: track.len(),
        })
    });
    let read = smf.tracks.len();
    let missing = declared_tracks(bytes)
        .filter(|&declared| usize::from(declared) > read)
        .map(|declared| Damage::TracksMissing { declared, read });
    cut.chain(missing).collect()
}

/// The number of tracks the file's header declares.
fn declared_tracks(bytes: &[u8]) -> Option<u16> {
    let smf = smf_body(bytes)?;
    chunks(smf, Chunking::Smf).find_map(|(id, data)| {
        let count = data.get(MTHD_TRACKS..MTHD_DIVISION)?;
        (id == b"MThd").then(|| u16::from_be_bytes([count[0], count[1]]))
    })
}

fn has_smpte_rate_minus_128(bytes: &[u8]) -> bool {
    smf_body(bytes).is_some_and(|smf| {
        chunks(smf, Chunking::Smf)
            .any(|(id, data)| id == b"MThd" && data.get(MTHD_DIVISION) == Some(&SMPTE_MINUS_128))
    })
}

fn smf_body(bytes: &[u8]) -> Option<&[u8]> {
    if !bytes.starts_with(b"RIFF") {
        return Some(bytes);
    }
    let (_, riff) = chunks(bytes, Chunking::Riff).next()?;
    let inner = riff.strip_prefix(b"RMID")?;
    chunks(inner, Chunking::Riff).find_map(|(id, data)| (id == b"data").then_some(data))
}

#[derive(Clone, Copy)]
enum Chunking {
    Smf,
    Riff,
}

fn chunks(mut raw: &[u8], chunking: Chunking) -> impl Iterator<Item = (&[u8; 4], &[u8])> {
    std::iter::from_fn(move || {
        let (id, rest) = raw.split_first_chunk::<4>()?;
        let (len, rest) = rest.split_first_chunk::<4>()?;
        let len = usize::try_from(match chunking {
            Chunking::Smf => u32::from_be_bytes(*len),
            Chunking::Riff => u32::from_le_bytes(*len),
        })
        .ok()?;
        let (data, rest) = rest.split_at_checked(len).unwrap_or((rest, &[]));
        raw = match chunking {
            Chunking::Riff if len % 2 == 1 => rest.get(1..).unwrap_or_default(),
            _ => rest,
        };
        Some((id, data))
    })
}

pub(crate) fn write(smf: &Smf) -> Result<Vec<u8>, CodecError> {
    let mut bytes = Vec::new();
    smf.write_std(&mut bytes).map_err(CodecError::Write)?;
    Ok(bytes)
}

/// A track of `events` given at their absolute ticks.
///
/// # Panics
///
/// When a tick is below the one before it, or the gap between them does not fit a delta.
pub(crate) fn track_at<'a>(
    events: impl IntoIterator<Item = (u32, TrackEventKind<'a>)>,
) -> Track<'a> {
    let mut last = 0;
    events
        .into_iter()
        .map(|(tick, kind)| {
            let delta = tick
                .checked_sub(last)
                .and_then(u28::try_from)
                .expect("the ticks never decrease and their gaps fit a delta");
            last = tick;
            TrackEvent { delta, kind }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn riff(smf: &[u8]) -> Vec<u8> {
        let len = |n: usize| u32::try_from(n).unwrap().to_le_bytes();
        let mut riff = b"RIFF".to_vec();
        riff.extend(len(12 + smf.len()));
        riff.extend(b"RMIDdata");
        riff.extend(len(smf.len()));
        riff.extend(smf);
        riff
    }

    fn smf(timing: &[u8]) -> Vec<u8> {
        [
            b"MThd\0\0\0\x06\0\0\0\x01".as_slice(),
            timing,
            b"MTrk\0\0\0\x04\0\xff\x2f\0",
        ]
        .concat()
    }

    #[test]
    fn a_valid_smpte_rate_parses() {
        let good = smf(b"\xe7\x28");
        assert!(parse(&good).is_ok());
    }

    #[test]
    fn a_valid_smpte_rate_parses_inside_a_riff_wrapper() {
        let good = smf(b"\xe7\x28");
        assert!(parse(&riff(&good)).is_ok());
    }

    #[test]
    fn an_smpte_rate_of_minus_128_is_an_error() {
        let bad = smf(b"\x80\xe0");
        assert!(matches!(parse(&bad), Err(CodecError::SmpteRate)));
    }

    #[test]
    fn an_smpte_rate_of_minus_128_inside_a_riff_wrapper_is_an_error() {
        let bad = smf(b"\x80\xe0");
        assert!(matches!(parse(&riff(&bad)), Err(CodecError::SmpteRate)));
    }

    #[test]
    fn a_later_header_with_an_smpte_rate_of_minus_128_is_an_error() {
        let good = smf(b"\xe7\x28");
        let later = [good.as_slice(), b"MThd\0\0\0\x06\0\0\0\x01\x80\xe0"].concat();
        assert!(parse(&later).is_err());
    }

    #[test]
    fn codec_errors_keep_their_cause() {
        let err = parse(b"garbage").unwrap_err();
        assert_eq!(err.to_string(), "MIDI parse error");
        assert!(err.source().is_some_and(|e| !e.to_string().is_empty()));
    }

    const QUARTER: u8 = 0x60;
    const END_OF_TRACK: &[u8] = b"\x00\xff\x2f\x00";

    /// A file declaring `declared` tracks, timed by `timing`, holding
    /// `chunks` as its track chunks, each `(declared length, bytes)`.
    fn file(declared: u16, timing: &[u8], chunks: &[(usize, Vec<u8>)]) -> Vec<u8> {
        let mut out = b"MThd\0\0\0\x06\0\x01".to_vec();
        out.extend(declared.to_be_bytes());
        out.extend(timing);
        for (len, data) in chunks {
            out.extend(b"MTrk");
            out.extend(u32::try_from(*len).unwrap().to_be_bytes());
            out.extend(data);
        }
        out
    }

    /// `hits` drum hits a quarter apart.
    fn hits(hits: u8) -> Vec<u8> {
        (0..hits).flat_map(|_| [QUARTER, 0x99, 36, 100]).collect()
    }

    fn whole(data: Vec<u8>) -> (usize, Vec<u8>) {
        (data.len(), data)
    }

    fn damage_of(bytes: &[u8]) -> Vec<Damage> {
        parse(bytes).unwrap().damage
    }

    fn cut(track: usize, bar: u32, events_read: usize) -> Damage {
        Damage::TrackCut {
            track: TrackNo::at(track - 1),
            at: Position::Bar(crate::meter::Bar::number(bar)),
            events_read,
        }
    }

    #[test]
    fn an_intact_file_has_no_damage() {
        let data = [hits(12), END_OF_TRACK.to_vec()].concat();
        assert_eq!(damage_of(&file(1, b"\0\x60", &[whole(data)])), []);
    }

    #[test]
    fn a_bad_event_cuts_its_track_after_the_events_before_it() {
        let data = [
            hits(10),
            b"\x60\xf4\x00".to_vec(),
            hits(5),
            END_OF_TRACK.to_vec(),
        ]
        .concat();
        assert_eq!(
            damage_of(&file(1, b"\0\x60", &[whole(data)])),
            [cut(1, 3, 10)]
        );
    }

    #[test]
    fn a_download_cut_between_events_cuts_the_track() {
        let full = [hits(12), END_OF_TRACK.to_vec()].concat();
        let data = hits(9);
        let bytes = file(1, b"\0\x60", &[(full.len(), data)]);
        assert_eq!(damage_of(&bytes), [cut(1, 3, 9)]);
    }

    #[test]
    fn a_download_cut_inside_an_event_cuts_the_track() {
        let full = [hits(12), END_OF_TRACK.to_vec()].concat();
        let data = full[..4 * 9 + 2].to_vec();
        let bytes = file(1, b"\0\x60", &[(full.len(), data)]);
        assert_eq!(damage_of(&bytes), [cut(1, 3, 9)]);
    }

    #[test]
    fn a_track_the_file_declares_but_lacks_is_missing() {
        let data = [hits(4), END_OF_TRACK.to_vec()].concat();
        assert_eq!(
            damage_of(&file(2, b"\0\x60", &[whole(data)])),
            [Damage::TracksMissing {
                declared: 2,
                read: 1
            }]
        );
    }

    #[test]
    fn a_cut_track_of_a_file_timed_in_frames_is_placed_by_its_tick() {
        let bytes = file(1, b"\xe7\x28", &[whole(hits(3))]);
        assert_eq!(
            damage_of(&bytes),
            [Damage::TrackCut {
                track: TrackNo::at(0),
                at: Position::Tick(3 * u32::from(QUARTER)),
                events_read: 3,
            }]
        );
    }

    #[test]
    fn junk_after_the_end_of_a_track_loses_nothing() {
        let data = [hits(4), END_OF_TRACK.to_vec(), b"\xf4\xf4".to_vec()].concat();
        assert_eq!(damage_of(&file(1, b"\0\x60", &[whole(data)])), []);
    }
}
