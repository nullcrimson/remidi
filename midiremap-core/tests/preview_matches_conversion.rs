use std::collections::BTreeMap;

use midiremap_core::{convert, Catalog, ChannelScope, EngineMap, Mapping, MissingDrums, Overrides};
use midiremap_testkit::{every_note, every_note_keys};
use rayon::prelude::*;

const NO_EDITS: &str = r#"{"edits":{},"srcEdits":{}}"#;
const OVERRIDES: &str = r#"{
    "edits": { "kick.main": 34 },
    "srcEdits": { "24": "snare1.hit", "100": "china.1.hit" }
}"#;

fn previewed_by_source_note(
    src: &EngineMap,
    tgt: &EngineMap,
    ov: &Overrides,
    missing: MissingDrums,
) -> BTreeMap<u8, u8> {
    let mut out = BTreeMap::new();
    let mut seen = BTreeMap::new();
    for row in Mapping::new(src, tgt, ov, missing).preview() {
        for &note in &row.src_notes {
            if let Some(prev) = seen.insert(note, row.entry().canon()) {
                panic!(
                    "{} -> {}: note {note} in rows {prev} and {}",
                    src.id(),
                    tgt.id(),
                    row.entry().canon()
                );
            }
            if let Some(tgt_note) = row.outcome().note() {
                out.insert(note.get(), tgt_note.get());
            }
        }
    }
    out
}

fn assert_preview_matches_conversion(ov_json: &str, missing: MissingDrums) {
    let maps = Catalog::builtin();
    let ov: Overrides = serde_json::from_str(ov_json).unwrap();
    let midi = every_note();
    let ids: Vec<&str> = maps.ids().collect();
    ids.par_iter().for_each(|&src_id| {
        let src = maps.get(src_id).unwrap();
        for tgt_id in maps.ids() {
            let tgt = maps.get(tgt_id).unwrap();
            let converted = convert(
                &midi,
                &Mapping::new(src, tgt, &ov, missing),
                ChannelScope::Auto,
            )
            .unwrap();
            assert_eq!(
                every_note_keys(&converted.bytes),
                previewed_by_source_note(src, tgt, &ov, missing),
                "{src_id} -> {tgt_id} ({missing}): preview must equal conversion"
            );
        }
    });
}

#[test]
fn preview_matches_conversion_for_every_builtin_pair() {
    assert_preview_matches_conversion(NO_EDITS, MissingDrums::Nearest);
}

#[test]
fn preview_matches_conversion_under_drop_for_every_builtin_pair() {
    assert_preview_matches_conversion(NO_EDITS, MissingDrums::Drop);
}

#[test]
fn preview_matches_conversion_with_overrides_under_drop_for_every_builtin_pair() {
    assert_preview_matches_conversion(OVERRIDES, MissingDrums::Drop);
}

#[test]
fn preview_matches_conversion_with_overrides_for_every_builtin_pair() {
    assert_preview_matches_conversion(OVERRIDES, MissingDrums::Nearest);
}
