use midiremap_note::Note;
use midly::{
    num::{u4, u7},
    MidiMessage, TrackEventKind,
};

use super::channel::{Channel, ChannelIdx};

/// The channel and note of `kind` when it sounds a note: a note-on with a velocity.
pub(crate) fn hit(kind: &TrackEventKind) -> Option<(Channel, Note)> {
    match *kind {
        TrackEventKind::Midi {
            channel,
            message: MidiMessage::NoteOn { key, vel },
        } if vel.as_int() > 0 => Some((channel_from_wire(channel), note_from_key(key))),
        _ => None,
    }
}

/// The channel a MIDI file stores as `wire`, counted from zero.
pub(crate) fn channel_from_wire(wire: u4) -> Channel {
    Channel::from_idx(ChannelIdx::new(wire.as_int() + 1).expect("a 4-bit channel is 1..=16"))
}

/// The channel as a MIDI file stores it, counted from zero.
pub(crate) fn channel_wire(channel: Channel) -> u4 {
    u4::new(channel.offset())
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
    fn a_channel_counts_from_one_on_the_wire() {
        assert_eq!(Some(channel_from_wire(u4::new(0))), Channel::new(1));
        assert_eq!(channel_from_wire(u4::new(9)), Channel::DRUMS);
        assert_eq!(Some(channel_from_wire(u4::new(15))), Channel::new(16));
    }

    #[test]
    fn every_channel_reads_back_from_the_wire() {
        for channel in ChannelIdx::all().map(Channel::from_idx) {
            assert_eq!(channel_from_wire(channel_wire(channel)), channel);
        }
    }

    #[test]
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(note_from_key(note_key(n)), n);
    }
}
