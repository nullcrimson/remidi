use midly::{num::u7, MidiMessage, TrackEventKind};

use super::channel::Channel;
use crate::note::Note;

/// The channel and note of `kind` when it sounds a note: a note-on with a velocity.
pub(crate) fn hit(kind: &TrackEventKind) -> Option<(Channel, Note)> {
    match *kind {
        TrackEventKind::Midi {
            channel,
            message: MidiMessage::NoteOn { key, vel },
        } if vel.as_int() > 0 => Some((Channel::of(channel), note_from_key(key))),
        _ => None,
    }
}

/// The note a MIDI file stores as `key`.
pub(crate) fn note_from_key(key: u7) -> Note {
    Note::ALL[usize::from(key.as_int())]
}

/// The key a MIDI file stores `note` as.
pub(crate) fn note_key(note: Note) -> u7 {
    u7::from_int_lossy(note.get())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(note_from_key(note_key(n)), n);
    }
}
