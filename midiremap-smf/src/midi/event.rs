use midiremap_note::Note;
use midly::{
    num::{u4, u7},
    MidiMessage, TrackEventKind,
};

use super::channel::{Channel, ChannelIdx};

/// How a file writes the release of a note: a note-off, or a note-on without velocity.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Release {
    NoteOff,
    SilentNoteOn,
}

/// What a note event does to its note: sounds it (a note-on with a velocity), releases it,
/// or chokes it (poly aftertouch).
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Touch {
    Hit,
    Release(Release),
    Choke,
}

/// A MIDI event about one note on one channel, with its velocity (a choke's pressure).
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct NoteEvent {
    pub channel: Channel,
    pub note: Note,
    pub vel: u7,
    pub touch: Touch,
}

impl NoteEvent {
    /// The note event `kind` is, when it is one.
    pub fn of(kind: &TrackEventKind) -> Option<Self> {
        let TrackEventKind::Midi { channel, message } = *kind else {
            return None;
        };
        let (key, vel, touch) = match message {
            MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => (key, vel, Touch::Hit),
            MidiMessage::NoteOn { key, vel } => (key, vel, Touch::Release(Release::SilentNoteOn)),
            MidiMessage::NoteOff { key, vel } => (key, vel, Touch::Release(Release::NoteOff)),
            MidiMessage::Aftertouch { key, vel } => (key, vel, Touch::Choke),
            MidiMessage::Controller { .. }
            | MidiMessage::ProgramChange { .. }
            | MidiMessage::ChannelAftertouch { .. }
            | MidiMessage::PitchBend { .. } => return None,
        };
        Some(Self {
            channel: channel_from_wire(channel),
            note: note_from_key(key),
            vel,
            touch,
        })
    }

    /// The event as a MIDI file stores it.
    pub fn kind(self) -> TrackEventKind<'static> {
        let (key, vel) = (note_key(self.note), self.vel);
        let message = match self.touch {
            Touch::Hit | Touch::Release(Release::SilentNoteOn) => MidiMessage::NoteOn { key, vel },
            Touch::Release(Release::NoteOff) => MidiMessage::NoteOff { key, vel },
            Touch::Choke => MidiMessage::Aftertouch { key, vel },
        };
        TrackEventKind::Midi {
            channel: channel_wire(self.channel),
            message,
        }
    }
}

/// The channel and note of `kind` when it sounds a note: a note-on with a velocity.
pub fn hit(kind: &TrackEventKind) -> Option<(Channel, Note)> {
    NoteEvent::of(kind)
        .filter(|event| event.touch == Touch::Hit)
        .map(|event| (event.channel, event.note))
}

/// The channel a MIDI file stores as `wire`, counted from zero.
pub fn channel_from_wire(wire: u4) -> Channel {
    Channel::from_idx(ChannelIdx::new(wire.as_int() + 1).expect("a 4-bit channel is 1..=16"))
}

/// The channel as a MIDI file stores it, counted from zero.
pub fn channel_wire(channel: Channel) -> u4 {
    u4::new(channel.offset())
}

/// The note a MIDI file stores as `key`.
pub fn note_from_key(key: u7) -> Note {
    Note::ALL[usize::from(key.as_int())]
}

/// The key a MIDI file stores `note` as.
pub fn note_key(note: Note) -> u7 {
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
    fn a_note_event_writes_the_event_it_was_read_from() {
        for (key, vel) in (0..=127).flat_map(|key| [0, 1, 127].map(|vel| (key, vel))) {
            let (key, vel) = (u7::new(key), u7::new(vel));
            for message in [
                MidiMessage::NoteOn { key, vel },
                MidiMessage::NoteOff { key, vel },
                MidiMessage::Aftertouch { key, vel },
            ] {
                let kind = TrackEventKind::Midi {
                    channel: u4::new(9),
                    message,
                };
                assert_eq!(NoteEvent::of(&kind).map(NoteEvent::kind), Some(kind));
            }
        }
    }

    #[test]
    fn converts_to_and_from_u7() {
        let n = Note::new(100).unwrap();
        assert_eq!(note_from_key(note_key(n)), n);
    }
}
