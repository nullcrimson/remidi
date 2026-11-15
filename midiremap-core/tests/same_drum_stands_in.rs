use midiremap_core::{Catalog, Mapping, MissingDrums, Note};
use support::k;

pub mod support;

#[test]
fn a_bfd3_crash_bell_plays_on_the_addictive_drums_ride_bell_its_own_ride_leaves_free() {
    let catalog = Catalog::shared();
    let mapping = Mapping::new(
        catalog.get("bfd3").unwrap(),
        catalog.get("addictive_drums2").unwrap(),
        &Default::default(),
        MissingDrums::Nearest,
    );
    assert_eq!(
        mapping
            .resolve_canon(k("crash.1.bell"))
            .note()
            .map(Note::get),
        Some(85),
        "ride 2's bell; ride 1's plays BFD3's own ride bell"
    );
}

#[test]
fn guitar_pro_closed_hat_plays_on_the_benny_greb_closed_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.closed"), Some(43));
}

#[test]
fn guitar_pro_first_open_hat_plays_on_the_benny_greb_first_open_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.open1"), Some(46));
}

#[test]
fn guitar_pro_second_open_hat_plays_on_the_benny_greb_second_open_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.open2"), Some(48));
}

#[test]
fn guitar_pro_pedal_hat_plays_on_the_benny_greb_pedal_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.pedal"), Some(53));
}

#[test]
fn the_duplantier_babar_plays_on_the_first_stack_then_the_first_china() {
    let catalog = Catalog::shared();
    let babar_on = |tgt: &str| {
        Mapping::new(
            catalog.get("mixwave_duplantier").unwrap(),
            catalog.get(tgt).unwrap(),
            &Default::default(),
            MissingDrums::Nearest,
        )
        .resolve_canon(k("stack.2.hit"))
        .note()
    };
    let d2 = catalog.get("mixwave_duplantier2").unwrap();
    assert_eq!(babar_on("mixwave_duplantier2"), d2.encode(k("stack.1.hit")));
    assert_eq!(babar_on("general_midi").map(Note::get), Some(52));
}

#[test]
fn every_general_midi_tom_plays_on_a_bfd3_slot_its_default_kit_fills() {
    let catalog = Catalog::shared();
    let mapping = Mapping::new(
        catalog.get("general_midi").unwrap(),
        catalog.get("bfd3").unwrap(),
        &Default::default(),
        MissingDrums::Nearest,
    );
    let lands = |note: u8| {
        mapping
            .played()
            .find(|(n, _)| n.get() == note)
            .and_then(|(_, outcome)| outcome.note())
            .map(Note::get)
    };
    let toms: Vec<Option<u8>> = [50, 48, 47, 45, 43, 41].into_iter().map(lands).collect();
    assert_eq!(
        toms,
        [Some(38), Some(35), Some(35), Some(35), Some(31), Some(31)]
    );
}

fn guitar_pro_to_benny_greb() -> impl Fn(&'static str) -> Option<u8> {
    let catalog = Catalog::shared();
    let mapping = Mapping::new(
        catalog.get("guitar_pro").unwrap(),
        catalog.get("ggd_bennygreb").unwrap(),
        &Default::default(),
        MissingDrums::Drop,
    );
    move |src| mapping.resolve_canon(k(src)).note().map(Note::get)
}
