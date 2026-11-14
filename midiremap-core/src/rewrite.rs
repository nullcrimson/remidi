use midly::{
    num::{u28, u7},
    MidiMessage, Smf, Track, TrackEvent, TrackEventKind,
};

use crate::{
    channel::{hit, Channel, ChannelFilter, ChannelScope},
    midi::CodecError,
    note::Note,
    report::Report,
    translate::Mapping,
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

/// What a conversion does with one event: whether it stays in the file, and what it adds
/// to the report.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Fate {
    /// Stays, adding nothing: no hit, such as a controller or the release of a played note.
    Kept,
    /// Goes, adding nothing: the release of a note nothing plays.
    Removed,
    /// A hit on a channel the scope leaves as it is: stays as it is.
    Untouched,
    /// A hit on its source note that stays, on the note that plays it.
    Played(Note),
    /// A hit on its source note that goes, since nothing plays it.
    Dropped(Note),
}

impl Fate {
    fn stays(self) -> bool {
        match self {
            Fate::Kept | Fate::Untouched | Fate::Played(_) => true,
            Fate::Removed | Fate::Dropped(_) => false,
        }
    }
}

/// One event of a conversion: when `filter` accepts its channel, its key moves to where
/// `mapping` plays it.
fn step(mapping: &Mapping, filter: ChannelFilter, kind: &mut TrackEventKind) -> Fate {
    let hit = hit(kind);
    let TrackEventKind::Midi { channel, message } = kind else {
        return Fate::Kept;
    };
    if !filter.accepts(Channel::of(*channel)) {
        return if hit.is_some() {
            Fate::Untouched
        } else {
            Fate::Kept
        };
    }
    let stays = match message {
        MidiMessage::NoteOn { key, .. }
        | MidiMessage::NoteOff { key, .. }
        | MidiMessage::Aftertouch { key, .. } => apply(mapping, key),
        _ => true,
    };
    match (hit, stays) {
        (Some((_, note)), true) => Fate::Played(note),
        (Some((_, note)), false) => Fate::Dropped(note),
        (None, true) => Fate::Kept,
        (None, false) => Fate::Removed,
    }
}

fn apply(mapping: &Mapping, key: &mut u7) -> bool {
    match mapping.destination(Note::from_key(*key)) {
        Some(to) => {
            *key = to.note().key();
            true
        }
        None => false,
    }
}

/// The events `keep` keeps, in order, each removed event's delta folded into the next kept
/// one.
fn thin<'a>(
    events: Track<'a>,
    mut keep: impl FnMut(&mut TrackEvent<'a>) -> bool,
) -> Result<Track<'a>, CodecError> {
    let mut fold = DeltaFold::default();
    let mut out = Vec::with_capacity(events.len());
    for mut ev in events {
        if keep(&mut ev) {
            fold.keep(&mut ev)?;
            out.push(ev);
        } else {
            fold.remove(&ev)?;
        }
    }
    Ok(out)
}

/// `smf` with every note event the scope accepts rewritten through `mapping`, the notes
/// nothing plays removed, and the report of what happened to each hit.
pub(crate) fn rewrite<'a>(
    mut smf: Smf<'a>,
    mapping: &Mapping,
    scope: ChannelScope,
) -> Result<(Smf<'a>, Report), CodecError> {
    let mut report = Report::default();
    let filters = scope.resolve(&smf);
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        *track = thin(std::mem::take(track), |ev| {
            let fate = step(mapping, filter, &mut ev.kind);
            match fate {
                Fate::Played(note) | Fate::Dropped(note) => report.record(note, mapping.get(note)),
                Fate::Untouched => report.record_untouched(),
                Fate::Kept | Fate::Removed => {}
            }
            fate.stays()
        })?;
    }
    Ok((smf, report))
}

#[cfg(test)]
mod tests {
    use midly::{
        num::{u14, u4},
        MetaMessage, PitchBend,
    };

    use super::*;
    use crate::{
        catalog::Catalog,
        overrides::Overrides,
        resolution::MissingDrums,
        translate::{Mapping, Unrecognized},
    };

    fn bytes() -> impl Iterator<Item = u7> + Clone {
        (0..=127).map(u7::from_int_lossy)
    }

    fn every_channel_message() -> Vec<MidiMessage> {
        let pairs = || bytes().flat_map(|a| bytes().map(move |b| (a, b)));
        let notes = pairs().flat_map(|(key, vel)| {
            [
                MidiMessage::NoteOn { key, vel },
                MidiMessage::NoteOff { key, vel },
                MidiMessage::Aftertouch { key, vel },
            ]
        });
        let controllers =
            pairs().map(|(controller, value)| MidiMessage::Controller { controller, value });
        let programs = bytes().map(|program| MidiMessage::ProgramChange { program });
        let pressures = bytes().map(|vel| MidiMessage::ChannelAftertouch { vel });
        let bends = (0..=u14::max_value().as_int()).map(|b| MidiMessage::PitchBend {
            bend: PitchBend(u14::from_int_lossy(b)),
        });
        notes
            .chain(controllers)
            .chain(programs)
            .chain(pressures)
            .chain(bends)
            .collect()
    }

