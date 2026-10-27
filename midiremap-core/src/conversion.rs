use crate::{
    channel::ChannelScope,
    midi::{self, CodecError},
    report::Report,
    rewrite::rewrite,
    translate::Mapping,
};

pub struct Converted {
    pub bytes: Vec<u8>,
    pub report: Report,
}

/// Converts a standard MIDI file through `mapping`, rewriting the channels `scope` selects.
pub fn convert(
    midi: &[u8],
    mapping: &Mapping,
    scope: ChannelScope,
) -> Result<Converted, CodecError> {
    let (smf, report) = rewrite(midi::parse(midi)?, mapping, scope)?;
    let bytes = midi::write(&smf)?;
    Ok(Converted { bytes, report })
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, events, hit_keys, off, on};
    use midly::{num::u7, MidiMessage};

    use super::*;
    use crate::{
        canon::Canon, catalog::Catalog, note::n, overrides::Overrides, report::FallbackTally,
        resolution::MissingDrums, translate::Unrecognized,
    };

    fn convert_ids(mid: &[u8], src_id: &str, tgt_id: &str) -> Converted {
        convert_ids_with(mid, src_id, tgt_id, MissingDrums::Nearest)
    }

    fn convert_ids_with(
        mid: &[u8],
        src_id: &str,
        tgt_id: &str,
        missing: MissingDrums,
    ) -> Converted {
        let b = Catalog::builtin().unwrap();
        let src = b.get(src_id).unwrap();
        let tgt = b.get(tgt_id).unwrap();
        convert(
            mid,
            &Mapping::new(src, tgt, &Overrides::default(), missing),
            ChannelScope::Auto,
        )
        .unwrap()
    }

    fn convert_edited(mid: &[u8], overrides: &str) -> Converted {
        let b = Catalog::builtin().unwrap();
        let src = b.get("ggd_invasion").unwrap();
        let tgt = b.get("ezdrummer").unwrap();
        let overrides: Overrides = serde_json::from_str(overrides).unwrap();
        convert(
            mid,
            &Mapping::new(src, tgt, &overrides, MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap()
    }

    fn drop_a_swapped_china() -> Converted {
        convert_ids_with(
            &drums(&[(0, on(24)), (10, off(24)), (0, on(65)), (48, off(65))]),
            "ggd_invasion",
            "ezdrummer",
            MissingDrums::Drop,
        )
    }

    #[test]
    fn drop_leaves_a_swapped_china_out_of_the_output() {
        let out = drop_a_swapped_china();
        assert_eq!(hit_keys(&out.bytes), vec![36]);
    }

    #[test]
    fn drop_reports_the_swapped_china_as_dropped() {
        let out = drop_a_swapped_china();
        let china = "china.1.hit".parse::<Canon>().unwrap();
        assert_eq!(out.report.dropped().collect::<Vec<_>>(), [(china, 1)]);
    }

    #[test]
    fn drop_uses_no_fallback_for_a_swapped_china() {
        let out = drop_a_swapped_china();
        assert!(out.report.fallback_used().next().is_none());
    }

    #[test]
    fn drop_counts_only_the_kept_note_as_converted() {
        let out = drop_a_swapped_china();
        assert_eq!(out.report.converted(), 1);
    }

    #[test]
    fn lr_kicks_collide_to_one_note() {
        let out = convert_ids(
            &drums(&[(0, on(23)), (10, off(23)), (0, on(24)), (10, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(hit_keys(&out.bytes), vec![36, 36]);
    }

    fn convert_china_one() -> Converted {
        convert_ids(
            &drums(&[(0, on(65)), (48, off(65))]),
            "ggd_invasion",
            "ezdrummer",
        )
    }

    #[test]
    fn china1_falls_back_to_crash() {
        let out = convert_china_one();
        assert_eq!(hit_keys(&out.bytes), vec![86]);
    }

    #[test]
    fn china1_fallback_is_reported() {
        let out = convert_china_one();
        assert_eq!(
            out.report.fallback_used().collect::<Vec<_>>(),
            [(
                "china.1.hit".parse::<Canon>().unwrap(),
                &FallbackTally {
                    stand_in: "crash.1.hit".parse::<Canon>().unwrap(),
                    note: n(86),
                    count: 1
                }
            )]
        );
    }

    fn convert_unmapped_note() -> Converted {
        convert_ids(
            &drums(&[(0, on(99)), (48, off(99))]),
            "ggd_invasion",
            "ezdrummer",
        )
    }

    #[test]
    fn unmapped_note_is_dropped() {
        let out = convert_unmapped_note();
        assert!(hit_keys(&out.bytes).is_empty());
    }

    #[test]
    fn unmapped_note_is_reported() {
        let out = convert_unmapped_note();
        assert_eq!(
            out.report.unmapped_source().collect::<Vec<_>>(),
            [(n(99), 1)]
        );
    }

    fn convert_unrecognized(mid: &[u8], unrecognized: Unrecognized) -> Converted {
        let b = Catalog::builtin().unwrap();
        let mapping = Mapping::new(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &Overrides::default(),
            MissingDrums::Nearest,
        )
        .with_unrecognized(unrecognized);
        convert(mid, &mapping, ChannelScope::Auto).unwrap()
    }

    fn kick_and_unrecognized() -> Vec<u8> {
        drums(&[(0, on(24)), (10, off(24)), (30, on(99)), (48, off(99))])
    }

    #[test]
    fn keep_writes_a_file_of_unrecognized_notes_out_byte_for_byte() {
        let mid = drums(&[(0, on(99)), (48, off(99)), (12, on(100)), (6, off(100))]);
        let out = convert_unrecognized(&mid, Unrecognized::Keep);
        assert_eq!(out.bytes, mid);
    }

    #[test]
    fn keep_leaves_an_unrecognized_note_as_it_was_among_converted_ones() {
        let out = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Keep);
        let input = events(&kick_and_unrecognized(), 0);
        assert_eq!(events(&out.bytes, 0)[2..], input[2..]);
    }

    #[test]
    fn keep_still_converts_the_recognized_notes() {
        let out = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Keep);
        assert_eq!(hit_keys(&out.bytes), vec![36, 99]);
    }

    #[test]
    fn remove_leaves_an_unrecognized_note_out() {
        let out = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Remove);
        assert_eq!(hit_keys(&out.bytes), vec![36]);
    }

    #[test]
    fn keep_and_remove_report_the_same_counts() {
        let kept = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Keep);
        let removed = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Remove);
        assert_eq!(kept.report, removed.report);
    }

    #[test]
    fn keep_still_reports_the_kept_note_as_unrecognized() {
        let out = convert_unrecognized(&kick_and_unrecognized(), Unrecognized::Keep);
        assert_eq!(
            out.report.unmapped_source().collect::<Vec<_>>(),
            [(n(99), 1)]
        );
    }

    #[test]
    fn cc_events_pass_through_untouched() {
        let cc = MidiMessage::Controller {
            controller: u7::from_int_lossy(4),
            value: u7::from_int_lossy(77),
        };
        let out = convert_ids(
            &drums(&[(0, cc), (0, on(24)), (48, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        let found = events(&out.bytes, 0).iter().any(|e| e.2 == cc);
        assert!(found, "CC event must survive untouched");
    }

    #[test]
    fn dropped_note_delta_folds_into_next_kept() {
        let out = convert_ids(
            &drums(&[
                (0, on(24)),
                (100, off(24)),
                (50, on(99)),
                (10, off(99)),
                (200, on(26)),
            ]),
            "ggd_invasion",
            "ezdrummer",
        );
        let acc: Vec<(u8, u32)> = events(&out.bytes, 0)
            .into_iter()
            .filter_map(|(delta, _, message)| match message {
                MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => Some((key.as_int(), delta)),
                _ => None,
            })
            .collect();
        assert_eq!(acc, vec![(36, 0), (38, 260)]);
    }

    #[test]
    fn tgt_override_changes_output_note() {
        let mid = drums(&[(0, on(24)), (48, off(24))]);
        let out = convert_edited(&mid, r#"{"tgt":[{"canon":"kick.main","note":35}]}"#);
        assert_eq!(hit_keys(&out.bytes), vec![35]);
    }

    #[test]
    fn src_override_rescues_unmapped_note_into_the_output() {
        let mid = drums(&[(0, on(99)), (48, off(99))]);
        let out = convert_edited(&mid, r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(hit_keys(&out.bytes), vec![36]);
    }

    #[test]
    fn src_override_takes_the_rescued_note_off_the_unmapped_list() {
        let mid = drums(&[(0, on(99)), (48, off(99))]);
        let out = convert_edited(&mid, r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert!(out.report.unmapped_source().next().is_none());
    }

    #[test]
    fn src_override_reassigns_mapped_note() {
        let mid = drums(&[(0, on(24)), (48, off(24))]);
        let out = convert_edited(&mid, r#"{"src":[{"note":24,"canon":"snare1.hit"}]}"#);
        assert_eq!(hit_keys(&out.bytes), vec![38]);
    }

    #[test]
    fn round_trip_stable_on_primary_subset() {
        let notes = [24u8, 26, 30, 33, 45];
        let mut events = Vec::new();
        for (i, n) in notes.iter().enumerate() {
            events.push((if i == 0 { 0 } else { 10 }, on(*n)));
            events.push((10, off(*n)));
        }
        let fwd = convert_ids(&drums(&events), "ggd_invasion", "ezdrummer");
        let back = convert_ids(&fwd.bytes, "ezdrummer", "ggd_invasion");
        assert_eq!(hit_keys(&back.bytes), notes.to_vec());
    }
}
