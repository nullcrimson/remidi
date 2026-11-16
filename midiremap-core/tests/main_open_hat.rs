use midiremap_core::{Catalog, Mapping, MissingDrums, Overrides};
use support::k;

pub mod support;

fn mapping<'a>(catalog: &'a Catalog, src: &str, tgt: &str, edits: &str) -> Mapping<'a> {
    let overrides: Overrides = serde_json::from_str(edits).unwrap();
    Mapping::new(
        catalog.get(src).unwrap(),
        catalog.get(tgt).unwrap(),
        &overrides,
        MissingDrums::Nearest,
    )
}

const NO_EDITS: &str = r#"{"edits":{},"srcEdits":{}}"#;

fn lands(src: &str, tgt: &str, note: u8) -> Option<u8> {
    let catalog = Catalog::builtin();
    let m = mapping(&catalog, src, tgt, NO_EDITS);
    let (_, outcome) = m.played().find(|(n, _)| n.get() == note)?;
    outcome.note().map(|n| n.get())
}

#[test]
fn gm_open_hat_lands_on_ezdrummer_3_open_2() {
    assert_eq!(lands("general_midi", "ezdrummer", 46), Some(25));
}

#[test]
fn gm_open_hat_lands_on_mt_power_open_not_half_open() {
    assert_eq!(lands("general_midi", "mt_power", 46), Some(46));
}

#[test]
fn gm_open_hat_lands_on_both_abbey_road_modern_kits_fully_open() {
    for tgt in ["ni_abbeyroad_modern", "ni_abbeyroad_modern_sparkle"] {
        assert_eq!(lands("general_midi", tgt, 46), Some(80), "{tgt}");
    }
}

#[test]
fn gm_open_hat_lands_on_ugritone_wide_open() {
    assert_eq!(lands("general_midi", "ugritone", 46), Some(32));
}

#[test]
fn ggd_open_hat_lands_on_addictive_drums_2_open_b() {
    assert_eq!(lands("ggd_invasion", "addictive_drums2", 46), Some(55));
}

#[test]
fn gm_open_hat_lands_on_spectre_master_kit_shank_open_4() {
    assert_eq!(lands("general_midi", "spectre_ele_masterkit", 46), Some(58));
}

#[test]
fn gm_open_hat_lands_on_trivium_open_3_as_its_general_midi_preset_plays_it() {
    assert_eq!(lands("general_midi", "bogren_trivium", 46), Some(45));
}

#[test]
fn a_main_open_hat_lands_on_halpern_open_2_as_its_general_midi_map_plays_it() {
    assert_eq!(lands("bogren_krimh", "ggd_halpern", 46), Some(54));
    assert_eq!(lands("bogren_krimh", "ggd_halpern_ggd", 46), Some(52));
}

#[test]
fn gm_open_hat_lands_on_duplantier_2_edge_open_3() {
    assert_eq!(lands("general_midi", "mixwave_duplantier2", 46), Some(46));
}

#[test]
fn ggd_open_levels_keep_their_order_on_duplantier_2() {
    assert_eq!(lands("ggd_invasion", "mixwave_duplantier2", 45), Some(78));
}

#[test]
fn gm_open_hat_lands_on_duplantier_open_5_as_its_general_midi_preset_plays_it() {
    assert_eq!(lands("general_midi", "mixwave_duplantier", 46), Some(83));
}

#[test]
fn gm_closed_hat_lands_on_hertz_2_closed_tip_not_its_choke() {
    assert_eq!(lands("general_midi", "hertz2", 42), Some(42));
    assert_eq!(lands("general_midi", "hertz2", 46), Some(27));
}

#[test]
fn ggd_open_levels_keep_their_order_on_krimh() {
    assert_eq!(lands("ggd_invasion", "bogren_krimh", 45), Some(45));
    assert_eq!(lands("ggd_invasion", "bogren_krimh", 46), Some(46));
    assert_eq!(lands("ggd_invasion", "bogren_krimh", 47), Some(47));
}

#[test]
fn ggd_open_levels_keep_their_order_on_mangini() {
    assert_eq!(lands("ggd_invasion", "mixwave_mangini", 45), Some(78));
    assert_eq!(lands("ggd_invasion", "mixwave_mangini", 46), Some(46));
}

fn each_lands(src: &str, tgt: &str, notes: &[(u8, u8)]) {
    for &(from, to) in notes {
        assert_eq!(lands(src, tgt, from), Some(to), "{src} {from} -> {tgt}");
    }
}

#[test]
fn addictive_drums_2_rungs_each_take_their_own_step_on_ezdrummer_3() {
    each_lands(
        "addictive_drums2",
        "ezdrummer",
        &[(54, 24), (55, 25), (56, 26), (57, 60)],
    );
}

