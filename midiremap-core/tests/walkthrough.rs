use std::collections::BTreeMap;

use midiremap_core::{
    convert, Canon, Catalog, ChannelScope, EngineMap, FallbackTally, Mapping, MissingDrums, Note,
    Overrides,
};
use midiremap_testkit::{event, hit_keys, off, on, smf, DRUMS, PPQ};
use midly::{
    num::{u24, u28},
    MetaMessage, TrackEvent, TrackEventKind,
};

const QUARTER: u32 = PPQ as u32;
const MICROS_PER_QUARTER_90BPM: u32 = 60_000_000 / 90;

fn walkthrough_smf(notes: &[Note]) -> Vec<u8> {
    let tempo = TrackEvent {
        delta: u28::new(0),
        kind: TrackEventKind::Meta(MetaMessage::Tempo(u24::from_int_lossy(
            MICROS_PER_QUARTER_90BPM,
        ))),
    };
    let hits = notes.iter().flat_map(|note| {
        [
            event(0, DRUMS, on(note.get())),
            event(QUARTER, DRUMS, off(note.get())),
        ]
    });
    smf(vec![std::iter::once(tempo).chain(hits).collect()])
}

enum Expected {
    Direct(Note),
    Fallback(Note),
    Dropped,
}

fn expected_resolution(canon: Canon, tgt: &EngineMap) -> Expected {
    if let Some(note) = tgt.encode(canon) {
        return Expected::Direct(note);
    }
    for &alt in canon.fallback_chain() {
        if let Some(note) = tgt.encode(alt) {
            return Expected::Fallback(note);
        }
    }
    Expected::Dropped
}

fn richest_engine(maps: &Catalog) -> &str {
    maps.ids()
        .max_by_key(|id| maps.get(id).unwrap().source_notes().len())
        .unwrap()
}

#[test]
fn ezdrummer2_is_the_richest_source_kit() {
    let maps = Catalog::builtin().unwrap();
    let src_id = richest_engine(&maps);
    assert_eq!(
        src_id, "ezdrummer2",
        "expected ezdrummer2 to have the most decodable notes"
    );
    assert_eq!(
        maps.get(src_id).unwrap().source_notes().len(),
        127,
        "walkthrough should cover every ezdrummer2 note"
    );
}

#[test]
fn walkthrough_maps_and_falls_back_correctly_through_every_target() {
    let maps = Catalog::builtin().unwrap();
    let src_id = richest_engine(&maps);
    let src = maps.get(src_id).unwrap();
    let notes: Vec<Note> = src.source_notes().iter().map(|d| d.note).collect();
    let midi = walkthrough_smf(&notes);

    for tgt_id in maps.ids() {
        let tgt = maps.get(tgt_id).unwrap();

        let mut expected_keys: Vec<u8> = Vec::new();
        let mut expected_fallback: BTreeMap<Canon, FallbackTally> = BTreeMap::new();
        let mut expected_dropped: BTreeMap<Canon, u32> = BTreeMap::new();
        for &note in &notes {
            let canon = src
                .decode(note)
                .unwrap_or_else(|| panic!("{src_id} note {note} must decode"));
            match expected_resolution(canon, tgt) {
                Expected::Direct(n) => expected_keys.push(n.get()),
                Expected::Fallback(n) => {
                    expected_keys.push(n.get());
                    expected_fallback
                        .entry(canon)
                        .or_insert(FallbackTally { note: n, count: 0 })
                        .count += 1;
                }
                Expected::Dropped => {
                    *expected_dropped.entry(canon).or_default() += 1;
                }
            }
        }

        let out = convert(
            &midi,
            &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();

        assert_eq!(
            hit_keys(&out.bytes),
            expected_keys,
            "{src_id} -> {tgt_id}: output notes must match direct/fallback resolution"
        );
        assert!(
            out.report.unmapped_source().next().is_none(),
            "{src_id} -> {tgt_id}: a kit's own notes are always decodable"
        );
        assert_eq!(
            out.report.fallback_used().collect::<Vec<_>>(),
            expected_fallback
                .iter()
                .map(|(&c, t)| (c, t))
                .collect::<Vec<_>>(),
            "{src_id} -> {tgt_id}: fallback report must match the resolver"
        );
        assert_eq!(
            out.report.dropped().collect::<BTreeMap<_, _>>(),
            expected_dropped,
            "{src_id} -> {tgt_id}: dropped report must match the resolver"
        );

        let kept = expected_keys.len() as u32;
        let dropped: u32 = expected_dropped.values().sum();
        assert_eq!(
            kept + dropped,
            notes.len() as u32,
            "{src_id} -> {tgt_id}: every hit is either kept or dropped"
        );
    }
}

#[test]
fn same_engine_conversion_is_all_direct() {
    let maps = Catalog::builtin().unwrap();
    let src_id = richest_engine(&maps);
    let src = maps.get(src_id).unwrap();
    let notes: Vec<Note> = src.source_notes().iter().map(|d| d.note).collect();
    let midi = walkthrough_smf(&notes);

    let out = convert(
        &midi,
        &Mapping::new(src, src, &Overrides::default(), MissingDrums::Nearest),
        ChannelScope::Auto,
    )
    .unwrap();

    assert_eq!(hit_keys(&out.bytes).len(), notes.len());
    assert!(out.report.unmapped_source().next().is_none());
    assert!(
        out.report.fallback_used().next().is_none(),
        "a kit always encodes its own canon slots directly"
    );
    assert!(out.report.dropped().next().is_none());
}

#[test]
fn general_midi_maps_the_standard_anchor_notes() {
    let maps = Catalog::builtin().unwrap();
    let gm = maps.get("general_midi").unwrap();
    let note = |key: &str| gm.encode(key.parse().unwrap()).map(Note::get);
    assert_eq!(note("kick.main"), Some(36));
    assert_eq!(note("snare1.hit"), Some(38));
    assert_eq!(note("snare1.sidestick"), Some(37));
    assert_eq!(note("hat.closed"), Some(42));
    assert_eq!(note("hat.pedal"), Some(44));
    assert_eq!(note("hat.open1"), Some(46));
    assert_eq!(note("crash.1.hit"), Some(49));
    assert_eq!(note("ride.1"), Some(51));
    assert_eq!(note("tom.floor1.hit"), Some(43));
}

#[test]
fn ride_bow_approximates_to_a_bow_tip_before_a_crash() {
    let catalog = Catalog::builtin().unwrap();
    let mapping = Mapping::new(
        catalog.get("addictive_drums2").unwrap(),
        catalog.get("ezdrummer").unwrap(),
        &Overrides::default(),
        MissingDrums::Nearest,
    );
    let ride = Note::new(45).unwrap();
    match mapping.translate(ride) {
        midiremap_core::Resolution::Resolved(r) => assert_eq!(r.note(), Note::new(51)),
        other => panic!("ride must resolve, got {other:?}"),
    }
}
