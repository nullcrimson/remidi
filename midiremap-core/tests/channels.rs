use midiremap_core::{
    convert, Catalog, Channel, ChannelScope, CodecError, Conversion, ConvertError, Converted,
    Mapping, MissingDrums, Overrides, Part, PartSet, Parts, Selection,
};
use midiremap_testkit::{cc, choke, events, off, on, silent_on, tracks, Ev, DRUMS};
use midly::num::u28;

const BASS: u8 = 1;

fn ggd_to_ezd(midi: &[u8], selection: impl Into<Selection>) -> Result<Converted, ConvertError> {
    let b = Catalog::builtin();
    let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
    convert(
        midi,
        &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
        selection,
    )
    .map(|c| c.done().expect("converted"))
}

fn ggd_to_ezd_auto(midi: &[u8]) -> Conversion {
    let b = Catalog::builtin();
    let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
    convert(
        midi,
        &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
        ChannelScope::Auto,
    )
    .unwrap()
}

fn listed<'p>(parts: impl IntoIterator<Item = &'p Part>) -> Vec<String> {
    parts.into_iter().map(ToString::to_string).collect()
}

fn bass_track() -> Vec<Ev> {
    vec![
        (0, BASS, on(24)),
        (0, BASS, on(99)),
        (0, BASS, cc()),
        (0, BASS, choke(24)),
        (10, BASS, off(24)),
        (0, BASS, off(99)),
    ]
}

fn drum_track_beside_a_bass_track() -> Vec<u8> {
    tracks(&[&[(0, DRUMS, on(24)), (10, DRUMS, off(24))], &bass_track()])
}

#[test]
fn auto_converts_the_track_with_channel_10_hits() {
    let midi = drum_track_beside_a_bass_track();
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (10, DRUMS, off(36))]
    );
}

#[test]
fn auto_leaves_tracks_without_channel_10_hits_untouched() {
    let midi = drum_track_beside_a_bass_track();
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(events(&out.bytes, 1), bass_track());
}

#[test]
fn auto_reports_no_unmapped_notes_for_untouched_tracks() {
    let midi = drum_track_beside_a_bass_track();
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert!(out.report.unmapped_source().next().is_none());
}

#[test]
fn auto_converts_channel_10_and_offers_the_other_channel_of_its_track() {
    let midi = tracks(&[&[(0, DRUMS, on(24)), (0, BASS, on(24)), (0, BASS, choke(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (0, BASS, on(24)), (0, BASS, choke(24))]
    );
    assert_eq!(listed(out.offers.iter().map(|o| &o.part)), ["1:1"]);
    assert_eq!(out.report.untouched(), 1);
}

#[test]
fn a_mjod_shaped_track_converts_channel_10_and_offers_channel_1() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (10, DRUMS, on(24)),
        (10, DRUMS, on(24)),
        (10, BASS, on(24)),
        (10, BASS, on(24)),
    ]]);
    let auto = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!((auto.report.converted(), auto.report.untouched()), (3, 2));
    assert_eq!(listed(&auto.picked), ["1:10"]);
    assert_eq!(listed(auto.offers.iter().map(|o| &o.part)), ["1:1"]);
}

#[test]
fn auto_asks_when_several_parts_have_hits_and_none_on_channel_10() {
    let midi = tracks(&[
        &[(0, DRUMS, silent_on(24)), (0, BASS, on(24))],
        &[(0, BASS, on(24))],
    ]);
    let Conversion::Ask { parts, .. } = ggd_to_ezd_auto(&midi) else {
        panic!("converted without asking");
    };
    assert_eq!(listed(parts.iter()), ["1:1", "2:1"]);
}

#[test]
fn auto_converts_the_one_part_of_a_file_without_channel_10() {
    let midi = tracks(&[&[(0, BASS, on(24)), (10, BASS, off(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, BASS, on(36)), (10, BASS, off(36))]
    );
}

#[test]
fn auto_asks_about_drums_split_over_tracks_on_one_channel() {
    let midi = tracks(&[
        &[(0, BASS, on(24))],
        &[(0, BASS, on(38))],
        &[(0, BASS, on(42))],
    ]);
    let Conversion::Ask { parts, .. } = ggd_to_ezd_auto(&midi) else {
        panic!("converted without asking");
    };
    assert_eq!(listed(parts.iter()), ["1:1", "2:1", "3:1"]);
}

#[test]
fn all_converts_every_channel_of_every_track() {
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All).unwrap();
    assert_eq!(events(&out.bytes, 0), vec![(0, DRUMS, on(36))]);
    assert_eq!(events(&out.bytes, 1), vec![(0, BASS, on(36))]);
}

#[test]
fn only_converts_the_named_channel() {
    let midi = tracks(&[&[(0, DRUMS, on(24)), (0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, "1".parse::<ChannelScope>().unwrap()).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(24)), (0, BASS, on(36))]
    );
}

#[test]
fn choke_aftertouch_follows_its_note() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (5, DRUMS, choke(24)),
        (5, DRUMS, off(24)),
    ]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![
            (0, DRUMS, on(36)),
            (5, DRUMS, choke(36)),
            (5, DRUMS, off(36))
        ]
    );
}

#[test]
fn choke_on_a_removed_note_is_removed_and_its_delta_folds_forward() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (10, DRUMS, choke(99)),
        (5, DRUMS, off(24)),
    ]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (15, DRUMS, off(36))]
    );
}

#[test]
fn choke_on_a_removed_note_is_not_reported_as_unmapped() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (10, DRUMS, choke(99)),
        (5, DRUMS, off(24)),
    ]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap();
    assert!(
        out.report.unmapped_source().next().is_none(),
        "aftertouch is not a hit"
    );
}

