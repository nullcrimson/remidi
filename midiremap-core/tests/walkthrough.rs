use std::collections::BTreeMap;

use midiremap_core::{
    convert, Canon, Catalog, ChannelScope, EngineMap, FallbackTally, Mapping, MissingDrums, Note,
    Overrides,
};
use midiremap_testkit::{event, events, hit_keys, off, on, smf, DRUMS, PPQ};
use midly::{
    num::{u24, u28},
    MetaMessage, MidiMessage, Smf, Timing, TrackEvent, TrackEventKind,
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
    for alt in canon.fallback_chain() {
        if let Some(note) = tgt.encode(alt) {
            return Expected::Fallback(note);
        }
    }
    Expected::Dropped
}

fn richest_engine(maps: &Catalog) -> &str {
    maps.ids()
        .into_iter()
        .max_by_key(|id| maps.get(id).unwrap().source_notes().len())
        .unwrap()
}

#[test]
fn ezdrummer2_is_the_richest_source_kit() {
    let maps = Catalog::builtin();
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
fn walkthrough_is_ninety_bpm_quarter_notes_one_per_drum() {
    let maps = Catalog::builtin();
    let src = maps.get(richest_engine(&maps)).unwrap();
    let notes: Vec<Note> = src.source_notes().iter().map(|d| d.note).collect();
    let midi = walkthrough_smf(&notes);
    let smf = Smf::parse(&midi).unwrap();

    match smf.header.timing {
        Timing::Metrical(ppq) => assert_eq!(ppq.as_int(), PPQ),
        _ => panic!("expected metrical timing"),
    }
    let tempo = smf.tracks[0].iter().find_map(|ev| match ev.kind {
        TrackEventKind::Meta(MetaMessage::Tempo(t)) => Some(t.as_int()),
        _ => None,
    });
    assert_eq!(tempo, Some(MICROS_PER_QUARTER_90BPM));

    let ons: Vec<(u8, u32)> = events(&midi, 0)
        .into_iter()
        .filter_map(|(delta, _, message)| match message {
            MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => Some((key.as_int(), delta)),
            _ => None,
        })
        .collect();
    assert_eq!(ons.len(), notes.len());
    assert_eq!(ons[0].1, 0, "first hit lands on beat one");
    assert!(
        ons.iter().skip(1).all(|&(_, delta)| delta == 0),
        "each hit follows the previous quarter-note off"
    );
    assert_eq!(
        hit_keys(&midi),
        notes.iter().map(|n| n.get()).collect::<Vec<_>>(),
        "walkthrough visits every source note once, in order"
    );

    let dir = env!("CARGO_TARGET_TMPDIR");
    std::fs::write(format!("{dir}/walkthrough_{}.mid", src.id()), &midi).unwrap();
}

#[test]
fn walkthrough_maps_and_falls_back_correctly_through_every_target() {
    let maps = Catalog::builtin();
    let src_id = richest_engine(&maps);
    let src = maps.get(src_id).unwrap();
    let notes: Vec<Note> = src.source_notes().iter().map(|d| d.note).collect();
    let midi = walkthrough_smf(&notes);

    let mut target_ids = maps.ids();
    target_ids.sort_unstable();

    for tgt_id in target_ids {
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
            out.report.unmapped_source().is_empty(),
            "{src_id} -> {tgt_id}: a kit's own notes are always decodable"
        );
        assert_eq!(
            out.report.fallback_used(),
            &expected_fallback,
            "{src_id} -> {tgt_id}: fallback report must match the resolver"
        );
        assert_eq!(
            out.report.dropped(),
            &expected_dropped,
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
    let maps = Catalog::builtin();
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
    assert!(out.report.unmapped_source().is_empty());
    assert!(
        out.report.fallback_used().is_empty(),
        "a kit always encodes its own canon slots directly"
    );
    assert!(out.report.dropped().is_empty());
}

#[test]
fn walkthrough_hits_general_midi_anchor_notes() {
    let maps = Catalog::builtin();
    let gm = maps.get("general_midi").unwrap();
    for (key, note) in [
        ("kick.main", 36),
        ("snare1.hit", 38),
        ("snare1.sidestick", 37),
        ("hat.closed", 42),
        ("hat.pedal", 44),
        ("hat.open1", 46),
        ("crash.1.hit", 49),
        ("ride.1", 51),
        ("tom.floor1.hit", 43),
    ] {
        let canon: Canon = key.parse().unwrap();
        assert_eq!(
            gm.encode(canon).map(Note::get),
            Some(note),
            "general_midi must map {key} to note {note}"
        );
    }
}

#[test]
fn ride_bow_approximates_to_a_bow_tip_before_a_crash() {
    let catalog = Catalog::builtin();
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
