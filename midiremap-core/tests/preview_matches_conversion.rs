use std::collections::BTreeMap;

use midiremap_core::{
    convert, plan, Catalog, ChannelScope, EngineMap, Mapping, MissingDrums, Note, Overrides,
    PlanStatus,
};
use midiremap_testkit::{drums, events, off, on};
use midly::MidiMessage;

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

fn every_note_smf() -> Vec<u8> {
    let hits: Vec<_> = (0..128u8)
        .flat_map(|note| [(LEAD, on(note)), (TAIL, off(note))])
        .collect();
    drums(&hits)
}

fn converted_by_source_note(bytes: &[u8]) -> BTreeMap<u8, u8> {
    let mut time = 0;
    let mut out = BTreeMap::new();
    for (delta, _, message) in events(bytes, 0) {
        time += delta;
        if let MidiMessage::NoteOn { key, vel } = message {
            if vel.as_int() > 0 {
                let src = u8::try_from((time - LEAD) / STEP).unwrap();
                out.insert(src, key.as_int());
            }
        }
    }
    out
}

fn previewed_by_source_note(
    src: &EngineMap,
    tgt: &EngineMap,
    ov: &Overrides,
    missing: MissingDrums,
) -> BTreeMap<u8, u8> {
    let mut out = BTreeMap::new();
    let mut seen = BTreeMap::new();
    for row in plan(src, tgt, ov, missing) {
        assert_eq!(
            row.status == PlanStatus::Dropped,
            row.tgt_note.is_none(),
            "{} -> {}: {} status and target disagree",
            src.id(),
            tgt.id(),
            row.canon
        );
        for &note in &row.src_notes {
            if let Some(prev) = seen.insert(note, row.canon) {
                panic!(
                    "{} -> {}: note {note} in rows {prev} and {}",
                    src.id(),
                    tgt.id(),
                    row.canon
                );
            }
            if let Some(tgt_note) = row.tgt_note {
                out.insert(note.get(), tgt_note.get());
            }
        }
    }
    out
}

fn assert_preview_matches_conversion(ov_json: &str, missing: MissingDrums) {
    let maps = Catalog::builtin().unwrap();
    let ov: Overrides = serde_json::from_str(ov_json).unwrap();
    let midi = every_note_smf();
    let mut ids = maps.ids();
    ids.sort_unstable();
    for src_id in &ids {
        let src = maps.get(src_id).unwrap();
        for tgt_id in &ids {
            let tgt = maps.get(tgt_id).unwrap();
            let converted = convert(
                &midi,
                &Mapping::new(src, tgt, &ov, missing),
                ChannelScope::Auto,
            )
            .unwrap();
            assert_eq!(
                converted_by_source_note(&converted.bytes),
                previewed_by_source_note(src, tgt, &ov, missing),
                "{src_id} -> {tgt_id} ({missing}): preview must equal conversion"
            );
        }
    }
}

#[test]
fn preview_matches_conversion_for_every_builtin_pair() {
    assert_preview_matches_conversion("{}", MissingDrums::Nearest);
}

#[test]
fn preview_matches_conversion_under_drop_for_every_builtin_pair() {
    assert_preview_matches_conversion("{}", MissingDrums::Drop);
    assert_preview_matches_conversion(OVERRIDES, MissingDrums::Drop);
}

#[test]
fn preview_matches_conversion_with_overrides_for_every_builtin_pair() {
    assert_preview_matches_conversion(OVERRIDES, MissingDrums::Nearest);
}

#[test]
fn reassigned_note_converts_as_its_new_drum() {
    let maps = Catalog::builtin().unwrap();
    let (src, tgt) = (
        maps.get("ggd_invasion").unwrap(),
        maps.get("ezdrummer").unwrap(),
    );
    let ov: Overrides =
        serde_json::from_str(r#"{"src":[{"note":24,"canon":"snare1.hit"}]}"#).unwrap();
    let converted = convert(
        &every_note_smf(),
        &Mapping::new(src, tgt, &ov, MissingDrums::Nearest),
        ChannelScope::Auto,
    )
    .unwrap();
    let snare = plan(src, tgt, &ov, MissingDrums::Nearest)
        .into_iter()
        .find(|r| r.canon.to_string() == "snare1.hit")
        .unwrap();
    assert_eq!(snare.tgt_note.map(Note::get), Some(38));
    assert_eq!(snare.src_notes.first().map(|n| n.get()), Some(24));
    assert_eq!(
        converted_by_source_note(&converted.bytes).get(&24),
        Some(&38)
    );
}
