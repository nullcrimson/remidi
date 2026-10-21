use std::{
    collections::{BTreeMap, BTreeSet},
    sync::LazyLock,
};

use midiremap_core::{
    convert, note_name_rack, rack_file, Catalog, ChannelScope, FileStem, Mapping, MissingDrums,
    NonBlank, Note, Overrides, Packing, Unrecognized,
};
use midiremap_testkit::{drums, events, off, on};
use midly::MidiMessage;
use quick_xml::{events::Event, Reader};
use rayon::prelude::*;

const LEAD: u32 = 10;
const TAIL: u32 = 5;
const STEP: u32 = LEAD + TAIL;
const ENGINES: [&str; 5] = [
    "ggd_invasion",
    "ezdrummer",
    "superior_drummer3",
    "general_midi",
    "addictive_drums2",
];
const OVERRIDES: &str = r#"{
    "src": [
        { "note": 24, "canon": "snare1.hit" },
        { "note": 100, "canon": "china.1.hit" }
    ],
    "tgt": [{ "canon": "kick.main", "note": 35 }]
}"#;

static CATALOG: LazyLock<Catalog> = LazyLock::new(|| Catalog::builtin().unwrap());

#[derive(Debug, Default)]
struct Chain {
    id: String,
    name: String,
    keys: Vec<(String, String)>,
    pitch: Option<i16>,
    devices: usize,
}

/// The rack's chains, read back from its XML, with every id the file gives a parameter.
struct Read {
    chains: Vec<Chain>,
    ids: Vec<String>,
}

fn attr(e: &quick_xml::events::BytesStart, key: &str) -> Option<String> {
    e.attributes()
        .flatten()
        .find(|a| a.key.as_ref() == key)
        .map(|a| a.value.into_owned())
}

fn read(xml: &str) -> Read {
    let mut reader = Reader::from_str(xml);
    let mut stack: Vec<String> = Vec::new();
    let mut chains = Vec::new();
    let mut ids = Vec::new();
    loop {
        let (e, open) = match reader.read_event().unwrap() {
            Event::Start(e) => (e, true),
            Event::Empty(e) => (e, false),
            Event::End(_) => {
                stack.pop();
                continue;
            }
            Event::Eof => break,
            _ => continue,
        };
        let name = e.name().as_ref().to_owned();
        stack.push(name.clone());
        let path = stack.join("/");
        let value = attr(&e, "Value");
        if matches!(
            name.as_str(),
            "AutomationTarget" | "ModulationTarget" | "Pointee"
        ) {
            ids.push(attr(&e, "Id").unwrap());
        }
        if name == "MidiEffectBranchPreset" {
            chains.push(Chain {
                id: attr(&e, "Id").unwrap(),
                ..Chain::default()
            });
        }
        if let Some(chain) = chains.last_mut() {
            if path.ends_with("MidiEffectBranchPreset/Name") {
                chain.name = value.clone().unwrap();
            }
            if path.contains("ZoneSettings/KeyRange/") {
                chain.keys.push((name.clone(), value.clone().unwrap()));
            }
            if path.ends_with("DevicePresets/AbletonDevicePreset/Device") {
                chain.devices += 1;
            }
            if path.ends_with("MidiPitcher/Pitch/Manual") {
                chain.pitch = Some(value.unwrap().parse().unwrap());
            }
        }
        if !open {
            stack.pop();
        }
    }
    Read { chains, ids }
}

fn single_key(chain: &Chain) -> u8 {
    let key = chain.keys[0].1.clone();
    assert_eq!(
        chain.keys,
        ["Min", "Max", "CrossfadeMin", "CrossfadeMax"]
            .map(|k| (k.to_owned(), key.clone()))
            .to_vec(),
        "chain {} holds one key",
        chain.name
    );
    key.parse().unwrap()
}

fn through_rack(xml: &str) -> BTreeMap<u8, u8> {
    let rack = read(xml);
    let mut out = BTreeMap::new();
    for chain in &rack.chains {
        assert!(chain.devices <= 1, "chain {}", chain.name);
        let key = single_key(chain);
        let to = i16::from(key) + chain.pitch.unwrap_or(0);
        assert_ne!(chain.pitch, Some(0), "chain {} shifts by 0", chain.name);
        assert!(
            out.insert(key, u8::try_from(to).unwrap()).is_none(),
            "two chains hold {key}"
        );
    }
    out
}

fn mapping(src: &str, tgt: &str, ov: &Overrides, missing: MissingDrums) -> Mapping {
    Mapping::new(
        CATALOG.get(src).unwrap(),
        CATALOG.get(tgt).unwrap(),
        ov,
        missing,
    )
}

