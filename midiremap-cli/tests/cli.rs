use std::process::{Command, Output};

use midiremap_testkit::{drums, hit_keys, off, on};

const BIN: &str = env!("CARGO_BIN_EXE_midiremap");

fn one_kick_smf() -> Vec<u8> {
    one_note_smf(24)
}

fn one_note_smf(note: u8) -> Vec<u8> {
    drums(&[(0, on(note)), (48, off(note))])
}

const PAIR: [&str; 2] = ["ggd_invasion", "ezdrummer"];

/// Runs `convert` on `input` from one engine to the other, with an edits file passed after
/// its flag, and returns the run and the file it wrote.
fn run(
    input: &[u8],
    engines: [&str; 2],
    edits: Option<(&str, &str)>,
    extra: &[&str],
) -> (Output, Vec<u8>) {
    let dir = tempfile::tempdir().unwrap();
    let in_path = dir.path().join("in.mid");
    let out_path = dir.path().join("out.mid");
    let edits_path = dir.path().join("edits.drumverter.json");
    std::fs::write(&in_path, input).unwrap();
    let mut command = Command::new(BIN);
    command.args([
        "convert",
        in_path.to_str().unwrap(),
        engines[0],
        engines[1],
        out_path.to_str().unwrap(),
    ]);
    if let Some((flag, contents)) = edits {
        std::fs::write(&edits_path, contents).unwrap();
        command.args([flag, edits_path.to_str().unwrap()]);
    }
    let out = command.args(extra).output().unwrap();
    (out, std::fs::read(&out_path).unwrap_or_default())
}

fn convert_note(note: u8, extra: &[&str]) -> (Output, Vec<u8>) {
    run(&one_note_smf(note), PAIR, None, extra)
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
fn converting_a_file_succeeds() {
    let (out, _) = convert_note(24, &[]);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn converting_a_file_prints_the_report_on_stderr() {
    let (out, _) = convert_note(24, &[]);
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("unmappedSource"), "report missing: {err}");
}

#[test]
fn converting_a_file_writes_the_converted_notes() {
    let (_, bytes) = convert_note(24, &[]);
    assert_eq!(hit_keys(&bytes), vec![36]);
}

fn first_note_on(bytes: &[u8]) -> u8 {
    hit_keys(bytes)[0]
}

#[test]
fn overrides_file_retargets_a_drum() {
    let (out, bytes) = run(
        &one_kick_smf(),
        PAIR,
        Some((
            "--overrides",
            r#"{"tgt":[{"canon":"kick.main","note":35}]}"#,
        )),
        &[],
    );
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert_eq!(first_note_on(&bytes), 35);
}

#[test]
fn invalid_overrides_file_fails_with_its_path() {
    let (out, _) = run(
        &one_kick_smf(),
        PAIR,
        Some((
            "--overrides",
            r#"{"tgt":[{"canon":"kick.main","note":200}]}"#,
        )),
        &[],
    );
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("invalid overrides"), "stderr: {err}");
    assert!(err.contains("0..=127"), "stderr: {err}");
}

#[test]
fn missing_drums_default_to_the_nearest_drum() {
    let (out, bytes) = convert_note(65, &[]);
    assert!(out.status.success());
    assert_eq!(hit_keys(&bytes), vec![86]);
}

#[test]
fn missing_drop_leaves_a_swapped_drum_out() {
    let (out, bytes) = convert_note(65, &["--missing", "drop"]);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(hit_keys(&bytes).is_empty());
}

#[test]
fn missing_drop_reports_the_swapped_drum() {
    let (out, _) = convert_note(65, &["--missing", "drop"]);
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("china.1.hit"), "report: {err}");
}

#[test]
fn unknown_missing_value_is_rejected() {
    let (out, _) = convert_note(65, &["--missing", "maybe"]);
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("nearest") && err.contains("drop"),
        "stderr: {err}"
    );
}

#[test]
fn unrecognized_notes_are_removed_by_default() {
    let (out, bytes) = convert_note(99, &[]);
    assert!(out.status.success());
    assert!(hit_keys(&bytes).is_empty());
}

#[test]
fn unrecognized_keep_writes_the_note_out_unchanged() {
    let (out, bytes) = convert_note(99, &["--unrecognized", "keep"]);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert_eq!(bytes, one_note_smf(99));
}

#[test]
fn unrecognized_keep_still_reports_the_note() {
    let (out, _) = convert_note(99, &["--unrecognized", "keep"]);
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains(r#""99": 1"#), "report: {err}");
}

#[test]
fn unknown_unrecognized_value_is_rejected() {
    let (out, _) = convert_note(99, &["--unrecognized", "maybe"]);
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("remove") && err.contains("keep"),
        "stderr: {err}"
    );
}

const PRESET: &str = include_str!("../../midiremap-core/tests/golden/my-kit.drumverter.json");

#[test]
fn a_preset_exported_by_the_app_applies_its_edits() {
    let (out, bytes) = run(&one_kick_smf(), PAIR, Some(("--preset", PRESET)), &[]);
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
    let (out, _) = run(
        &one_kick_smf(),
        ["ggd_invasion", "general_midi"],
        Some(("--preset", PRESET)),
        &[],
    );
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
    let (out, _) = run(&one_kick_smf(), PAIR, Some(("--preset", &preset)), &[]);
    assert!(out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(
        err.contains("skipped: unknown drum 'bogus.drum'"),
        "stderr: {err}"
    );
}

#[test]
fn preset_and_overrides_cannot_be_combined() {
    let (out, _) = run(
        &one_kick_smf(),
        PAIR,
        Some(("--preset", PRESET)),
        &["--overrides", "x.json"],
    );
    assert!(!out.status.success());
    let err = String::from_utf8_lossy(&out.stderr);
    assert!(err.contains("cannot be used with"), "stderr: {err}");
}
