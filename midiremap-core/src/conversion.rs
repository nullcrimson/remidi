use crate::{
    channel::ChannelScope,
    midi::{self, CodecError},
    report::Report,
    rewrite::rewrite,
    table::NoteTable,
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
    let mut smf = midi::parse(midi)?;
    let mut report = Report::default();
    rewrite(&mut smf, &NoteTable::compile(mapping), scope, &mut report)?;
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
        translate::MissingDrums,
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

    #[test]
    fn drop_leaves_a_swapped_china_out_and_reports_it() {
        let out = convert_ids_with(
            &drums(&[(0, on(24)), (10, off(24)), (0, on(65)), (48, off(65))]),
            "ggd_invasion",
            "ezdrummer",
            MissingDrums::Drop,
        );
        let china = "china.1.hit".parse::<Canon>().unwrap();
        assert_eq!(hit_keys(&out.bytes), vec![36]);
        assert_eq!(out.report.dropped().collect::<Vec<_>>(), [(china, 1)]);
        assert!(out.report.fallback_used().next().is_none());
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

    #[test]
    fn china1_falls_back_to_crash() {
        let out = convert_ids(
            &drums(&[(0, on(65)), (48, off(65))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(hit_keys(&out.bytes), vec![86]);
        assert_eq!(
            out.report.fallback_used().collect::<Vec<_>>(),
            [(
                "china.1.hit".parse::<Canon>().unwrap(),
                &FallbackTally {
                    note: n(86),
                    count: 1
                }
            )]
        );
    }

    #[test]
    fn unmapped_dropped_and_reported() {
        let out = convert_ids(
            &drums(&[(0, on(99)), (48, off(99))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert!(hit_keys(&out.bytes).is_empty());
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
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#).unwrap();
        let out = convert(
            &mid,
            &Mapping::new(src, tgt, &ov, MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();
        assert_eq!(hit_keys(&out.bytes), vec![35]);
    }

    #[test]
    fn src_override_rescues_unmapped_note() {
        let mid = drums(&[(0, on(99)), (48, off(99))]);
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#).unwrap();
        let out = convert(
            &mid,
            &Mapping::new(src, tgt, &ov, MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();
        assert_eq!(hit_keys(&out.bytes), vec![36]);
        assert!(out.report.unmapped_source().next().is_none());
    }

    #[test]
    fn src_override_reassigns_mapped_note() {
        let mid = drums(&[(0, on(24)), (48, off(24))]);
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":24,"canon":"snare1.hit"}]}"#).unwrap();
        let out = convert(
            &mid,
            &Mapping::new(src, tgt, &ov, MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();
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