    fn key_of(message: MidiMessage) -> Option<u7> {
        match message {
            MidiMessage::NoteOn { key, .. }
            | MidiMessage::NoteOff { key, .. }
            | MidiMessage::Aftertouch { key, .. } => Some(key),
            MidiMessage::Controller { .. }
            | MidiMessage::ProgramChange { .. }
            | MidiMessage::ChannelAftertouch { .. }
            | MidiMessage::PitchBend { .. } => None,
        }
    }

    fn with_key(message: MidiMessage, to: u7) -> MidiMessage {
        match message {
            MidiMessage::NoteOn { vel, .. } => MidiMessage::NoteOn { key: to, vel },
            MidiMessage::NoteOff { vel, .. } => MidiMessage::NoteOff { key: to, vel },
            MidiMessage::Aftertouch { vel, .. } => MidiMessage::Aftertouch { key: to, vel },
            other @ (MidiMessage::Controller { .. }
            | MidiMessage::ProgramChange { .. }
            | MidiMessage::ChannelAftertouch { .. }
            | MidiMessage::PitchBend { .. }) => other,
        }
    }

    /// The event `step` must leave, and whether it stays: a note event on an accepted channel
    /// moves to its destination's key or goes when nothing plays it; every other event stays
    /// exactly as it was.
    fn expected<'a>(
        mapping: &Mapping,
        filter: ChannelFilter,
        kind: TrackEventKind<'a>,
    ) -> (TrackEventKind<'a>, bool) {
        let TrackEventKind::Midi { channel, message } = kind else {
            return (kind, true);
        };
        match key_of(message).filter(|_| filter.accepts(Channel::of(channel))) {
            None => (kind, true),
            Some(key) => match mapping.destination(Note::from_key(key)) {
                Some(to) => (
                    TrackEventKind::Midi {
                        channel,
                        message: with_key(message, to.note().key()),
                    },
                    true,
                ),
                None => (kind, false),
            },
        }
    }

    /// The struck note of a note-on with a velocity: a hit, which the report counts.
    fn struck(kind: TrackEventKind) -> Option<Note> {
        match kind {
            TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, vel },
                ..
            } if vel.as_int() > 0 => Some(Note::from_key(key)),
            TrackEventKind::Midi { .. }
            | TrackEventKind::SysEx(_)
            | TrackEventKind::Escape(_)
            | TrackEventKind::Meta(_) => None,
        }
    }

    fn expected_fate(filter: ChannelFilter, kind: TrackEventKind, stays: bool) -> Fate {
        let accepted = match kind {
            TrackEventKind::Midi { channel, .. } => filter.accepts(Channel::of(channel)),
            TrackEventKind::SysEx(_) | TrackEventKind::Escape(_) | TrackEventKind::Meta(_) => true,
        };
        match (struck(kind), accepted, stays) {
            (Some(_), false, _) => Fate::Untouched,
            (Some(note), true, true) => Fate::Played(note),
            (Some(note), true, false) => Fate::Dropped(note),
            (None, _, true) => Fate::Kept,
            (None, _, false) => Fate::Removed,
        }
    }

    #[test]
    fn a_step_moves_only_the_key_of_a_note_in_scope_and_leaves_every_other_event_as_it_was() {
        let catalog = Catalog::shared();
        let (src, tgt) = (
            catalog.get("ggd_invasion").unwrap(),
            catalog.get("general_midi").unwrap(),
        );
        let mappings = [
            Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
            Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Drop)
                .with_unrecognized(Unrecognized::Keep),
        ];
        let filters = [
            ChannelFilter::All,
            ChannelFilter::Skip,
            ChannelFilter::Only(Channel::of(u4::from_int_lossy(9))),
        ];
        let midi = every_channel_message().into_iter().flat_map(|message| {
            (0..16).map(move |c| TrackEventKind::Midi {
                channel: u4::from_int_lossy(c),
                message,
            })
        });
        let meta = [
            TrackEventKind::Meta(MetaMessage::EndOfTrack),
            TrackEventKind::Meta(MetaMessage::Tempo(midly::num::u24::from_int_lossy(500_000))),
            TrackEventKind::SysEx(&[0x7e, 0x7f, 0x09, 0x01, 0xf7]),
        ];
        let events: Vec<TrackEventKind> = midi.chain(meta).collect();
        let mut checked = 0usize;
        for mapping in &mappings {
            for &filter in &filters {
                for &kind in &events {
                    let mut stepped = kind;
                    let fate = step(mapping, filter, &mut stepped);
                    let (want, stays) = expected(mapping, filter, kind);
                    assert_eq!(fate.stays(), stays, "{kind:?} under {filter:?}");
                    if stays {
                        assert_eq!(stepped, want, "{kind:?} under {filter:?}");
                    }
                    assert_eq!(
                        fate,
                        expected_fate(filter, kind, stays),
                        "{kind:?} under {filter:?}"
                    );
                    checked += 1;
                }
            }
        }
        assert_eq!(events.len(), 16 * 82_176 + 3);
        assert_eq!(checked, 6 * events.len());
    }
}
