//! Builds and reads small Standard MIDI Files for tests. Channels are numbered `1..=16`
//! as people count them.

use midly::{
    num::{u15, u28, u4, u7},
    Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};

/// Ticks per quarter note in every file built here.
pub const PPQ: u16 = 480;
const _: () = assert!(PPQ < 1 << 15, "PPQ is a 15-bit value");

/// Channel 10, where General MIDI puts drums.
pub const DRUMS: u8 = 10;

/// One MIDI event: delta ticks, channel `1..=16`, message.
pub type Ev = (u32, u8, MidiMessage);

fn data_byte(value: u8) -> u7 {
    u7::try_from(value).expect("a key, velocity or controller value is 0..=127")
}

/// A note-on at velocity 100.
pub fn on(key: u8) -> MidiMessage {
    MidiMessage::NoteOn {
        key: data_byte(key),
        vel: data_byte(100),
    }
}

/// A note-on at velocity 0, which ends a note like a note-off.
pub fn silent_on(key: u8) -> MidiMessage {
    MidiMessage::NoteOn {
        key: data_byte(key),
        vel: data_byte(0),
    }
}

/// A note-off at velocity 0.
pub fn off(key: u8) -> MidiMessage {
    MidiMessage::NoteOff {
        key: data_byte(key),
        vel: data_byte(0),
    }
}

/// Full polyphonic aftertouch, which chokes a cymbal in most drum engines.
pub fn choke(key: u8) -> MidiMessage {
    MidiMessage::Aftertouch {
        key: data_byte(key),
        vel: data_byte(127),
    }
}

/// A channel-volume controller change.
pub fn cc() -> MidiMessage {
    MidiMessage::Controller {
        controller: data_byte(7),
        value: data_byte(90),
    }
}

/// One MIDI event on `channel` (`1..=16`).
pub fn event(delta: u32, channel: u8, message: MidiMessage) -> TrackEvent<'static> {
    TrackEvent {
        delta: u28::try_from(delta).expect("a delta time fits in 28 bits"),
        kind: TrackEventKind::Midi {
            channel: channel
                .checked_sub(1)
                .and_then(u4::try_from)
                .expect("a channel is 1..=16"),
            message,
        },
    }
}

/// A track of MIDI events.
pub fn track(events: &[Ev]) -> Track<'static> {
    events
        .iter()
        .map(|&(delta, channel, message)| event(delta, channel, message))
        .collect()
}

/// A file of `tracks`: single-track for one, parallel for more.
pub fn smf(tracks: Vec<Track<'static>>) -> Vec<u8> {
    let format = if tracks.len() == 1 {
        Format::SingleTrack
    } else {
        Format::Parallel
    };
    let smf = Smf {
        header: Header {
            format,
            timing: Timing::Metrical(u15::new(PPQ)),
        },
        tracks,
    };
    let mut bytes = Vec::new();
    smf.write_std(&mut bytes)
        .expect("writing to a Vec never fails");
    bytes
}

/// A file with one track per slice of events.
pub fn tracks(tracks: &[&[Ev]]) -> Vec<u8> {
    smf(tracks.iter().map(|t| track(t)).collect())
}

/// A one-track file with every message on the drum channel.
pub fn drums(events: &[(u32, MidiMessage)]) -> Vec<u8> {
    smf(vec![events
        .iter()
        .map(|&(delta, message)| event(delta, DRUMS, message))
        .collect()])
}

/// The MIDI events of track `index`, with channels numbered `1..=16`.
pub fn events(bytes: &[u8], index: usize) -> Vec<Ev> {
    parse(bytes).tracks[index]
        .iter()
        .filter_map(|ev| match ev.kind {
            TrackEventKind::Midi { channel, message } => {
                Some((ev.delta.as_int(), channel.as_int() + 1, message))
            }
            _ => None,
        })
        .collect()
}

/// The keys of track 0's note-ons with a velocity, in order.
pub fn hit_keys(bytes: &[u8]) -> Vec<u8> {
    events(bytes, 0)
        .into_iter()
        .filter_map(|(_, _, message)| match message {
            MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => Some(key.as_int()),
            _ => None,
        })
        .collect()
}

fn parse(bytes: &[u8]) -> Smf<'_> {
    Smf::parse(bytes).expect("a test file must parse")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drums_round_trip_on_channel_ten() {
        let bytes = drums(&[(0, on(36)), (48, off(36))]);
        assert_eq!(events(&bytes, 0), vec![(0, 10, on(36)), (48, 10, off(36))]);
    }

    #[test]
    fn one_track_is_single_track_and_more_are_parallel() {
        let one = parse(&tracks(&[&[(0, 1, cc())]])).header.format;
        let two = parse(&tracks(&[&[(0, 1, cc())], &[(0, 2, cc())]]))
            .header
            .format;
        assert_eq!((one, two), (Format::SingleTrack, Format::Parallel));
    }

    #[test]
    fn files_use_the_shared_resolution() {
        let header = parse(&drums(&[])).header;
        assert_eq!(header.timing, Timing::Metrical(u15::new(PPQ)));
    }

    #[test]
    fn channels_count_from_one() {
        let bytes = tracks(&[&[(0, 1, on(1)), (0, 16, on(2))]]);
        let channels: Vec<u8> = events(&bytes, 0).iter().map(|e| e.1).collect();
        assert_eq!(channels, vec![1, 16]);
    }

    #[test]
    fn hit_keys_skip_silent_note_ons_and_other_messages() {
        let bytes = drums(&[
            (0, on(36)),
            (0, silent_on(36)),
            (0, choke(49)),
            (0, cc()),
            (0, off(38)),
            (0, on(38)),
        ]);
        assert_eq!(hit_keys(&bytes), vec![36, 38]);
    }

    #[test]
    #[should_panic(expected = "a key, velocity or controller value is 0..=127")]
    fn a_key_above_127_is_refused() {
        on(200);
    }

    #[test]
    #[should_panic(expected = "a channel is 1..=16")]
    fn channel_17_is_refused() {
        event(0, 17, on(36));
    }

    #[test]
    #[should_panic(expected = "a channel is 1..=16")]
    fn channel_0_is_refused() {
        event(0, 0, on(36));
    }
}
