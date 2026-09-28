use midiremap_core::{
    convert, Catalog, Channel, ChannelScope, Converted, Mapping, MissingDrums, Overrides,
};
use midiremap_testkit::{cc, choke, events, off, on, silent_on, tracks, Ev, DRUMS};
use midly::num::u28;

const BASS: u8 = 1;

fn ggd_to_ezd(midi: &[u8], scope: ChannelScope) -> Converted {
    let b = Catalog::builtin();
    let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
    convert(
        midi,
        &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
        scope,
    )
    .unwrap()
}

#[test]
fn auto_leaves_tracks_without_channel_10_hits_untouched() {
    let bass: &[Ev] = &[
        (0, BASS, on(24)),
        (0, BASS, on(99)),
        (0, BASS, cc()),
        (0, BASS, choke(24)),
        (10, BASS, off(24)),
        (0, BASS, off(99)),
    ];
    let midi = tracks(&[&[(0, DRUMS, on(24)), (10, DRUMS, off(24))], bass]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (10, DRUMS, off(36))]
    );
    assert_eq!(events(&out.bytes, 1), bass);
    assert!(out.report.unmapped_source().is_empty());
}

#[test]
fn auto_converts_every_channel_of_a_track_with_channel_10_hits() {
    let midi = tracks(&[&[(0, DRUMS, on(24)), (0, BASS, on(24)), (0, BASS, choke(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (0, BASS, on(36)), (0, BASS, choke(36))]
    );
}

#[test]
fn default_scope_is_auto() {
    assert_eq!(ChannelScope::default(), ChannelScope::Auto);
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::default());
    assert_eq!(events(&out.bytes, 0), vec![(0, DRUMS, on(36))]);
    assert_eq!(events(&out.bytes, 1), vec![(0, BASS, on(24))]);
}

#[test]
fn auto_converts_every_track_without_channel_10_hits() {
    let midi = tracks(&[
        &[(0, DRUMS, silent_on(24)), (0, BASS, on(24))],
        &[(0, BASS, on(24))],
    ]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, silent_on(36)), (0, BASS, on(36))]
    );
    assert_eq!(events(&out.bytes, 1), vec![(0, BASS, on(36))]);
}

#[test]
fn all_converts_every_channel_of_every_track() {
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All);
    assert_eq!(events(&out.bytes, 0), vec![(0, DRUMS, on(36))]);
    assert_eq!(events(&out.bytes, 1), vec![(0, BASS, on(36))]);
}

#[test]
fn only_converts_the_named_channel() {
    let midi = tracks(&[&[(0, DRUMS, on(24)), (0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, "1".parse().unwrap());
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
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
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
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (15, DRUMS, off(36))]
    );
    assert!(
        out.report.unmapped_source().is_empty(),
        "aftertouch is not a hit"
    );
}

#[test]
fn folded_deltas_saturate_instead_of_wrapping() {
    let max = u28::max_value().as_int();
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (max, DRUMS, on(99)),
        (5, DRUMS, on(99)),
        (1, DRUMS, off(24)),
    ]]);
    let out = ggd_to_ezd(&midi, ChannelScope::Auto);
    assert_eq!(
        events(&out.bytes, 0),
        vec![(0, DRUMS, on(36)), (max, DRUMS, off(36))]
    );
}

#[test]
fn channel_scope_parses_cli_values() {
    assert_eq!("auto".parse::<ChannelScope>().unwrap(), ChannelScope::Auto);
    assert_eq!("all".parse::<ChannelScope>().unwrap(), ChannelScope::All);
    assert_eq!(
        "10".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(Channel::DRUMS)
    );
    assert_eq!(
        "16".parse::<ChannelScope>().unwrap(),
        ChannelScope::Only(Channel::new(16).unwrap())
    );
    for bad in ["0", "17", "x", "", "-1"] {
        assert!(bad.parse::<ChannelScope>().is_err(), "{bad:?}");
    }
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
    assert_eq!(ggd_to_ezd(&midi, ChannelScope::Auto).report.untouched(), 2);
}

#[test]
fn untouched_counts_hits_on_rejected_channels() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, DRUMS, silent_on(24)),
        (0, DRUMS, off(24)),
        (0, BASS, on(24)),
    ]]);
    let out = ggd_to_ezd(&midi, "1".parse().unwrap());
    assert_eq!(out.report.untouched(), 1);
}

#[test]
fn nothing_is_untouched_when_every_channel_is_converted() {
    let midi = tracks(&[&[(0, DRUMS, on(24))], &[(0, BASS, on(24))]]);
    let out = ggd_to_ezd(&midi, ChannelScope::All);
    assert_eq!(out.report.untouched(), 0);
    let json = serde_json::to_value(&out.report).unwrap();
    assert_eq!(json["untouched"], 0);
}

#[test]
fn converted_counts_hits_written_to_the_output() {
    let midi = tracks(&[&[
        (0, DRUMS, on(24)),
        (0, DRUMS, silent_on(24)),
        (0, DRUMS, on(99)),
        (0, BASS, on(24)),
    ]]);
    assert_eq!(ggd_to_ezd(&midi, ChannelScope::Auto).report.converted(), 2);
    assert_eq!(
        ggd_to_ezd(&midi, "2".parse().unwrap()).report.converted(),
        0
    );
}
