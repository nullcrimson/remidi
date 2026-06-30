use midly::{num::u7, MidiMessage, Smf, TrackEventKind};

use crate::translate::{ReportSink, Resolution, Translator};

#[derive(thiserror::Error, Debug)]
pub enum CodecError {
    #[error("MIDI parse error: {0}")]
    Parse(String),
    #[error("MIDI write error: {0}")]
    Write(String),
}

/// Reads and writes a MIDI container. The only trait that knows about `midly`.
///
/// Used as a generic bound (`C: MidiCodec`), never as `&dyn MidiCodec`: `parse`
/// is lifetime-generic (the parsed `Smf<'a>` borrows the input), which is not
/// object-safe. All other traits in the crate are object-safe.
pub trait MidiCodec {
    fn parse<'a>(&self, bytes: &'a [u8]) -> Result<Smf<'a>, CodecError>;
    fn write(&self, smf: &Smf) -> Result<Vec<u8>, CodecError>;
}

/// Standard Midi File codec backed by `midly`.
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

/// Applies a [`Translator`] across an SMF event stream.
pub struct EventRewriter<'a> {
    translator: &'a Translator<'a>,
}

impl<'a> EventRewriter<'a> {
    pub fn new(translator: &'a Translator<'a>) -> Self {
        Self { translator }
    }

    /// Rewrites note keys, drops unmapped/dropped notes, folds a dropped event's
    /// delta into the next kept event so timing does not shift, and passes every
    /// non-note event (CC, meta, sysex) through untouched. Each real note-on is
    /// reported once.
    ///
    /// No active `(channel, note)` tracking is needed: translation is a pure
    /// function of the note number, so a note-on and its note-off always resolve
    /// identically and stay paired (and a dropped on guarantees a dropped off).
    /// The only loss is many-to-one collisions (e.g. L/R kick → one note),
    /// accepted per spec.
    pub fn rewrite(&self, smf: &mut Smf, sink: &mut dyn ReportSink) {
        for track in &mut smf.tracks {
            let mut out = Vec::with_capacity(track.len());
            let mut pending_delta: u32 = 0;

            for mut ev in track.iter().cloned() {
                let this_delta = ev.delta.as_int() + pending_delta;
                let keep = match &mut ev.kind {
                    TrackEventKind::Midi { message, .. } => match message {
                        MidiMessage::NoteOn { key, vel } => {
                            let res = self.translator.translate(key.as_int());
                            if vel.as_int() > 0 {
                                sink.record(key.as_int(), &res);
                            }
                            apply(&res, key)
                        }
                        MidiMessage::NoteOff { key, .. } => {
                            let res = self.translator.translate(key.as_int());
                            apply(&res, key)
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

/// Maps a [`Resolution`] onto the note key, returning whether to keep the event.
fn apply(res: &Resolution, key: &mut u7) -> bool {
    match res {
        Resolution::Direct { note } | Resolution::Fallback { note, .. } => {
            *key = u7::from_int_lossy(*note);
            true
        }
        Resolution::Unmapped | Resolution::Dropped { .. } => false,
    }
}
