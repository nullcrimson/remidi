use std::collections::BTreeSet;

use midiremap_core::{Canon, Catalog};

const CANON_KEYS: &str = include_str!("golden/canon_keys.txt");
const ENGINE_IDS: &str = include_str!("golden/engine_ids.txt");

fn lines(text: &str) -> BTreeSet<&str> {
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect()
}

#[test]
fn every_recorded_canon_key_still_parses() {
    let gone: Vec<&str> = lines(CANON_KEYS)
        .into_iter()
        .filter(|k| k.parse::<Canon>().is_err())
        .collect();
    assert!(
        gone.is_empty(),
        "saved presets use these drum keys; keep them parseable (add an alias): {gone:?}"
    );
}

#[test]
fn every_recorded_engine_id_still_resolves() {
    let catalog = Catalog::builtin();
    let gone: Vec<&str> = lines(ENGINE_IDS)
        .into_iter()
        .filter(|id| catalog.get(id).is_none())
        .collect();
    assert!(
        gone.is_empty(),
        "saved presets use these engine ids; add them to the renamed engine's `aliases`: {gone:?}"
    );
}

#[test]
fn every_current_canon_key_is_recorded() {
    let recorded = lines(CANON_KEYS);
    let current: Vec<String> = Canon::all().iter().map(Canon::to_string).collect();
    let missing: Vec<&String> = current
        .iter()
        .filter(|k| !recorded.contains(k.as_str()))
        .collect();
    assert!(
        missing.is_empty(),
        "append to tests/golden/canon_keys.txt: {missing:?}"
    );
}

#[test]
fn every_current_engine_id_is_recorded() {
    let recorded = lines(ENGINE_IDS);
    let catalog = Catalog::builtin();
    let missing: Vec<&str> = catalog
        .ids()
        .into_iter()
        .filter(|id| !recorded.contains(id))
        .collect();
    assert!(
        missing.is_empty(),
        "append to tests/golden/engine_ids.txt: {missing:?}"
    );
}
