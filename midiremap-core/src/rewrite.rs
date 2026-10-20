use midly::{
    num::{u28, u7},
    MidiMessage, Smf, TrackEvent, TrackEventKind,
};

use crate::{
    channel::{Channel, ChannelScope},
    midi::{is_hit, CodecError},
    note::Note,
    report::Report,
    table::NoteTable,
    translate::{CanonResolution, Resolution, Unrecognized},
};

#[derive(Default)]
struct DeltaFold(u28);

impl DeltaFold {
    fn carried(&self, ev: &TrackEvent) -> Result<u28, CodecError> {
        u28::try_from(self.0.as_int() + ev.delta.as_int()).ok_or(CodecError::DeltaOverflow)
    }

    fn remove(&mut self, ev: &TrackEvent) -> Result<(), CodecError> {
        self.0 = self.carried(ev)?;
        Ok(())
    }

    fn keep(&mut self, ev: &mut TrackEvent) -> Result<(), CodecError> {
        ev.delta = self.carried(ev)?;
        self.0 = u28::default();
        Ok(())
    }
}

/// Rewrites every note event the scope accepts through `table`, removing dropped notes and,
/// unless the table keeps them unchanged, unmapped ones (a removed event's delta folds into
/// the next kept event), and tallying `report`.
pub(crate) fn rewrite(
    smf: &mut Smf,
    table: &NoteTable,
    scope: ChannelScope,
    report: &mut Report,
) -> Result<(), CodecError> {
    let filters = scope.resolve(smf);
    let unrecognized = table.unrecognized();
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        let events = std::mem::take(track);
        let mut out = Vec::with_capacity(events.len());
        let mut fold = DeltaFold::default();
        for mut ev in events {
            let keep = match &mut ev.kind {
                TrackEventKind::Midi { channel, message }
                    if filter.accepts(Channel::of(*channel)) =>
                {
                    let hit = is_hit(message);
                    match message {
                        MidiMessage::NoteOn { key, .. } => {
                            let note = Note::from_key(*key);
                            let res = table.get(note);
                            if hit {
                                report.record(note, res);
                            }
                            apply(res, unrecognized, key)
                        }
                        MidiMessage::NoteOff { key, .. } | MidiMessage::Aftertouch { key, .. } => {
                            apply(table.get(Note::from_key(*key)), unrecognized, key)
                        }
                        _ => true,
                    }
                }
                TrackEventKind::Midi { message, .. } => {
                    if is_hit(message) {
                        report.record_untouched();
                    }
                    true
                }
                _ => true,
            };
            if keep {
                fold.keep(&mut ev)?;
                out.push(ev);
            } else {
                fold.remove(&ev)?;
            }
        }
        *track = out;
    }
    Ok(())
}

fn apply(res: &Resolution, unrecognized: Unrecognized, key: &mut u7) -> bool {
    match res {
        Resolution::Resolved(CanonResolution::Direct { note, .. })
        | Resolution::Resolved(CanonResolution::Fallback { note, .. }) => {
            *key = note.key();
            true
        }
        Resolution::Unmapped => unrecognized.keeps(),
        Resolution::Resolved(CanonResolution::Dropped { .. }) => false,
    }
}
