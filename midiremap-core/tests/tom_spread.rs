use midiremap_core::{Canon, Catalog, Mapping, MissingDrums, Outcome, Overrides};

fn k(s: &str) -> Canon {
    s.parse().unwrap()
}

const NO_EDITS: &str = r#"{"edits":{},"srcEdits":{}}"#;

const GUITAR_PRO_TOMS: [&str; 6] = [
    "tom.rack1.hit",
    "tom.rack2.hit",
    "tom.rack3.hit",
    "tom.rack4.hit",
    "tom.floor1.hit",
    "tom.floor2.hit",
];

fn guitar_pro_on_krimh<'a>(
    catalog: &'a Catalog,
    edits: &str,
    missing: MissingDrums,
) -> Mapping<'a> {
    let overrides: Overrides = serde_json::from_str(edits).unwrap();
    Mapping::new(
        catalog.get("guitar_pro").unwrap(),
        catalog.get("bogren_krimh").unwrap(),
        &overrides,
        missing,
    )
}

fn lands(m: &Mapping, key: &str) -> Option<u8> {
    m.resolve_canon(k(key)).note().map(|n| n.get())
}

#[test]
fn guitar_pro_toms_spread_over_every_krimh_tom() {
    let catalog = Catalog::builtin();
    let m = guitar_pro_on_krimh(&catalog, NO_EDITS, MissingDrums::Nearest);
    let notes: Vec<Option<u8>> = GUITAR_PRO_TOMS.iter().map(|t| lands(&m, t)).collect();
    assert_eq!(
        notes,
        [33, 34, 34, 37, 35, 36].map(Some).to_vec(),
        "racks 1-4, floors 1-2"
    );
}

#[test]
fn a_moved_tom_the_target_has_lands_directly_on_its_spread_tom() {
    let catalog = Catalog::builtin();
    let m = guitar_pro_on_krimh(&catalog, NO_EDITS, MissingDrums::Nearest);
    let floor1 = m.resolve_canon(k("tom.floor1.hit"));
    assert!(
        matches!(floor1, Outcome::Direct(l) if l.plays() == k("tom.floor2.hit")),
        "{floor1:?}"
    );
}

#[test]
fn a_target_edit_of_a_moved_tom_keeps_the_users_note() {
    let catalog = Catalog::builtin();
    let edits = r#"{"edits":{"tom.floor1.hit":100},"srcEdits":{}}"#;
    let m = guitar_pro_on_krimh(&catalog, edits, MissingDrums::Nearest);
    assert_eq!(lands(&m, "tom.floor1.hit"), Some(100));
}

#[test]
fn an_edit_of_a_tom_the_spread_moved_moves_no_tom_landing_on_its_name() {
    let catalog = Catalog::builtin();
    let edits = r#"{"edits":{"tom.floor1.hit":100},"srcEdits":{}}"#;
    let m = guitar_pro_on_krimh(&catalog, edits, MissingDrums::Nearest);
    assert_eq!(lands(&m, "tom.rack4.hit"), Some(37));
}

#[test]
fn a_source_note_edited_onto_a_tom_the_source_lacks_walks_the_nearest_tom() {
    let catalog = Catalog::builtin();
    let edits = r#"{"edits":{},"srcEdits":{"45":"tom.rack5.hit"}}"#;
    let m = guitar_pro_on_krimh(&catalog, edits, MissingDrums::Nearest);
    let krimh = catalog.get("bogren_krimh").unwrap();
    let (_, outcome) = m.played().find(|(n, _)| n.get() == 45).unwrap();
    assert_eq!(
        outcome.note(),
        krimh
            .resolve(k("tom.rack5.hit"), MissingDrums::Nearest)
            .note()
    );
}

#[test]
fn drop_keeps_toms_on_their_names_and_leaves_out_the_missing_ones() {
    let catalog = Catalog::builtin();
    let m = guitar_pro_on_krimh(&catalog, NO_EDITS, MissingDrums::Drop);
    let notes: Vec<Option<u8>> = GUITAR_PRO_TOMS.iter().map(|t| lands(&m, t)).collect();
    assert_eq!(
        notes,
        vec![Some(33), Some(34), None, None, Some(37), Some(35)]
    );
}
