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
