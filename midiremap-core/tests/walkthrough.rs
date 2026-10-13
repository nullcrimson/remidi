use midiremap_core::{
    convert, Catalog, ChannelScope, Converted, Mapping, MissingDrums, Note, Overrides,
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
}

#[test]
fn the_richest_source_kit_decodes_127_notes() {
    let maps = Catalog::builtin().unwrap();
    let src_id = richest_engine(&maps);
    assert_eq!(
        maps.get(src_id).unwrap().source_notes().len(),
        127,
        "walkthrough should cover every ezdrummer2 note"
    );
}

const RECORDED: &str = include_str!("golden/walkthrough.txt");

fn listed<T>(items: impl Iterator<Item = T>, show: impl Fn(T) -> String) -> String {
    items.map(show).collect::<Vec<_>>().join(" ")
}

fn outcome_line(tgt_id: &str, out: &Converted) -> String {
    format!(
        "{tgt_id} | keys {} | approximated {} | dropped {} | unrecognized {}",
        listed(hit_keys(&out.bytes).into_iter(), |key| key.to_string()),
        listed(out.report.fallback_used(), |(canon, tally)| format!(
            "{canon}>{}x{}",
            tally.note, tally.count
        )),
        listed(out.report.dropped(), |(canon, count)| format!(
            "{canon}x{count}"
        )),
        listed(out.report.unmapped_source(), |(note, count)| format!(
            "{note}x{count}"
        )),
    )
}

type LinePair<'a> = (Option<&'a str>, Option<&'a str>);

fn first_difference<'a>(actual: &'a [String], recorded: &'a str) -> Option<LinePair<'a>> {
    let mut actual = actual.iter().map(String::as_str);
    let mut recorded = recorded.lines();
    loop {
        match (actual.next(), recorded.next()) {
            (None, None) => return None,
            (got, want) if got != want => return Some((got, want)),
            _ => {}
        }
    }
}

#[test]
fn every_note_of_the_richest_kit_lands_on_every_target_as_recorded() {
    let maps = Catalog::builtin().unwrap();
    let src = maps.get(richest_engine(&maps)).unwrap();
    let notes: Vec<Note> = src.source_notes().iter().map(|d| d.note).collect();
    let midi = walkthrough_smf(&notes);
    let actual: Vec<String> = maps
        .ids()
        .map(|tgt_id| {
            let mapping = Mapping::new(
                src,
                maps.get(tgt_id).unwrap(),
                &Overrides::default(),
                MissingDrums::Nearest,
            );
            outcome_line(
                tgt_id,
                &convert(&midi, &mapping, ChannelScope::Auto).unwrap(),
            )
        })
        .collect();
    assert_eq!(
        first_difference(&actual, RECORDED),
        None,
        "left is the conversion, right is tests/golden/walkthrough.txt"
    );
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
    let ride = catalog
        .get("addictive_drums2")
        .unwrap()
        .decode(Note::new(45).unwrap())
        .unwrap();
    assert_eq!(mapping.resolve_canon(ride).note(), Note::new(51));
}
