use midiremap_core::{Canon, Catalog, Mapping, MissingDrums, Overrides};

fn k(s: &str) -> Canon {
    s.parse().unwrap()
}

const NO_EDITS: &str = r#"{"edits":{},"srcEdits":{}}"#;

fn mapping<'a>(
    catalog: &'a Catalog,
    src: &str,
    tgt: &str,
    edits: &str,
    missing: MissingDrums,
) -> Mapping<'a> {
    let overrides: Overrides = serde_json::from_str(edits).unwrap();
    Mapping::new(
        catalog.get(src).unwrap(),
        catalog.get(tgt).unwrap(),
        &overrides,
        missing,
    )
}

fn lands(m: &Mapping, key: &str) -> Option<u8> {
    m.resolve_canon(k(key)).note().map(|n| n.get())
}

fn alesis_on_numetal<'a>(catalog: &'a Catalog, edits: &str, missing: MissingDrums) -> Mapping<'a> {
    mapping(catalog, "alesis_command", "ggd_numetal_ggd", edits, missing)
}

#[test]
fn alesis_crashes_spread_over_both_numetal_crashes() {
    let catalog = Catalog::builtin();
    let m = alesis_on_numetal(&catalog, NO_EDITS, MissingDrums::Nearest);
    assert_eq!(
        [lands(&m, "crash.1.hit"), lands(&m, "crash.2.hit")],
        [Some(58), Some(61)],
        "crash 1 on Nu-Metal crash 2, crash 2 on crash 3"
    );
}

#[test]
fn missing_kinds_claim_the_free_crashes_china_first_then_splash_then_stack() {
    let catalog = Catalog::builtin();
    let m = mapping(
        &catalog,
        "drumforge_greiner",
        "bfd3",
        NO_EDITS,
        MissingDrums::Nearest,
    );
    let notes = ["china.1.hit", "china.2.hit", "splash.1.hit", "stack.1.hit"].map(|c| lands(&m, c));
    assert_eq!(
        notes,
        [Some(74), Some(77), Some(79), Some(72)],
        "crashes 3, 4, 5, and none left for the stack, which shares crash 1"
    );
}

#[test]
fn a_target_edit_of_a_moved_cymbal_keeps_the_users_note() {
    let catalog = Catalog::builtin();
    let edits = r#"{"edits":{"crash.2.hit":100},"srcEdits":{}}"#;
    let m = alesis_on_numetal(&catalog, edits, MissingDrums::Nearest);
    assert_eq!(lands(&m, "crash.2.hit"), Some(100));
}

#[test]
fn an_edit_of_a_cymbal_the_spread_moved_moves_no_cymbal_landing_on_its_name() {
    let catalog = Catalog::builtin();
    let edits = r#"{"edits":{"crash.2.hit":100},"srcEdits":{}}"#;
    let m = alesis_on_numetal(&catalog, edits, MissingDrums::Nearest);
    assert_eq!(lands(&m, "crash.1.hit"), Some(58));
}

#[test]
fn drop_keeps_a_cymbal_the_target_names_on_its_name() {
    let catalog = Catalog::builtin();
    let m = alesis_on_numetal(&catalog, NO_EDITS, MissingDrums::Drop);
    assert_eq!(lands(&m, "crash.2.hit"), Some(58));
}

#[test]
fn drop_leaves_out_a_cymbal_the_target_lacks() {
    let catalog = Catalog::builtin();
    let m = alesis_on_numetal(&catalog, NO_EDITS, MissingDrums::Drop);
    assert_eq!(lands(&m, "crash.1.hit"), None);
}