#[test]
fn superior_drummer_3_rungs_skip_no_rung_on_addictive_drums_2() {
    each_lands(
        "superior_drummer3",
        "addictive_drums2",
        &[(64, 54), (24, 54), (25, 55), (26, 56), (60, 57), (17, 57)],
    );
}

#[test]
fn superior_drummer_3_bell_rungs_stay_on_the_one_addictive_drums_2_bell_rung() {
    each_lands(
        "superior_drummer3",
        "addictive_drums2",
        &[(120, 58), (121, 58), (122, 58), (123, 58), (124, 58)],
    );
}

#[test]
fn ggd_open_levels_reach_guitar_pros_half_open_hat() {
    each_lands(
        "ggd_invasion",
        "guitar_pro",
        &[(45, 92), (46, 46), (47, 46)],
    );
}

#[test]
fn krimhs_tip_open_hat_counts_its_steps_from_krimhs_main_on_ggd() {
    each_lands("bogren_krimh", "ggd_invasion", &[(50, 45), (46, 46)]);
}

#[test]
fn superior_drummer_3_tip_rungs_count_among_every_fotis_benardo_rung() {
    each_lands(
        "superior_drummer3",
        "fotis_benardo",
        &[(13, 54), (14, 46), (15, 49), (16, 49), (17, 49)],
    );
}

#[test]
fn ezdrummer_2_open_levels_keep_their_order_on_ggd() {
    assert_eq!(lands("ezdrummer2", "ggd_invasion", 46), Some(46));
    assert_eq!(lands("ezdrummer2", "ggd_invasion", 26), Some(47));
}

#[test]
fn a_level_guitar_pro_does_not_play_lands_by_its_side_of_the_main() {
    let catalog = Catalog::builtin();
    let m = mapping(&catalog, "guitar_pro", "ggd_bennygreb", NO_EDITS);
    assert_eq!(
        m.resolve_canon(k("hat.open2")).note().map(|n| n.get()),
        Some(48)
    );
}

#[test]
fn an_edit_of_the_open_hat_row_wins_over_the_main_open_hat() {
    let catalog = Catalog::builtin();
    let edited = r#"{"edits":{"hat.open1":100},"srcEdits":{}}"#;
    let m = mapping(&catalog, "general_midi", "ggd_invasion", edited);
    let (_, outcome) = m.played().find(|(n, _)| n.get() == 46).unwrap();
    assert_eq!(outcome.note().map(|n| n.get()), Some(100));
}

#[test]
fn an_edit_of_one_open_hat_row_moves_no_other_row() {
    let catalog = Catalog::builtin();
    let edited = r#"{"edits":{"hat.open3":100},"srcEdits":{}}"#;
    let m = mapping(&catalog, "ezdrummer2", "ggd_invasion", edited);
    let lands = |key| m.resolve_canon(k(key)).note().map(|n| n.get());
    assert_eq!(lands("hat.open3"), Some(100));
    assert_eq!(lands("hat.open2"), Some(47));
    assert_eq!(lands("hat.open4"), Some(47));
}

#[test]
fn an_edit_of_a_target_open_hat_row_moves_no_source_open_hat_landing_on_it() {
    let catalog = Catalog::builtin();
    let edited = r#"{"edits":{"hat.open3.edge":100},"srcEdits":{}}"#;
    let m = mapping(&catalog, "bfd3", "mixwave_holland", edited);
    let lands = |key| m.resolve_canon(k(key)).note().map(|n| n.get());
    assert_eq!(lands("hat.open2.tip"), Some(79));
    assert_eq!(lands("hat.open3.tip"), Some(79));
}

#[test]
fn an_edit_of_a_target_loose_hat_moves_no_source_loose_hat_landing_on_it() {
    let catalog = Catalog::builtin();
    let edited = r#"{"edits":{"hat.loose":100},"srcEdits":{}}"#;
    let m = mapping(&catalog, "superior_drummer3", "addictive_drums2", edited);
    let lands = |key| m.resolve_canon(k(key)).note().map(|n| n.get());
    assert_eq!(lands("hat.loose.edge"), Some(54));
}

#[test]
fn the_preview_shows_the_source_open_hat_on_the_targets_main_open_hat() {
    let catalog = Catalog::builtin();
    let rows = mapping(&catalog, "general_midi", "ezdrummer", NO_EDITS).preview();
    let open: Vec<(String, Vec<u8>, Option<u8>)> = rows
        .iter()
        .filter(|r| r.entry().canon().is_main_hat_rung())
        .map(|r| {
            let src: Vec<u8> = r.src_notes.iter().map(|n| n.get()).collect();
            (
                r.entry().canon().to_string(),
                src,
                r.outcome().note().map(|n| n.get()),
            )
        })
        .collect();
    assert_eq!(open, vec![("hat.open1".to_owned(), vec![46], Some(25))]);
}
