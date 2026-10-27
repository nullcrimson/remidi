use std::{collections::BTreeSet, sync::LazyLock};

use midiremap_core::{Catalog, Daw, EngineMap};
use roxmltree::{Document, Node};

mod xml_path;

type Named = Vec<(u8, String)>;

fn played(map: &EngineMap) -> Named {
    map.source_notes()
        .into_iter()
        .map(|d| (d.note.get(), d.entry.label().to_owned()))
        .collect()
}

fn step(node: Node) -> String {
    let name = node.tag_name().name();
    match node.attribute("name") {
        Some(v) if name != "Music.PitchName" => format!("{name}[{v}]"),
        _ => name.to_owned(),
    }
}

fn path(node: Node) -> String {
    xml_path::path(node, step)
}

/// The attribute `key` of every element at `at`, in document order.
fn values(xml: &str, at: &str, key: &str) -> Vec<String> {
    let doc = Document::parse(xml).unwrap();
    doc.descendants()
        .filter(|n| n.is_element() && path(*n) == at)
        .map(|n| n.attribute(key).unwrap().to_owned())
        .collect()
}

fn reaper_notes(text: &str) -> Named {
    text.lines()
        .filter(|l| !l.starts_with('#'))
        .map(|l| {
            let (note, name) = l.split_once(' ').unwrap();
            (note.parse().unwrap(), name.to_owned())
        })
        .collect()
}

fn studio_one_notes(xml: &str) -> Named {
    let at = "Music.PitchNameList/Music.PitchName";
    values(xml, at, "pitch")
        .into_iter()
        .map(|pitch| pitch.parse().unwrap())
        .zip(values(xml, at, "name"))
        .collect()
}

fn cubase_values(xml: &str, at: &str) -> Vec<String> {
    values(xml, at, "value")
}

fn cubase_notes(xml: &str) -> Named {
    let notes = cubase_values(xml, "DrumMap/list[Map]/item/int[INote]");
    let names = cubase_values(xml, "DrumMap/list[Map]/item/string[Name]");
    notes
        .into_iter()
        .zip(names)
        .filter(|(_, name)| name != "---")
        .map(|(note, name)| (note.parse().unwrap(), name))
        .collect()
}

fn chain_values(xml: &str, field: &str) -> Vec<String> {
    values(
        xml,
        &format!("Ableton/GroupDevicePreset/BranchPresets/MidiEffectBranchPreset/{field}"),
        "Value",
    )
}

fn ableton_notes(xml: &str) -> Named {
    chain_values(xml, "ZoneSettings/KeyRange/Min")
        .into_iter()
        .map(|note| note.parse().unwrap())
        .zip(chain_values(xml, "Name"))
        .collect()
}

fn read_back(daw: Daw, file: &str) -> Named {
    match daw {
        Daw::Reaper => reaper_notes(file),
        Daw::Cubase => cubase_notes(file),
        Daw::StudioOne => studio_one_notes(file),
        Daw::AbletonLive => ableton_notes(file),
    }
}

static CATALOG: LazyLock<Catalog> = LazyLock::new(Catalog::builtin);
const CREDIT: &str = "drumverter.com";

fn invasion() -> &'static EngineMap {
    CATALOG.get("ggd_invasion").unwrap()
}

#[test]
fn every_file_names_exactly_the_notes_each_engine_plays() {
    for map in CATALOG.engines() {
        for &daw in Daw::ALL {
            assert_eq!(
                read_back(daw, &daw.drum_map(map, CREDIT)),
                played(map),
                "{} {}",
                map.id(),
                daw.key()
            );
        }
    }
}

#[test]
fn the_cubase_map_lists_all_128_notes() {
    let file = Daw::Cubase.drum_map(invasion(), CREDIT);
    let notes = cubase_values(&file, "DrumMap/list[Map]/item/int[INote]");
    let expected: Vec<String> = (0..=127).map(|n: u8| n.to_string()).collect();
    assert_eq!(notes, expected);
}

#[test]
fn the_cubase_map_sends_each_note_out_unchanged() {
    let file = Daw::Cubase.drum_map(invasion(), CREDIT);
    assert_eq!(
        cubase_values(&file, "DrumMap/list[Map]/item/int[INote]"),
        cubase_values(&file, "DrumMap/list[Map]/item/int[ONote]")
    );
}

#[test]
fn the_cubase_order_puts_played_notes_first_and_holds_every_note_once() {
    let map = invasion();
    let order: Vec<u8> = cubase_values(
        &Daw::Cubase.drum_map(map, CREDIT),
        "DrumMap/list[Order]/item",
    )
    .iter()
    .map(|v| v.parse().unwrap())
    .collect();
    let played: Vec<u8> = played(map).into_iter().map(|(n, _)| n).collect();
    assert_eq!(&order[..played.len()], played.as_slice());
    assert_eq!(order.iter().collect::<BTreeSet<_>>().len(), 128);
}

#[test]
fn the_cubase_map_has_the_shape_cubase_saves() {
    let file = Daw::Cubase.drum_map(invasion(), CREDIT);
    let doc = Document::parse(&file).unwrap();
    let shape: BTreeSet<String> = doc
        .descendants()
        .filter(Node::is_element)
        .map(|n| {
            let mut keys: Vec<&str> = n.attributes().map(|a| a.name()).collect();
            keys.sort_unstable();
            format!("{} {{{}}}", path(n), keys.join(","))
        })
        .collect();
    let reference: BTreeSet<String> = include_str!("golden/cubase-skeleton.txt")
        .lines()
        .map(str::to_owned)
        .collect();
    assert_eq!(shape, reference);
}

#[test]
fn the_cubase_map_is_named_after_the_engine() {
    let file = Daw::Cubase.drum_map(invasion(), CREDIT);
    assert_eq!(
        cubase_values(&file, "DrumMap/string[Name]"),
        ["GetGood Drums Invasion"]
    );
}

#[test]
fn names_survive_markup_characters() {
    let map = EngineMap::from_json(
        r#"{"id":"odd","name":"Odd","short_name":"Rock & <Roll> \"Kit\"","notes":[{"note":36,"canon":"kick.main","primary":true}]}"#,
    )
    .unwrap();
    let file = Daw::Cubase.drum_map(&map, CREDIT);
    assert_eq!(
        cubase_values(&file, "DrumMap/string[Name]"),
        [r#"Rock & <Roll> "Kit""#]
    );
    assert!(Daw::Reaper
        .drum_map(&map, CREDIT)
        .contains("# Rock & <Roll> \"Kit\" (drumverter.com)"));
}

#[test]
fn files_match_the_recorded_invasion_maps() {
    let map = invasion();
    assert_eq!(
        Daw::Reaper.drum_map(map, CREDIT),
        include_str!("golden/ggd_invasion.txt")
    );
    assert_eq!(
        Daw::Cubase.drum_map(map, CREDIT),
        include_str!("golden/ggd_invasion.drm")
    );
    assert_eq!(
        Daw::StudioOne.drum_map(map, CREDIT),
        include_str!("golden/ggd_invasion.pitchlist")
    );
}

#[test]
fn each_daw_has_its_own_key_and_extension() {
    let keys: BTreeSet<&str> = Daw::ALL.iter().map(|d| d.key()).collect();
    let extensions: BTreeSet<&str> = Daw::ALL.iter().map(|d| d.extension()).collect();
    assert_eq!(keys.len(), Daw::ALL.len());
    assert_eq!(extensions.len(), Daw::ALL.len());
}
