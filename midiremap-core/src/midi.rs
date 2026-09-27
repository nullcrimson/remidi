use midly::{num::u7, MidiMessage, Smf, TrackEventKind};

use crate::{
    table::NoteTable,
    translate::{CanonResolution, ReportSink, Resolution},
};

#[derive(thiserror::Error, Debug)]
pub enum CodecError {
    #[error("MIDI parse error: {0}")]
    Parse(String),
    #[error("MIDI write error: {0}")]
    Write(String),
}

pub trait MidiCodec {
    fn parse<'a>(&self, bytes: &'a [u8]) -> Result<Smf<'a>, CodecError>;
    fn write(&self, smf: &Smf) -> Result<Vec<u8>, CodecError>;
}

pub struct StandardMidiCodec;

impl MidiCodec for StandardMidiCodec {
    fn parse<'a>(&self, bytes: &'a [u8]) -> Result<Smf<'a>, CodecError> {
        Smf::parse(bytes).map_err(|e| CodecError::Parse(e.to_string()))
    }
    fn write(&self, smf: &Smf) -> Result<Vec<u8>, CodecError> {
        let mut bytes = Vec::new();
        smf.write_std(&mut bytes)
            .map_err(|e| CodecError::Write(e.to_string()))?;
        Ok(bytes)
    }
}

pub struct EventRewriter<'a> {
    table: &'a NoteTable,
}

impl<'a> EventRewriter<'a> {
    pub fn new(table: &'a NoteTable) -> Self {
        Self { table }
    }

    pub fn rewrite(&self, smf: &mut Smf, sink: &mut dyn ReportSink) {
        for track in &mut smf.tracks {
            let events = std::mem::take(track);
            let mut out = Vec::with_capacity(events.len());
            let mut pending_delta: u32 = 0;

            for mut ev in events {
                let this_delta = ev.delta.as_int() + pending_delta;
                let keep = match &mut ev.kind {
                    TrackEventKind::Midi { message, .. } => match message {
                        MidiMessage::NoteOn { key, vel } => {
                            let res = self.table.get(key.as_int());
                            if vel.as_int() > 0 {
                                sink.record(key.as_int(), res);
                            }
                            apply(res, key)
                        }
                        MidiMessage::NoteOff { key, .. } => {
                            apply(self.table.get(key.as_int()), key)
                        }
                        _ => true,
                    },
                    _ => true,
                };

                if keep {
                    ev.delta = midly::num::u28::from_int_lossy(this_delta);
                    out.push(ev);
                    pending_delta = 0;
                } else {
                    pending_delta = this_delta;
                }
            }
            *track = out;
        }
    }
}

fn apply(res: &Resolution, key: &mut u7) -> bool {
    match res {
        Resolution::Resolved(CanonResolution::Direct { note, .. })
        | Resolution::Resolved(CanonResolution::Fallback { note, .. }) => {
            *key = u7::from_int_lossy(*note);
            true
        }
        Resolution::Unmapped | Resolution::Resolved(CanonResolution::Dropped { .. }) => false,
    }
}