fn unedited(src: &str, tgt: &str, unrecognized: Unrecognized) -> Mapping {
    mapping(src, tgt, &Overrides::default(), MissingDrums::Nearest).with_unrecognized(unrecognized)
}

fn rack_xml(mapping: &Mapping) -> String {
    rack_file(mapping, None).xml
}

fn preset(name: &str) -> NonBlank {
    serde_json::from_value(serde_json::Value::from(name)).unwrap()
}

fn converted(mapping: &Mapping) -> BTreeMap<u8, u8> {
    let hits: Vec<_> = (0..128u8)
        .flat_map(|note| [(LEAD, on(note)), (TAIL, off(note))])
        .collect();
    let bytes = convert(&drums(&hits), mapping, ChannelScope::Auto)
        .unwrap()
        .bytes;
    let mut time = 0;
    let mut out = BTreeMap::new();
    for (delta, _, message) in events(&bytes, 0) {
        time += delta;
        if let MidiMessage::NoteOn { key, vel } = message {
            if vel.as_int() > 0 {
                out.insert(u8::try_from((time - LEAD) / STEP).unwrap(), key.as_int());
            }
        }
    }
    out
}

#[test]
fn a_remap_rack_plays_every_note_where_the_converter_puts_it() {
    for ov_json in ["{}", OVERRIDES] {
        let ov: Overrides = serde_json::from_str(ov_json).unwrap();
        for missing in [MissingDrums::Nearest, MissingDrums::Drop] {
            for unrecognized in [Unrecognized::Remove, Unrecognized::Keep] {
                ENGINES.par_iter().for_each(|&src| {
                    for tgt in ENGINES {
                        let mapping =
                            mapping(src, tgt, &ov, missing).with_unrecognized(unrecognized);
                        assert_eq!(
                            through_rack(&rack_xml(&mapping)),
                            converted(&mapping),
                            "{src} -> {tgt} ({missing}, {unrecognized}, overrides {ov_json})"
                        );
                    }
                });
            }
        }
    }
}

#[test]
fn a_kept_unknown_note_has_its_own_chain_and_no_device() {
    let src = CATALOG.get("ggd_invasion").unwrap();
    let rack = read(&rack_xml(&unedited(
        "ggd_invasion",
        "ezdrummer",
        Unrecognized::Keep,
    )));
    let kept: Vec<u8> = rack
        .chains
        .iter()
        .filter(|c| c.name == "Unknown, kept")
        .map(|c| {
            assert_eq!(c.devices, 0, "chain {}", c.id);
            single_key(c)
        })
        .collect();
    let unknown: Vec<u8> = Note::ALL
        .into_iter()
        .filter(|&note| src.decode(note).is_none())
        .map(Note::get)
        .collect();
    assert!(!unknown.is_empty());
    assert_eq!(kept, unknown);
}

#[test]
fn a_removed_unknown_note_has_no_chain() {
    let xml = rack_xml(&unedited("ggd_invasion", "ezdrummer", Unrecognized::Remove));
    assert!(read(&xml).chains.iter().all(|c| c.name != "Unknown, kept"));
}

#[test]
fn every_parameter_of_a_rack_has_its_own_id() {
    for unrecognized in [Unrecognized::Remove, Unrecognized::Keep] {
        let xml = rack_xml(&unedited("ggd_invasion", "ezdrummer", unrecognized));
        let ids = read(&xml).ids;
        let unique: BTreeSet<&String> = ids.iter().collect();
        assert!(ids.len() > 100, "{unrecognized}");
        assert_eq!(unique.len(), ids.len(), "{unrecognized}");
    }
}

