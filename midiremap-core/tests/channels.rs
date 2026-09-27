use midiremap_core::{
    catalog::{BuiltinMaps, MapProvider},
    remap, ChannelScope, Conversion, Converted, DefaultFallbacks,
};
use midly::{
    num::{u15, u28, u4, u7},
    Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};

const DRUMS: u8 = 9;
const BASS: u8 = 0;

type Ev = (u32, u8, MidiMessage);

fn track(events: &[Ev]) -> Track<'static> {
    events
        .iter()
        .map(|&(delta, channel, message)| TrackEvent {
            delta: u28::from_int_lossy(delta),
            kind: TrackEventKind::Midi {
                channel: u4::from_int_lossy(channel),
                message,
            },
        })
        .collect()
}

fn smf_tracks(tracks: &[&[Ev]]) -> Vec<u8> {
    let smf = Smf {
        header: Header {
            format: if tracks.len() == 1 {
                Format::SingleTrack
            } else {
                Format::Parallel
            },
            timing: Timing::Metrical(u15::from_int_lossy(480)),
        },
        tracks: tracks.iter().map(|t| track(t)).collect(),
    };
    let mut buf = Vec::new();
    smf.write_std(&mut buf).unwrap();
    buf
}

fn smf_from(events: &[Ev]) -> Vec<u8> {
    smf_tracks(&[events])
}

fn on(note: u8) -> MidiMessage {
    MidiMessage::NoteOn {
        key: u7::from_int_lossy(note),
        vel: u7::from_int_lossy(100),
    }
}

fn silent_on(note: u8) -> MidiMessage {
    MidiMessage::NoteOn {
        key: u7::from_int_lossy(note),
        vel: u7::from_int_lossy(0),
    }
}

fn off(note: u8) -> MidiMessage {
    MidiMessage::NoteOff {
        key: u7::from_int_lossy(note),
        vel: u7::from_int_lossy(0),
    }
}

fn choke(note: u8) -> MidiMessage {
    MidiMessage::Aftertouch {
        key: u7::from_int_lossy(note),
        vel: u7::from_int_lossy(127),
    }
}

fn cc() -> MidiMessage {
    MidiMessage::Controller {
        controller: u7::from_int_lossy(7),
        value: u7::from_int_lossy(90),
    }
}

fn events(bytes: &[u8]) -> Vec<Ev> {
    track_events(bytes, 0)
}

fn track_events(bytes: &[u8], index: usize) -> Vec<Ev> {
    let smf = Smf::parse(bytes).unwrap();
    smf.tracks[index]
        .iter()
        .filter_map(|ev| match ev.kind {
            TrackEventKind::Midi { channel, message } => {
                Some((ev.delta.as_int(), channel.as_int(), message))
            }
            _ => None,
        })
        .collect()
}

fn ggd_to_ezd(midi: &[u8], scope: ChannelScope) -> Converted {
    let b = BuiltinMaps::new();
    let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
    Conversion::new(src, tgt, &DefaultFallbacks)
        .with_scope(scope)
        .run(midi)
        .unwrap()
}

#[test]
fn auto_leaves_tracks_without_channel_10_hits_untouched() {
    let bass: &[Ev] = &[
        (0, BASS, on(24)),
        (0, BASS, on(99)),
        (0, BASS, cc()),
        (0, BASS, choke(24)),
        (10, BASS, off(24)),
        (0, BASS, off(99)),
    ];
    let midi = smf_tracks(&[&[(0, DRUMS, on(24)), (10, DRUMS, off(24))], bass]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        track_events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (10, DRUMS, off(36))]
    );
    assert_eq!(track_events(&out.bytes, 1), bass);
    assert!(out.report.unmapped_source.is_empty());
}

#[test]
fn auto_converts_every_channel_of_a_track_with_channel_10_hits() {
    let midi = smf_from(&[(0, DRUMS, on(24)), (0, BASS, on(24)), (0, BASS, choke(24))]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes),
        vec![(0, DRUMS, on(36)), (0, BASS, on(36)), (0, BASS, choke(36))]
    );
}

#[test]
fn remap_defaults_to_auto() {
    let b = BuiltinMaps::new();
    let midi = smf_tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = remap(
        &midi,
        b.get("ggd_invasion").unwrap(),
        b.get("ezdrummer").unwrap(),
    )
    .unwrap();
    assert_eq!(track_events(&out.bytes, 0), vec![(0, DRUMS, on(36))]);
    assert_eq!(track_events(&out.bytes, 1), vec![(0, BASS, on(24))]);
}

#[test]
fn auto_converts_every_track_without_channel_10_hits() {
    let midi = smf_tracks(&[
        &[(0, DRUMS, silent_on(24)), (0, BASS, on(24))],
        &[(0, BASS, on(24))],
    ]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        track_events(&out.bytes, 0),
        vec![(0, DRUMS, silent_on(36)), (0, BASS, on(36))]
    );
    assert_eq!(track_events(&out.bytes, 1), vec![(0, BASS, on(36))]);
}

#[test]
fn all_converts_every_channel_of_every_track() {
    let midi = smf_tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All);
    assert_eq!(track_events(&out.bytes, 0), vec![(0, DRUMS, on(36))]);
    assert_eq!(track_events(&out.bytes, 1), vec![(0, BASS, on(36))]);
}

#[test]
fn only_converts_the_named_channel() {
    let midi = smf_from(&[(0, DRUMS, on(24)), (0, BASS, on(24))]);
    let out = ggd_to_ezd(&midi, "1".parse().unwrap());
    assert_eq!(
        events(&out.bytes),
        vec![(0, DRUMS, on(24)), (0, BASS, on(36))]
    );
}

#[test]
fn choke_aftertouch_follows_its_note() {
    let midi = smf_from(&[
        (0, DRUMS, on(24)),
        (5, DRUMS, choke(24)),
        (5, DRUMS, off(24)),
    ]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes),
        vec![
            (0, DRUMS, on(36)),
            (5, DRUMS, choke(36)),
            (5, DRUMS, off(36))
        ]
    );
}

#[test]
fn choke_on_a_removed_note_is_removed_and_its_delta_folds_forward() {
    let midi = smf_from(&[
        (0, DRUMS, on(24)),
        (10, DRUMS, choke(99)),
        (5, DRUMS, off(24)),
    ]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes),
        vec![(0, DRUMS, on(36)), (15, DRUMS, off(36))]
    );
    assert!(
        out.report.unmapped_source.is_empty(),
        "aftertouch is not a hit"
    );
}

#[test]
fn folded_deltas_saturate_instead_of_wrapping() {
    let max = u28::max_value().as_int();
    let midi = smf_from(&[
        (0, DRUMS, on(24)),
        (max, DRUMS, on(99)),
        (5, DRUMS, on(99)),
        (1, DRUMS, off(24)),
    ]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes),
        vec![(0, DRUMS, on(36)), (max, DRUMS, off(36))]
    );
}

#[test]
fn channel_scope_parses_cli_values() {
    assert_eq!("auto".parse::<ChannelScope>().unwrap(), ChannelScope::Auto);
    assert_eq!("all".parse::<ChannelScope>().unwrap(), ChannelScope::All);
    assert_eq!(
        "10".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(u4::from_int_lossy(9))
    );
    assert_eq!(
        "16".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(u4::from_int_lossy(15))
    );
    for bad in ["0", "17", "x", "", "-1"] {
        assert!(bad.parse::<ChannelScope>().is_err(), "{bad:?}");
    }
}
