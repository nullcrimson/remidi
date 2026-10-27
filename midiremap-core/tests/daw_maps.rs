use std::{collections::BTreeSet, sync::LazyLock};

use midiremap_core::{Catalog, Daw, EngineMap, Family};
use plist::{Dictionary, Value};
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

fn logic_pattern(file: &str) -> Value {
    Value::from_reader_xml(file.as_bytes()).unwrap()
}

fn logic_rows(file: &str) -> Vec<Dictionary> {
    logic_pattern(file)
        .as_dictionary()
        .and_then(|d| d.get("kSessionDataKey")?.as_dictionary())
        .and_then(|d| d.get("kSequenceDataKey")?.as_dictionary())
        .and_then(|d| d.get("kStepSequenceRowsKey")?.as_array())
        .unwrap()
        .iter()
        .map(|row| row.as_dictionary().unwrap().clone())
        .collect()
}

fn int(row: &Dictionary, key: &str) -> i64 {
    row.get(key).and_then(Value::as_signed_integer).unwrap()
}

fn row_note_settings(row: &Dictionary) -> &Dictionary {
    row.get("propertyNodeKey")
        .and_then(Value::as_dictionary)
        .and_then(|d| d.get("kStepSequenceNoteKey")?.as_dictionary())
        .unwrap()
}

fn row_note(row: &Dictionary) -> u8 {
    u8::try_from(int(row, "kStepSequenceNoteIDKey") >> 8).unwrap()
}

fn logic_notes(file: &str) -> Named {
    let mut named: Named = logic_rows(file)
        .iter()
        .map(|row| {
            let name = row
                .get("kStepSequenceRowNameKey")
                .and_then(Value::as_string);
            (row_note(row), name.unwrap().to_owned())
        })
        .collect();
    named.sort();
    named
}

fn read_back(daw: Daw, file: &str) -> Named {
    match daw {
        Daw::Reaper => reaper_notes(file),
        Daw::Cubase => cubase_notes(file),
        Daw::StudioOne => studio_one_notes(file),
        Daw::AbletonLive => ableton_notes(file),
        Daw::Logic => logic_notes(file),
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

#[test]
fn a_logic_row_plays_the_note_its_id_names() {
    for row in logic_rows(&Daw::Logic.drum_map(invasion(), CREDIT)) {
        let settings = row_note_settings(&row);
        let pitch = int(settings, "kStepSequenceNoteKey")
            + 12 * int(settings, "kStepSequenceOctaveTransposeKey")
            + int(settings, "kStepSequenceNoteTransposeKey");
        assert_eq!(pitch, i64::from(row_note(&row)));
    }
}

#[test]
fn logic_rows_keep_their_notes_off_the_scale() {
    for row in logic_rows(&Daw::Logic.drum_map(invasion(), CREDIT)) {
        let quantize = row_note_settings(&row).get("kStepSequenceNoteScaleQuantizeKey");
        assert_eq!(quantize.and_then(Value::as_boolean), Some(false));
    }
}

#[test]
fn logic_rows_come_family_by_family() {
    let map = invasion();
    let family_of = |note: u8| {
        map.source_notes()
            .into_iter()
            .find(|d| d.note.get() == note)
            .map(|d| d.entry.family())
            .unwrap()
    };
    let families: Vec<Family> = logic_rows(&Daw::Logic.drum_map(map, CREDIT))
        .iter()
        .map(|row| family_of(row_note(row)))
        .collect();
    assert!(families.is_sorted());
}

fn key_paths(value: &Value, at: &str, out: &mut BTreeSet<String>) {
    match value {
        Value::Dictionary(d) => {
            for (key, inner) in d {
                let step = if key.len() == 36 && key.matches('-').count() == 4 {
                    "*"
                } else {
                    key.as_str()
                };
                let path = if at.is_empty() {
                    step.to_owned()
                } else {
                    format!("{at}/{step}")
                };
                key_paths(inner, &path, out);
                out.insert(path);
            }
        }
        Value::Array(items) => {
            for item in items {
                key_paths(item, &format!("{at}[]"), out);
            }
        }
        _ => {}
    }
}

#[test]
fn the_logic_template_writes_only_keys_a_logic_template_has() {
    let mut written = BTreeSet::new();
    key_paths(
        &logic_pattern(&Daw::Logic.drum_map(invasion(), CREDIT)),
        "",
        &mut written,
    );
    let logic: BTreeSet<String> = include_str!("golden/logic-skeleton.txt")
        .lines()
        .map(str::to_owned)
        .collect();
    let extra: Vec<&String> = written.difference(&logic).collect();
    assert!(extra.is_empty(), "{extra:?}");
}