#[test]
fn a_remap_rack_names_each_chain_after_its_drum_and_the_note_it_lands_on() {
    let xml = rack_xml(&unedited("general_midi", "ezdrummer", Unrecognized::Remove));
    let rack = read(&xml);
    let kick = rack.chains.iter().find(|c| single_key(c) == 36).unwrap();
    assert_eq!(kick.name, "Kick → 36");
    assert!(xml.contains(r#"<UserName Value="General MIDI → EZdrummer 3"/>"#));
}

#[test]
fn a_note_name_rack_names_every_note_an_engine_plays_and_moves_none() {
    for map in CATALOG.engines() {
        let rack = read(&note_name_rack(map));
        let named: Vec<(u8, String)> = rack
            .chains
            .iter()
            .map(|c| {
                assert_eq!(c.devices, 0, "{} {}", map.id(), c.name);
                (single_key(c), c.name.clone())
            })
            .collect();
        let played: Vec<(u8, String)> = map
            .source_notes()
            .into_iter()
            .map(|d| (d.note.get(), d.label))
            .collect();
        assert_eq!(named, played, "{}", map.id());
    }
}

#[test]
fn a_rack_numbers_its_chains_in_order_from_zero() {
    for (src, tgt, unrecognized) in [
        ("ggd_halpern", "ggd_invasion", Unrecognized::Remove),
        ("ggd_invasion", "ezdrummer", Unrecognized::Keep),
    ] {
        let xml = rack_xml(&unedited(src, tgt, unrecognized));
        let ids: Vec<String> = read(&xml).chains.into_iter().map(|c| c.id).collect();
        let expected: Vec<String> = (0..ids.len()).map(|i| i.to_string()).collect();
        assert!(ids.len() > 1, "{src} -> {tgt}");
        assert_eq!(ids, expected, "{src} -> {tgt}");
    }
}

#[test]
fn a_keep_rack_from_invasion_to_ezdrummer_holds_a_chain_for_every_note() {
    let xml = rack_xml(&unedited("ggd_invasion", "ezdrummer", Unrecognized::Keep));
    assert_eq!(read(&xml).chains.len(), 128);
}

#[test]
fn a_rack_file_counts_its_dropped_drums() {
    let mapping = mapping(
        "superior_drummer3",
        "general_midi",
        &Overrides::default(),
        MissingDrums::Drop,
    );
    let dropped = rack_file(&mapping, None).dropped;
    assert!(dropped > 0);
    assert_eq!(dropped, mapping.dropped_drums().count());
}

#[test]
fn a_rack_file_is_gzip_packed() {
    let file = rack_file(
        &unedited("ggd_invasion", "ezdrummer", Unrecognized::Remove),
        None,
    );
    assert_eq!(file.packing, Packing::Gzip);
}

#[test]
fn a_rack_file_is_named_after_the_pair() {
    let file = rack_file(
        &unedited("ggd_invasion", "ezdrummer", Unrecognized::Remove),
        None,
    );
    assert_eq!(file.file_name, "GetGood Drums Invasion to EZdrummer 3.adg");
}

#[test]
fn a_preset_rack_file_is_named_after_the_preset() {
    let file = rack_file(
        &unedited("ggd_invasion", "ezdrummer", Unrecognized::Remove),
        Some(&preset("Kit: toms/2")),
    );
    assert_eq!(file.file_name, "Kit- toms-2.adg");
}

#[test]
fn a_preset_name_that_cleans_to_nothing_falls_back_to_the_pair() {
    let file = rack_file(
        &unedited("ggd_invasion", "ezdrummer", Unrecognized::Remove),
        Some(&preset("...")),
    );
    assert_eq!(file.file_name, "GetGood Drums Invasion to EZdrummer 3.adg");
}

#[test]
fn every_engine_pair_has_a_file_stem() {
    let unnamed: Vec<String> = CATALOG
        .engines()
        .flat_map(|src| CATALOG.engines().map(move |tgt| (src, tgt)))
        .map(|(src, tgt)| format!("{} to {}", src.display_name(), tgt.display_name()))
        .filter(|stem| FileStem::parse(stem).is_none())
        .collect();
    assert!(unnamed.is_empty(), "{unnamed:?}");
}

#[test]
fn a_rack_is_a_live_11_preset_down_to_every_protection_number() {
    let xml = note_name_rack(CATALOG.get("ggd_invasion").unwrap());
    assert!(xml.contains(r#"MinorVersion="11.0_11202""#));
    let protections = xml.matches("<OverwriteProtectionNumber ").count();
    assert!(protections > 1);
    assert_eq!(
        xml.matches(r#"<OverwriteProtectionNumber Value="2818"/>"#)
            .count(),
        protections
    );
}

#[test]
fn a_rack_writes_no_setting_only_live_12_reads() {
    let xml = rack_xml(&unedited(
        "ggd_halpern",
        "ggd_invasion",
        Unrecognized::Remove,
    ));
    for tag in [
        "BreakoutIsExpanded",
        "MpePitchBendUsesTuning",
        "ViewData",
        "SourceHint",
    ] {
        assert!(!xml.contains(&format!("<{tag} ")), "{tag}");
    }
}

#[test]
fn a_rack_asks_live_to_name_the_midi_editor_rows_after_its_chains() {
    let xml = note_name_rack(CATALOG.get("ggd_invasion").unwrap());
    assert!(xml.contains(r#"<ShowsZonesInsteadOfNoteNames Value="true"/>"#));
}
