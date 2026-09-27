use std::collections::BTreeMap;

use midiremap_core::{
    catalog::{BuiltinMaps, MapProvider},
    plan::{plan, PlanStatus},
    remap_with_overrides, EngineMap, Overrides,
};
use midly::{
    num::{u15, u28, u4, u7},
    Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};

const LEAD: u32 = 10;
const TAIL: u32 = 5;
const STEP: u32 = LEAD + TAIL;
const OVERRIDES: &str = r#"{
    "src": [
        { "note": 24, "canon": "snare1.hit" },
        { "note": 100, "canon": "kick.main" },
        { "note": 100, "canon": "china.1.hit" }
    ],
    "tgt": [
        { "canon": "kick.main", "note": 35 },
        { "canon": "kick.main", "note": 34 }
    ]
}"#;

fn event(delta: u32, message: MidiMessage) -> TrackEvent<'static> {
    TrackEvent {
        delta: u28::from_int_lossy(delta),
        kind: TrackEventKind::Midi {
            channel: u4::from_int_lossy(9),
            message,
        },
    }
}

fn every_note_smf() -> Vec<u8> {
    let mut track = Track::new();
    for note in 0..128u8 {
        let key = u7::from_int_lossy(note);
        track.push(event(
            LEAD,
            MidiMessage::NoteOn {
                key,
                vel: u7::from_int_lossy(100),
            },
        ));
        track.push(event(
            TAIL,
            MidiMessage::NoteOff {
                key,
                vel: u7::from_int_lossy(0),
            },
        ));
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

fn converted_by_source_note(bytes: &[u8]) -> BTreeMap<u8, u8> {
    let smf = Smf::parse(bytes).unwrap();
    let mut time = 0;
    let mut out = BTreeMap::new();
    for ev in &smf.tracks[0] {
        time += ev.delta.as_int();
        if let TrackEventKind::Midi {
            message: MidiMessage::NoteOn { key, vel },
            ..
        } = ev.kind
        {
            if vel.as_int() > 0 {
                let src = u8::try_from((time - LEAD) / STEP).unwrap();
                out.insert(src, key.as_int());
            }
        }
    }
    out
}

fn previewed_by_source_note(src: &EngineMap, tgt: &EngineMap, ov: &Overrides) -> BTreeMap<u8, u8> {
    let mut out = BTreeMap::new();
    let mut seen = BTreeMap::new();
    for row in plan(src, tgt, ov) {
        assert_eq!(
            row.status == PlanStatus::Dropped,
            row.tgt_note.is_none(),
            "{} -> {}: {} status and target disagree",
            src.id,
            tgt.id,
            row.canon
        );
        for &note in &row.src_notes {
            if let Some(prev) = seen.insert(note, row.canon) {
                panic!(
                    "{} -> {}: note {note} in rows {prev} and {}",
                    src.id, tgt.id, row.canon
                );
            }
            if let Some(tgt_note) = row.tgt_note {
                out.insert(note, tgt_note);
            }
        }
    }
    out
}

fn assert_preview_matches_conversion(ov_json: &str) {
    let maps = BuiltinMaps::new();
    let ov: Overrides = serde_json::from_str(ov_json).unwrap();
    let midi = every_note_smf();
    let mut ids = maps.ids();
    ids.sort_unstable();
    for src_id in &ids {
        let src = maps.get(src_id).unwrap();
        for tgt_id in &ids {
            let tgt = maps.get(tgt_id).unwrap();
            let converted = remap_with_overrides(&midi, src, tgt, &ov).unwrap();
            assert_eq!(
                converted_by_source_note(&converted.bytes),
                previewed_by_source_note(src, tgt, &ov),
                "{src_id} -> {tgt_id}: preview must equal conversion"
            );
        }
    }
}

#[test]
fn preview_matches_conversion_for_every_builtin_pair() {
    assert_preview_matches_conversion("{}");
}

#[test]
fn preview_matches_conversion_with_overrides_for_every_builtin_pair() {
    assert_preview_matches_conversion(OVERRIDES);
}

#[test]
fn reassigned_note_converts_as_its_new_drum() {
    let maps = BuiltinMaps::new();
    let (src, tgt) = (
        maps.get("ggd_invasion").unwrap(),
        maps.get("ezdrummer").unwrap(),
    );
    let ov: Overrides =
        serde_json::from_str(r#"{"src":[{"note":24,"canon":"snare1.hit"}]}"#).unwrap();
    let converted = remap_with_overrides(&every_note_smf(), src, tgt, &ov).unwrap();
    let snare = plan(src, tgt, &ov)
        .into_iter()
        .find(|r| r.canon.to_string() == "snare1.hit")
        .unwrap();
    assert_eq!(snare.tgt_note, Some(38));
    assert_eq!(snare.src_notes.first(), Some(&24));
    assert_eq!(
        converted_by_source_note(&converted.bytes).get(&24),
        Some(&38)
    );
}
