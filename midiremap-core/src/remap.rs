use std::{collections::HashMap, fmt};

use midly::{num::u7, MidiMessage, Smf, TrackEventKind};
use serde::Serialize;

use crate::{
    canon::{fallbacks, Canon},
    map::EngineMap,
};

#[derive(Default, Serialize, Debug)]
pub struct Report {
    pub unmapped_source: HashMap<u8, u32>,
    pub fallback_used: HashMap<Canon, u32>,
    pub dropped: HashMap<Canon, u32>,
}

pub struct RemapOutput {
    pub bytes: Vec<u8>,
    pub report: Report,
}

#[derive(Debug)]
pub enum RemapError {
    Parse(String),
    Write(String),
}

impl fmt::Display for RemapError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RemapError::Parse(e) => write!(f, "MIDI parse error: {e}"),
            RemapError::Write(e) => write!(f, "MIDI write error: {e}"),
        }
    }
}
impl std::error::Error for RemapError {}

// Decide the target note for a source note. `None` = drop the note.
// Mutate the report only when `count` is true (i.e. on a real note-on) so a
// note-off does not double-count.
fn translate(
    src: &EngineMap,
    tgt: &EngineMap,
    note: u8,
    report: &mut Report,
    count: bool,
) -> Option<u8> {
    let canon = match src.to_canon.get(&note) {
        Some(c) => *c,
        None => {
            if count {
                *report.unmapped_source.entry(note).or_insert(0) += 1;
            }
            return None;
        }
    };
    if let Some(t) = tgt.from_canon.get(&canon) {
        return Some(*t);
    }
    for f in fallbacks(canon) {
        if let Some(t) = tgt.from_canon.get(f) {
            if count {
                *report.fallback_used.entry(canon).or_insert(0) += 1;
            }
            return Some(*t);
        }
    }
    if count {
        *report.dropped.entry(canon).or_insert(0) += 1;
    }
    None
}

pub fn remap(mid: &[u8], src: &EngineMap, tgt: &EngineMap) -> Result<RemapOutput, RemapError> {
    let mut smf = Smf::parse(mid).map_err(|e| RemapError::Parse(e.to_string()))?;
    let mut report = Report::default();

    for track in &mut smf.tracks {
        let mut out_events = Vec::with_capacity(track.len());
        // Fold the delta of any dropped event into the next kept event so
        // downstream timing does not shift.
        let mut pending_delta: u32 = 0;

        for mut ev in track.iter().cloned() {
            let this_delta = ev.delta.as_int() + pending_delta;
            let keep = match &mut ev.kind {
                TrackEventKind::Midi { message, .. } => match message {
                    MidiMessage::NoteOn { key, vel } => {
                        let is_real_on = vel.as_int() > 0;
                        match translate(src, tgt, key.as_int(), &mut report, is_real_on) {
                            Some(t) => {
                                *key = u7::from_int_lossy(t);
                                true
                            }
                            None => false,
                        }
                    }
                    MidiMessage::NoteOff { key, .. } => {
                        match translate(src, tgt, key.as_int(), &mut report, false) {
                            Some(t) => {
                                *key = u7::from_int_lossy(t);
                                true
                            }
                            None => false,
                        }
                    }
                    _ => true,
                },
                _ => true,
            };

            if keep {
                ev.delta = midly::num::u28::from_int_lossy(this_delta);
                out_events.push(ev);
                pending_delta = 0;
            } else {
                pending_delta = this_delta;
            }
        }
        *track = out_events;
    }

    let mut bytes = Vec::new();
    smf.write_std(&mut bytes)
        .map_err(|e| RemapError::Write(e.to_string()))?;
    Ok(RemapOutput { bytes, report })
}

#[cfg(test)]
mod tests {
    use midly::{
        num::{u15, u28, u4, u7},
        Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
    };

    use super::*;
    use crate::registry::builtin;

    fn one_note_smf(note: u8) -> Vec<u8> {
        let mut track = Track::new();
        track.push(TrackEvent {
            delta: u28::from_int_lossy(0),
            kind: TrackEventKind::Midi {
                channel: u4::from_int_lossy(9),
                message: MidiMessage::NoteOn {
                    key: u7::from_int_lossy(note),
                    vel: u7::from_int_lossy(100),
                },
            },
        });
        track.push(TrackEvent {
            delta: u28::from_int_lossy(48),
            kind: TrackEventKind::Midi {
                channel: u4::from_int_lossy(9),
                message: MidiMessage::NoteOff {
                    key: u7::from_int_lossy(note),
                    vel: u7::from_int_lossy(0),
                },
            },
        });
        let smf = Smf {
            header: Header {
                format: Format::SingleTrack,
                timing: Timing::Metrical(u15::from_int_lossy(480)),
            },
            tracks: vec![track],
        };
        let mut buf = Vec::new();
        smf.write_std(&mut buf).unwrap();
        buf
    }

    fn first_noteon_key(bytes: &[u8]) -> u8 {
        let smf = Smf::parse(bytes).unwrap();
        for ev in &smf.tracks[0] {
            if let TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, .. },
                ..
            } = ev.kind
            {
                return key.as_int();
            }
        }
        panic!("no note-on")
    }

    fn noteon_count(bytes: &[u8]) -> usize {
        let smf = Smf::parse(bytes).unwrap();
        smf.tracks[0]
            .iter()
            .filter(|ev| {
                matches!(
                    ev.kind,
                    TrackEventKind::Midi {
                        message: MidiMessage::NoteOn { .. },
                        ..
                    }
                )
            })
            .count()
    }

    #[test]
    fn ggd_kick_remaps_to_ezd_kick() {
        let r = builtin();
        let src = r.get("ggd_invasion").unwrap();
        let tgt = r.get("ezdrummer").unwrap();
        let out = remap(&one_note_smf(24), src, tgt).unwrap();
        assert_eq!(first_noteon_key(&out.bytes), 36);
    }

    #[test]
    fn unmapped_source_note_is_reported_and_dropped() {
        let r = builtin();
        let src = r.get("ggd_invasion").unwrap();
        let tgt = r.get("ezdrummer").unwrap();
        // note 99 is not in the GGD map
        let out = remap(&one_note_smf(99), src, tgt).unwrap();
        assert_eq!(out.report.unmapped_source.get(&99), Some(&1));
        assert_eq!(noteon_count(&out.bytes), 0);
    }

    #[test]
    fn hat_open3_falls_back_to_ezd_open() {
        let r = builtin();
        let src = r.get("ggd_invasion").unwrap();
        let tgt = r.get("ezdrummer").unwrap();
        // GGD note 47 = HatOpen3; EZD has only HatOpen1 (note 46) -> fallback
        let out = remap(&one_note_smf(47), src, tgt).unwrap();
        assert_eq!(first_noteon_key(&out.bytes), 46);
        assert_eq!(out.report.fallback_used.get(&Canon::HatOpen3), Some(&1));
    }
}
