use std::process::Command;

use midly::{
    num::{u15, u28, u4, u7},
    Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};

const BIN: &str = env!("CARGO_BIN_EXE_midiremap");

fn one_kick_smf() -> Vec<u8> {
    let mut track = Track::new();
    for (delta, msg) in [
        (
            0u32,
            MidiMessage::NoteOn {
                key: u7::from_int_lossy(24),
                vel: u7::from_int_lossy(100),
            },
        ),
        (
            48,
            MidiMessage::NoteOff {
                key: u7::from_int_lossy(24),
                vel: u7::from_int_lossy(0),
            },
        ),
    ] {
        track.push(TrackEvent {
            delta: u28::from_int_lossy(delta),
            kind: TrackEventKind::Midi {
                channel: u4::from_int_lossy(9),
                message: msg,
            },
        });
    }
    let smf = Smf {
        header: Header {
            format: Format::SingleTrack,
            timing: Timing::Metrical(u15::from_int_lossy(480)),
        },
        tracks: vec![track],
    };
    let mut buf = Vec::new();
    smf.write_std(&mut buf).unwrap();
    buf
}

#[test]
fn prints_usage_when_args_missing() {
    let out = Command::new(BIN).output().unwrap();
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("usage"), "stderr was: {err}");
}

#[test]
fn lists_builtin_engines() {
    let out = Command::new(BIN).arg("--list").output().unwrap();
    assert!(out.status.success());
    let stdout = String::from_utf8_lossy(&out.stdout);
    assert!(stdout.contains("ggd_invasion"), "stdout was: {stdout}");
    assert!(stdout.contains("ezdrummer"), "stdout was: {stdout}");
}

#[test]
fn converts_a_file_end_to_end() {
    let dir = std::env::temp_dir();
    let pid = std::process::id();
    let in_path = dir.join(format!("midiremap_in_{pid}.mid"));
    let out_path = dir.join(format!("midiremap_out_{pid}.mid"));
    std::fs::write(&in_path, one_kick_smf()).unwrap();

    let out = Command::new(BIN)
        .args([
            in_path.to_str().unwrap(),
            "ggd_invasion",
            "ezdrummer",
            out_path.to_str().unwrap(),
        ])
        .output()
        .unwrap();

    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    // Report JSON goes to stderr.
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("unmapped_source"), "report missing: {err}");

    // The output file is a valid SMF whose kick was remapped 24 -> 36.
    let bytes = std::fs::read(&out_path).unwrap();
    let smf = Smf::parse(&bytes).unwrap();
    let key = smf.tracks[0]
        .iter()
        .find_map(|ev| match ev.kind {
            TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, vel },
                ..
            } if vel.as_int() > 0 => Some(key.as_int()),
            _ => None,
        })
        .expect("a note-on");
    assert_eq!(key, 36);

    let _ = std::fs::remove_file(&in_path);
    let _ = std::fs::remove_file(&out_path);
}