#[test]
fn a_folded_gap_past_the_delta_range_is_an_error() {
    let max = u28::max_value().as_int();
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (max, DRUMS, on(99)),
        (5, DRUMS, on(99)),
        (1, DRUMS, off(24)),
    ]]);
    assert!(matches!(
        ggd_to_ezd(&midi, ChannelScope::Auto),
        Err(ConvertError::Codec(CodecError::DeltaOverflow))
    ));
}

#[test]
fn channel_scope_parses_auto() {
    assert_eq!("auto".parse::<ChannelScope>().unwrap(), ChannelScope::Auto);
}

#[test]
fn channel_scope_parses_all() {
    assert_eq!("all".parse::<ChannelScope>().unwrap(), ChannelScope::All);
}

#[test]
fn channel_scope_parses_the_drum_channel() {
    assert_eq!(
        "10".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(Channel::DRUMS)
    );
}

#[test]
fn channel_scope_parses_the_last_channel() {
    assert_eq!(
        "16".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(Channel::new(16).unwrap())
    );
}

#[test]
fn channel_scope_rejects_channel_zero() {
    assert!("0".parse::<ChannelScope>().is_err());
}

#[test]
fn channel_scope_rejects_channel_seventeen() {
    assert!("17".parse::<ChannelScope>().is_err());
}

#[test]
fn channel_scope_rejects_a_letter() {
    assert!("x".parse::<ChannelScope>().is_err());
}

#[test]
fn channel_scope_rejects_the_empty_text() {
    assert!("".parse::<ChannelScope>().is_err());
}

#[test]
fn channel_scope_rejects_a_negative_number() {
    assert!("-1".parse::<ChannelScope>().is_err());
}

#[test]
fn untouched_counts_hits_in_skipped_tracks() {
    let bass: &[Ev] = &[
        (0, BASS, on(24)),
        (0, BASS, silent_on(24)),
        (0, BASS, choke(24)),
        (0, BASS, off(24)),
        (0, BASS, on(99)),
    ];
    let midi = tracks(&[&[(0, DRUMS, on(24))], bass]);
    assert_eq!(
        ggd_to_ezd(&midi, ChannelScope::Auto)
            .unwrap()
            .report
            .untouched(),
        2
    );
}

#[test]
fn untouched_counts_hits_on_rejected_channels() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, DRUMS, silent_on(24)),
        (0, DRUMS, off(24)),
        (0, BASS, on(24)),
    ]]);
    let out = ggd_to_ezd(&midi, "1".parse::<ChannelScope>().unwrap()).unwrap();
    assert_eq!(out.report.untouched(), 1);
}

#[test]
fn nothing_is_untouched_when_every_channel_is_converted() {
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All).unwrap();
    assert_eq!(out.report.untouched(), 0);
}

#[test]
fn nothing_is_untouched_in_the_serialized_report_when_every_channel_is_converted() {
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All).unwrap();
    let json = serde_json::to_value(&out.report).unwrap();
    assert_eq!(json["untouched"], 0);
}

#[test]
fn converted_counts_hits_written_to_the_output_under_auto() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, DRUMS, silent_on(24)),
        (0, DRUMS, on(99)),
        (0, BASS, on(24)),
    ]]);
    let report = ggd_to_ezd(&midi, ChannelScope::Auto).unwrap().report;
    assert_eq!((report.converted(), report.untouched()), (1, 1));
}

#[test]
fn converted_counts_nothing_when_the_named_channel_has_no_hits() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, DRUMS, silent_on(24)),
        (0, DRUMS, on(99)),
        (0, BASS, on(24)),
    ]]);
    assert_eq!(
        ggd_to_ezd(&midi, "2".parse::<ChannelScope>().unwrap())
            .unwrap()
            .report
            .converted(),
        0
    );
}

fn parts(items: &[&str]) -> Parts {
    Parts::new(
        items
            .iter()
            .map(|p| p.parse::<Part>().unwrap())
            .collect::<PartSet>(),
    )
    .unwrap()
}

fn ggd_to_ezd_parts(midi: &[u8], picked: &[&str]) -> Result<Converted, ConvertError> {
    ggd_to_ezd(midi, parts(picked))
}

#[test]
fn picked_parts_convert_and_every_other_part_stays_as_it_was() {
    let midi = drum_track_beside_a_bass_track();
    let out = ggd_to_ezd_parts(&midi, &["2:1"]).unwrap();
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(24)), (10, DRUMS, off(24))]
    );
    assert_eq!(events(&out.bytes, 1)[0], (0, BASS, on(36)));
}

#[test]
fn two_channels_picked_in_one_track_both_convert() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, BASS, on(24)),
        (0, 11, on(24)),
        (10, DRUMS, off(24)),
        (0, BASS, off(24)),
        (0, 11, off(24)),
    ]]);
    let out = ggd_to_ezd_parts(&midi, &["1:10", "1:1"]).unwrap();
    assert_eq!(
        events(&out.bytes, 0)[..3],
        [(0, DRUMS, on(36)), (0, BASS, on(36)), (0, 11, on(24))]
    );
}

fn refused_part(midi: &[u8], picked: &str) -> Option<String> {
    match ggd_to_ezd_parts(midi, &[picked]) {
        Err(ConvertError::NoSuchPart(part)) => Some(part.to_string()),
        Err(ConvertError::Codec(_)) | Ok(_) => None,
    }
}

#[test]
fn a_picked_channel_its_track_lacks_is_refused() {
    let midi = drum_track_beside_a_bass_track();
    assert_eq!(refused_part(&midi, "1:1").as_deref(), Some("1:1"));
}

#[test]
fn a_picked_track_past_the_end_of_the_file_is_refused() {
    let midi = drum_track_beside_a_bass_track();
    assert_eq!(refused_part(&midi, "3:10").as_deref(), Some("3:10"));
}
