use std::process::Command;

use midly::{
    num::{u15, u28, u4, u7},
    Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};

const BIN: &str = env!("CARGO_BIN_EXE_midiremap");

fn one_kick_smf() -> Vec<u8> {
    one_note_smf(24)
}

fn one_note_smf(note: u8) -> Vec<u8> {
    let mut track = Track::new();
    for (delta, msg) in [
        (
            0u32,
            MidiMessage::NoteOn {
                key: u7::from_int_lossy(note),
                vel: u7::from_int_lossy(100),
            },
        ),
        (
            48,
            MidiMessage::NoteOff {
                key: u7::from_int_lossy(note),
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
fn prints_usage_when_no_subcommand() {
    let out = Command::new(BIN).output().unwrap();
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr).to_lowercase();
    assert!(err.contains("usage"), "stderr was: {err}");
}

#[test]
fn lists_builtin_engines() {
    let out = Command::new(BIN).arg("list").output().unwrap();
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
            "convert",
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
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("unmappedSource"), "report missing: {err}");

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

fn first_note_on(bytes: &[u8]) -> u8 {
    Smf::parse(bytes).unwrap().tracks[0]
        .iter()
        .find_map(|ev| match ev.kind {
            TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, vel },
                ..
            } if vel.as_int() > 0 => Some(key.as_int()),
            _ => None,
        })
        .expect("a note-on")
}

fn convert_with_overrides(name: &str, overrides: &str) -> (std::process::Output, Vec<u8>) {
    let dir = std::env::temp_dir();
    let pid = std::process::id();
    let in_path = dir.join(format!("midiremap_{name}_in_{pid}.mid"));
    let out_path = dir.join(format!("midiremap_{name}_out_{pid}.mid"));
    let ov_path = dir.join(format!("midiremap_{name}_ov_{pid}.json"));
    std::fs::write(&in_path, one_kick_smf()).unwrap();
    std::fs::write(&ov_path, overrides).unwrap();
    let out = Command::new(BIN)
        .args([
            "convert",
            in_path.to_str().unwrap(),
            "ggd_invasion",
            "ezdrummer",
            out_path.to_str().unwrap(),
            "--overrides",
            ov_path.to_str().unwrap(),
        ])
        .output()
        .unwrap();
    let bytes = std::fs::read(&out_path).unwrap_or_default();
    for p in [in_path, out_path, ov_path] {
        let _ = std::fs::remove_file(p);
    }
    (out, bytes)
}

#[test]
fn overrides_file_retargets_a_drum() {
    let (out, bytes) =
        convert_with_overrides("ov_ok", r#"{"tgt":[{"canon":"kick.main","note":35}]}"#);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert_eq!(first_note_on(&bytes), 35);
}

#[test]
fn invalid_overrides_file_fails_with_its_path() {
    let (out, _) =
        convert_with_overrides("ov_bad", r#"{"tgt":[{"canon":"kick.main","note":200}]}"#);
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("invalid overrides"), "stderr: {err}");
    assert!(err.contains("0..=127"), "stderr: {err}");
}

fn note_ons(bytes: &[u8]) -> Vec<u8> {
    Smf::parse(bytes).unwrap().tracks[0]
        .iter()
        .filter_map(|ev| match ev.kind {
            TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, vel },
                ..
            } if vel.as_int() > 0 => Some(key.as_int()),
            _ => None,
        })
        .collect()
}

fn convert_china(name: &str, extra: &[&str]) -> (std::process::Output, Vec<u8>) {
    let dir = std::env::temp_dir();
    let pid = std::process::id();
    let in_path = dir.join(format!("midiremap_{name}_in_{pid}.mid"));
    let out_path = dir.join(format!("midiremap_{name}_out_{pid}.mid"));
    std::fs::write(&in_path, one_note_smf(65)).unwrap();
    let out = Command::new(BIN)
        .args([
            "convert",
            in_path.to_str().unwrap(),
            "ggd_invasion",
            "ezdrummer",
            out_path.to_str().unwrap(),
        ])
        .args(extra)
        .output()
        .unwrap();
    let bytes = std::fs::read(&out_path).unwrap_or_default();
    for p in [in_path, out_path] {
        let _ = std::fs::remove_file(p);
    }
    (out, bytes)
}

#[test]
fn missing_drums_default_to_the_nearest_drum() {
    let (out, bytes) = convert_china("missing_default", &[]);
    assert!(out.status.success());
    assert_eq!(note_ons(&bytes), vec![86]);
}

#[test]
fn missing_drop_leaves_a_swapped_drum_out() {
    let (out, bytes) = convert_china("missing_drop", &["--missing", "drop"]);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(note_ons(&bytes).is_empty());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("china.1.hit"), "report: {err}");
}

#[test]
fn unknown_missing_value_is_rejected() {
    let (out, _) = convert_china("missing_bad", &["--missing", "maybe"]);
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("nearest") && err.contains("drop"),
        "stderr: {err}"
    );
}

const PRESET: &str = include_str!("../../app/test/fixtures/my-kit.drumverter.json");

fn convert_with_preset(
    name: &str,
    preset: &str,
    engines: [&str; 2],
    extra: &[&str],
) -> (std::process::Output, Vec<u8>) {
    let dir = std::env::temp_dir();
    let pid = std::process::id();
    let in_path = dir.join(format!("midiremap_{name}_in_{pid}.mid"));
    let out_path = dir.join(format!("midiremap_{name}_out_{pid}.mid"));
    let preset_path = dir.join(format!("midiremap_{name}_{pid}.drumverter.json"));
    std::fs::write(&in_path, one_kick_smf()).unwrap();
    std::fs::write(&preset_path, preset).unwrap();
    let out = Command::new(BIN)
        .args([
            "convert",
            in_path.to_str().unwrap(),
            engines[0],
            engines[1],
            out_path.to_str().unwrap(),
            "--preset",
            preset_path.to_str().unwrap(),
        ])
        .args(extra)
        .output()
        .unwrap();
    let bytes = std::fs::read(&out_path).unwrap_or_default();
    for p in [in_path, out_path, preset_path] {
        let _ = std::fs::remove_file(p);
    }
    (out, bytes)
}

#[test]
fn a_preset_exported_by_the_app_applies_its_edits() {
    let (out, bytes) = convert_with_preset("preset_ok", PRESET, ["ggd_invasion", "ezdrummer"], &[]);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert_eq!(
        first_note_on(&bytes),
        38,
        "note 24 is reassigned to the snare"
    );
}

#[test]
fn a_preset_for_other_engines_is_refused() {
    let (out, _) =
        convert_with_preset("preset_pair", PRESET, ["ggd_invasion", "general_midi"], &[]);
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("ggd_invasion → ezdrummer") && err.contains("ggd_invasion → general_midi"),
        "stderr: {err}"
    );
}

#[test]
fn a_preset_warns_about_skipped_edits() {
    let preset = PRESET.replace("\"kick.main\": 35", "\"bogus.drum\": 35");
    let (out, _) = convert_with_preset("preset_skip", &preset, ["ggd_invasion", "ezdrummer"], &[]);
    assert!(out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("skipped: unknown drum 'bogus.drum'"),
        "stderr: {err}"
    );
}

#[test]
fn preset_and_overrides_cannot_be_combined() {
    let (out, _) = convert_with_preset(
        "preset_both",
        PRESET,
        ["ggd_invasion", "ezdrummer"],
        &["--overrides", "x.json"],
    );
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("cannot be used with"), "stderr: {err}");
}
