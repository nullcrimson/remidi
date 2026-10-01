use crate::{
    midi::{self, ChannelScope, CodecError},
    table::NoteTable,
    translate::{Mapping, Report},
};

pub struct Converted {
    pub bytes: Vec<u8>,
    pub report: Report,
}

#[derive(thiserror::Error, Debug)]
pub enum ConversionError {
    #[error(transparent)]
    Codec(#[from] CodecError),
}

/// Converts a standard MIDI file through `mapping`, rewriting the channels `scope` selects.
pub fn convert(
    midi: &[u8],
    mapping: &Mapping,
    scope: ChannelScope,
) -> Result<Converted, ConversionError> {
    let mut smf = midi::parse(midi)?;
    let mut report = Report::default();
    midi::rewrite(&mut smf, &NoteTable::compile(mapping), scope, &mut report);
    let bytes = midi::write(&smf)?;
    Ok(Converted { bytes, report })
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, events, hit_keys, off, on};
    use midly::{num::u7, MidiMessage};

    use super::*;
    use crate::{
        canon::Canon,
        catalog::Catalog,
        note::n,
        overrides::Overrides,
        translate::{FallbackTally, MissingDrums},
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
        assert_eq!(out.report.dropped().get(&china), Some(&1));
        assert!(out.report.fallback_used().is_empty());
        assert_eq!(out.report.converted(), 1);
    }

    #[test]
    fn ggd_kick_to_ezd_kick() {
        let out = convert_ids(
            &drums(&[(0, on(24)), (48, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(hit_keys(&out.bytes), vec![36]);
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
            out.report
                .fallback_used()
                .get(&"china.1.hit".parse::<Canon>().unwrap()),
            Some(&FallbackTally {
                note: n(86),
                count: 1
            })
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
        assert_eq!(out.report.unmapped_source().get(&n(99)), Some(&1));
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
    fn ggd_to_addictive_drums2_native() {
        let out = convert_ids(
            &drums(&[(0, on(43)), (48, off(43))]),
            "ggd_invasion",
            "addictive_drums2",
        );
        assert_eq!(hit_keys(&out.bytes), vec![51]);
    }

    #[test]
    fn addictive_drums2_to_ezd_native() {
        let out = convert_ids(
            &drums(&[(0, on(49)), (48, off(49))]),
            "addictive_drums2",
            "ezdrummer",
        );
        assert_eq!(hit_keys(&out.bytes), vec![63]);
    }

    #[test]
    fn empty_overrides_equal_plain_remap() {
        let mid = drums(&[(0, on(24)), (48, off(24))]);
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let plain = convert(
            &mid,
            &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();
        let ov = Overrides::default();
        let with = convert(
            &mid,
            &Mapping::new(src, tgt, &ov, MissingDrums::Nearest),
            ChannelScope::Auto,
        )
        .unwrap();
        assert_eq!(hit_keys(&plain.bytes), hit_keys(&with.bytes));
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
        assert!(out.report.unmapped_source().is_empty());
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
    fn ggd_china2_hit_reaches_a_crash_not_dropped() {
        let out = convert_ids(
            &drums(&[(0, on(67)), (48, off(67))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert!(!hit_keys(&out.bytes).is_empty(), "china2 hit must not drop");
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
