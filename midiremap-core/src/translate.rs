use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{canon::Canon, engine_map::EngineMap, note::Note, overrides::Overrides};

/// Where a drum lands on the target: on its own note, on the note of the drum that stands
/// in for it, or nowhere.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum CanonResolution {
    Direct {
        canon: Canon,
        note: Note,
    },
    Fallback {
        canon: Canon,
        stand_in: Canon,
        note: Note,
    },
    /// Nothing plays it; `other_drum` when only another drum could have, so the
    /// [`MissingDrums`] setting decided it.
    Dropped {
        canon: Canon,
        other_drum: bool,
    },
}

impl CanonResolution {
    pub(crate) fn canon(&self) -> Canon {
        match *self {
            Self::Direct { canon, .. }
            | Self::Fallback { canon, .. }
            | Self::Dropped { canon, .. } => canon,
        }
    }

    /// Whether the target lacks the drum and its nearest stand-in is another drum, so the
    /// [`MissingDrums`] setting decides what plays it.
    pub fn moves_to_other_drum(&self) -> bool {
        match *self {
            Self::Direct { .. } => false,
            Self::Fallback {
                canon, stand_in, ..
            } => !canon.same_drum(stand_in),
            Self::Dropped { other_drum, .. } => other_drum,
        }
    }

    /// The target drum that plays it and that drum's note, when anything plays it.
    pub fn played(&self) -> Option<(Canon, Note)> {
        match *self {
            Self::Direct { canon, note } => Some((canon, note)),
            Self::Fallback { stand_in, note, .. } => Some((stand_in, note)),
            Self::Dropped { .. } => None,
        }
    }

    pub fn note(&self) -> Option<Note> {
        self.played().map(|(_, note)| note)
    }
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub(crate) enum Resolution {
    Resolved(CanonResolution),
    Unmapped,
}

/// What happens to a drum the target engine lacks.
#[derive(
    Copy,
    Clone,
    Debug,
    Default,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
)]
#[serde(rename_all = "lowercase")]
#[strum(
    serialize_all = "lowercase",
    parse_err_ty = MissingDrumsParseError,
    parse_err_fn = MissingDrumsParseError::of
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum MissingDrums {
    /// Play it on the nearest drum the target has.
    #[default]
    Nearest,
    /// Leave it out; another way of playing the same drum still stands in for it.
    Drop,
}

impl MissingDrums {
    fn allows(self, canon: Canon, alt: Canon) -> bool {
        match self {
            Self::Nearest => true,
            Self::Drop => canon.same_drum(alt),
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("missing drums must be 'nearest' or 'drop', not '{0}'")]
pub struct MissingDrumsParseError(String);

impl MissingDrumsParseError {
    fn of(s: &str) -> Self {
        Self(s.to_owned())
    }
}

/// What happens to a note the source layout does not recognize.
#[derive(
    Copy,
    Clone,
    Debug,
    Default,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
)]
#[serde(rename_all = "lowercase")]
#[strum(
    serialize_all = "lowercase",
    parse_err_ty = UnrecognizedParseError,
    parse_err_fn = UnrecognizedParseError::of
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum Unrecognized {
    /// Leave it out of the output.
    #[default]
    Remove,
    /// Write it out as it is: the same note on the same channel, at the same time and velocity.
    Keep,
}

impl Unrecognized {
    pub(crate) fn keeps(self) -> bool {
        match self {
            Self::Remove => false,
            Self::Keep => true,
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("unrecognized notes must be 'remove' or 'keep', not '{0}'")]
pub struct UnrecognizedParseError(String);

impl UnrecognizedParseError {
    fn of(s: &str) -> Self {
        Self(s.to_owned())
    }
}

/// A source and a target engine with overrides applied: the hub-and-spoke pipeline for
/// one conversion.
pub struct Mapping {
    decode: Decoding,
    drums: HashMap<Canon, CanonResolution>,
    unrecognized: Unrecognized,
}

type Decoding = HashMap<Note, Canon>;
type Encoding = HashMap<Canon, Note>;

impl Mapping {
    pub fn new(
        src: &EngineMap,
        tgt: &EngineMap,
        overrides: &Overrides,
        missing: MissingDrums,
    ) -> Self {
        let encode = encoding(tgt, overrides);
        Self {
            decode: decoding(src, overrides),
            drums: Canon::all()
                .iter()
                .map(|&canon| (canon, resolve(canon, &encode, missing)))
                .collect(),
            unrecognized: Unrecognized::default(),
        }
    }

    /// The same mapping, with `unrecognized` deciding what happens to the notes the source
    /// layout does not recognize.
    #[must_use]
    pub fn with_unrecognized(self, unrecognized: Unrecognized) -> Self {
        Self {
            unrecognized,
            ..self
        }
    }

    pub(crate) fn unrecognized(&self) -> Unrecognized {
        self.unrecognized
    }

    pub(crate) fn translate(&self, note: Note) -> Resolution {
        self.decode
            .get(&note)
            .map_or(Resolution::Unmapped, |&canon| {
                Resolution::Resolved(self.resolve_canon(canon))
            })
    }

    pub fn resolve_canon(&self, canon: Canon) -> CanonResolution {
        self.drums[&canon]
    }
}

fn decoding(src: &EngineMap, overrides: &Overrides) -> Decoding {
    let mut decode: Decoding = src.decodings().collect();
    for (note, canon) in overrides.source() {
        match canon {
            Some(canon) => decode.insert(note, canon),
            None => decode.remove(&note),
        };
    }
    decode
}

fn encoding(tgt: &EngineMap, overrides: &Overrides) -> Encoding {
    tgt.encodings().chain(overrides.target()).collect()
}

fn substitute(canon: Canon, encode: &Encoding, missing: MissingDrums) -> Option<(Canon, Note)> {
    canon
        .fallback_chain()
        .iter()
        .copied()
        .filter(|&alt| missing.allows(canon, alt))
        .find_map(|alt| encode.get(&alt).map(|&note| (alt, note)))
}

fn resolve(canon: Canon, encode: &Encoding, missing: MissingDrums) -> CanonResolution {
    if let Some(&note) = encode.get(&canon) {
        return CanonResolution::Direct { canon, note };
    }
    substitute(canon, encode, missing).map_or_else(
        || CanonResolution::Dropped {
            canon,
            other_drum: substitute(canon, encode, MissingDrums::Nearest).is_some(),
        },
        |(stand_in, note)| CanonResolution::Fallback {
            canon,
            stand_in,
            note,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, HatOpen, HatZone, KickKind, SnareArtic},
        catalog::Catalog,
        engine_map::from_toml,
        note::n,
    };

    const SRC: &str = r#"
        id = "src"
        name = "Src"
        notes = [
          { note = 10, canon = "snare1.hit", primary = true },
          { note = 11, canon = "hat.open3", primary = true },
          { note = 12, canon = "kick.main", primary = true },
        ]
    "#;
    const TGT: &str = r#"
        id = "tgt"
        name = "Tgt"
        notes = [
          { note = 50, canon = "kick.main", primary = true },
          { note = 60, canon = "hat.closed", primary = true },
          { note = 61, canon = "hat.open1", primary = true },
        ]
    "#;

    fn mapping() -> Mapping {
        Mapping::new(
            &from_toml(SRC).unwrap(),
            &from_toml(TGT).unwrap(),
            &Overrides::default(),
            MissingDrums::Nearest,
        )
    }

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    fn target(notes: &[(u8, &str)]) -> EngineMap {
        let rows: Vec<String> = notes
            .iter()
            .map(|(note, canon)| {
                format!(r#"{{ note = {note}, canon = "{canon}", primary = true }}"#)
            })
            .collect();
        from_toml(&format!(
            "id = \"t\"
name = \"T\"
notes = [ {} ]",
            rows.join(", ")
        ))
        .unwrap()
    }

    fn onto(tgt: &EngineMap, missing: MissingDrums) -> Mapping {
        Mapping::new(tgt, tgt, &Overrides::default(), missing)
    }

    fn kick_and_snare_edited(edits: &str) -> Mapping {
        let kit = target(&[(36, "kick.main"), (38, "snare1.hit")]);
        Mapping::new(
            &kit,
            &kit,
            &serde_json::from_str(edits).unwrap(),
            MissingDrums::Nearest,
        )
    }

    fn kick_on(note: u8) -> Resolution {
        Resolution::Resolved(CanonResolution::Direct {
            canon: k("kick.main"),
            note: n(note),
        })
    }

    #[test]
    fn target_override_beats_base() {
        let mapping = kick_and_snare_edited(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#);
        assert_eq!(mapping.resolve_canon(k("kick.main")).note(), Some(n(35)));
    }

    #[test]
    fn target_override_leaves_other_drums_on_the_base() {
        let mapping = kick_and_snare_edited(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#);
        assert_eq!(mapping.resolve_canon(k("snare1.hit")).note(), Some(n(38)));
    }

    #[test]
    fn source_override_with_null_canon_unassigns_the_note() {
        let mapping = kick_and_snare_edited(
            r#"{"src":[{"note":36,"canon":null},{"note":40,"canon":"kick.main"}]}"#,
        );
        assert_eq!(mapping.translate(n(36)), Resolution::Unmapped);
    }

    #[test]
    fn source_override_assigns_a_new_note_alongside_an_unassigned_one() {
        let mapping = kick_and_snare_edited(
            r#"{"src":[{"note":36,"canon":null},{"note":40,"canon":"kick.main"}]}"#,
        );
        assert_eq!(mapping.translate(n(40)), kick_on(36));
    }

    #[test]
    fn source_override_rescues_a_note() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.translate(n(99)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_a_base_note_mapped() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.translate(n(36)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_another_note_unmapped() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.translate(n(50)), Resolution::Unmapped);
    }

    #[test]
    fn drop_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = CanonResolution::Fallback {
            canon,
            stand_in: k("snare1.hit"),
            note: n(38),
        };
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon),
            expected
        );
    }

    #[test]
    fn nearest_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = CanonResolution::Fallback {
            canon,
            stand_in: k("snare1.hit"),
            note: n(38),
        };
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest).resolve_canon(canon),
            expected
        );
    }

    #[test]
    fn nearest_plays_a_swap_on_another_drum() {
        let tgt = target(&[(49, "crash.1.hit")]);
        let canon = k("china.1.hit");
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest).resolve_canon(canon),
            CanonResolution::Fallback {
                canon,
                stand_in: k("crash.1.hit"),
                note: n(49)
            }
        );
    }

    #[test]
    fn drop_leaves_out_a_swap_that_nearest_plays() {
        let tgt = target(&[(49, "crash.1.hit")]);
        let canon = k("china.1.hit");
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon),
            CanonResolution::Dropped {
                canon,
                other_drum: true
            }
        );
    }

    #[test]
    fn nearest_keeps_the_same_drum_before_another() {
        let tgt = target(&[(40, "snare1.rimshot"), (41, "snare2.hit")]);
        let canon = k("snare2.rimshot");
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest)
                .resolve_canon(canon)
                .note(),
            Some(n(41))
        );
    }

    #[test]
    fn drop_keeps_the_same_drum_before_another() {
        let tgt = target(&[(40, "snare1.rimshot"), (41, "snare2.hit")]);
        let canon = k("snare2.rimshot");
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon).note(),
            Some(n(41))
        );
    }

    #[test]
    fn drop_never_plays_another_drum_on_any_builtin_target() {
        let catalog = Catalog::builtin().unwrap();
        for id in catalog.ids() {
            let tgt = catalog.get(id).unwrap();
            let nearest = onto(tgt, MissingDrums::Nearest);
            let dropping = onto(tgt, MissingDrums::Drop);
            for &canon in Canon::all() {
                let near = nearest.resolve_canon(canon);
                let drop = dropping.resolve_canon(canon);
                if let CanonResolution::Fallback { stand_in, .. } = drop {
                    assert!(canon.same_drum(stand_in), "{id}: {canon} -> {stand_in}");
                }
                match near {
                    CanonResolution::Direct { .. } => assert_eq!(drop, near, "{id}: {canon}"),
                    CanonResolution::Dropped { .. } => assert_eq!(drop, near, "{id}: {canon}"),
                    CanonResolution::Fallback { stand_in, .. } => {
                        if canon.same_drum(stand_in) {
                            assert_eq!(drop, near, "{id}: {canon}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn a_target_edit_plays_its_note_under_drop() {
        let src = target(&[(60, "china.1.hit")]);
        let tgt = target(&[(49, "crash.1.hit")]);
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"china.1.hit","note":55}]}"#).unwrap();
        let mapping = Mapping::new(&src, &tgt, &ov, MissingDrums::Drop);
        assert_eq!(
            mapping.translate(n(60)),
            Resolution::Resolved(CanonResolution::Direct {
                canon: k("china.1.hit"),
                note: n(55)
            })
        );
    }

    #[test]
    fn a_target_edit_is_not_a_move_to_another_drum_under_drop() {
        let src = target(&[(60, "china.1.hit")]);
        let tgt = target(&[(49, "crash.1.hit")]);
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"china.1.hit","note":55}]}"#).unwrap();
        let mapping = Mapping::new(&src, &tgt, &ov, MissingDrums::Drop);
        assert!(!mapping
            .resolve_canon(k("china.1.hit"))
            .moves_to_other_drum());
    }

    fn swap_mapping(missing: MissingDrums) -> Mapping {
        let src = target(&[(1, "kick.main")]);
        let tgt = target(&[(36, "kick.main"), (38, "snare1.hit"), (49, "crash.1.hit")]);
        Mapping::new(&src, &tgt, &Overrides::default(), missing)
    }

    #[test]
    fn a_china_without_a_china_moves_to_another_drum_under_nearest() {
        let mapping = swap_mapping(MissingDrums::Nearest);
        assert!(mapping
            .resolve_canon(k("china.1.hit"))
            .moves_to_other_drum());
    }

    #[test]
    fn a_second_snare_without_one_moves_to_another_drum_under_nearest() {
        let mapping = swap_mapping(MissingDrums::Nearest);
        assert!(mapping.resolve_canon(k("snare2.hit")).moves_to_other_drum());
    }

    #[test]
    fn a_rimshot_standing_in_with_its_hit_does_not_move_to_another_drum_under_nearest() {
        let mapping = swap_mapping(MissingDrums::Nearest);
        assert!(!mapping
            .resolve_canon(k("snare1.rimshot"))
            .moves_to_other_drum());
    }

    #[test]
    fn a_drum_the_target_has_does_not_move_to_another_drum() {
        let mapping = swap_mapping(MissingDrums::Nearest);
        assert!(!mapping.resolve_canon(k("kick.main")).moves_to_other_drum());
    }

    #[test]
    fn a_percussion_with_no_stand_in_does_not_move_to_another_drum() {
        let mapping = swap_mapping(MissingDrums::Nearest);
        assert!(!mapping
            .resolve_canon(k("perc.cowbell"))
            .moves_to_other_drum());
    }

    #[test]
    fn a_china_without_a_china_moves_to_another_drum_under_drop() {
        let mapping = swap_mapping(MissingDrums::Drop);
        assert!(mapping
            .resolve_canon(k("china.1.hit"))
            .moves_to_other_drum());
    }

    #[test]
    fn a_second_snare_without_one_moves_to_another_drum_under_drop() {
        let mapping = swap_mapping(MissingDrums::Drop);
        assert!(mapping.resolve_canon(k("snare2.hit")).moves_to_other_drum());
    }

    #[test]
    fn a_rimshot_standing_in_with_its_hit_does_not_move_to_another_drum_under_drop() {
        let mapping = swap_mapping(MissingDrums::Drop);
        assert!(!mapping
            .resolve_canon(k("snare1.rimshot"))
            .moves_to_other_drum());
    }

    #[test]
    fn missing_drums_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&MissingDrums::Drop).unwrap(),
            r#""drop""#
        );
    }

    #[test]
    fn missing_drums_deserializes_from_its_lowercase_name() {
        assert_eq!(
            serde_json::from_str::<MissingDrums>(r#""nearest""#).unwrap(),
            MissingDrums::Nearest
        );
    }

    #[test]
    fn an_unknown_missing_drums_name_does_not_deserialize() {
        assert!(serde_json::from_str::<MissingDrums>(r#""maybe""#).is_err());
    }

    #[test]
    fn nearest_round_trips_through_its_name() {
        let m = MissingDrums::Nearest;
        assert_eq!(m.to_string().parse::<MissingDrums>().unwrap(), m);
    }

    #[test]
    fn drop_round_trips_through_its_name() {
        let m = MissingDrums::Drop;
        assert_eq!(m.to_string().parse::<MissingDrums>().unwrap(), m);
    }

    #[test]
    fn an_unknown_missing_drums_value_names_the_choices() {
        let err = "maybe".parse::<MissingDrums>().unwrap_err().to_string();
        assert!(
            err.contains("maybe") && err.contains("nearest") && err.contains("drop"),
            "{err}"
        );
    }

    #[test]
    fn unrecognized_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&Unrecognized::Keep).unwrap(),
            r#""keep""#
        );
    }

    #[test]
    fn unrecognized_deserializes_from_its_lowercase_name() {
        assert_eq!(
            serde_json::from_str::<Unrecognized>(r#""remove""#).unwrap(),
            Unrecognized::Remove
        );
    }

    #[test]
    fn remove_round_trips_through_its_name() {
        let u = Unrecognized::Remove;
        assert_eq!(u.to_string().parse::<Unrecognized>().unwrap(), u);
    }

    #[test]
    fn keep_round_trips_through_its_name() {
        let u = Unrecognized::Keep;
        assert_eq!(u.to_string().parse::<Unrecognized>().unwrap(), u);
    }

    #[test]
    fn an_unknown_unrecognized_value_names_the_choices() {
        let err = "maybe".parse::<Unrecognized>().unwrap_err().to_string();
        assert!(
            err.contains("maybe") && err.contains("remove") && err.contains("keep"),
            "{err}"
        );
    }

    #[test]
    fn a_mapping_removes_unrecognized_notes_unless_told_to_keep_them() {
        assert_eq!(mapping().unrecognized(), Unrecognized::Remove);
    }

    #[test]
    fn a_mapping_keeps_unrecognized_notes_when_told_to() {
        let kept = mapping().with_unrecognized(Unrecognized::Keep);
        assert_eq!(kept.unrecognized(), Unrecognized::Keep);
    }

    #[test]
    fn keeping_unrecognized_notes_leaves_their_resolution_unmapped() {
        let kept = mapping().with_unrecognized(Unrecognized::Keep);
        assert_eq!(kept.translate(n(99)), Resolution::Unmapped);
    }

    #[test]
    fn a_drum_the_target_has_plays_on_its_note() {
        assert_eq!(
            mapping().translate(n(12)),
            Resolution::Resolved(CanonResolution::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50)
            })
        );
    }

    #[test]
    fn fallback_walks_chain() {
        assert_eq!(
            mapping().translate(n(11)),
            Resolution::Resolved(CanonResolution::Fallback {
                canon: Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain),
                stand_in: Canon::Hat(HatOpen::Open(idx(1)), HatZone::Plain),
                note: n(61)
            })
        );
    }

    #[test]
    fn an_open_hat_never_plays_closed_under_nearest() {
        let tgt = target(&[(60, "hat.closed")]);
        let canon = k("hat.open3");
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest).resolve_canon(canon),
            CanonResolution::Dropped {
                canon,
                other_drum: false
            }
        );
    }

    #[test]
    fn an_open_hat_never_plays_closed_under_drop() {
        let tgt = target(&[(60, "hat.closed")]);
        let canon = k("hat.open3");
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon),
            CanonResolution::Dropped {
                canon,
                other_drum: false
            }
        );
    }

    #[test]
    fn unmapped_when_source_lacks_note() {
        assert_eq!(mapping().translate(n(99)), Resolution::Unmapped);
    }

    #[test]
    fn dropped_when_target_and_chain_empty() {
        assert_eq!(
            mapping().translate(n(10)),
            Resolution::Resolved(CanonResolution::Dropped {
                canon: Canon::Snare(idx(1), SnareArtic::Hit),
                other_drum: false
            })
        );
    }

    #[test]
    fn resolve_canon_matches_translate_on_decoded_notes() {
        let t = mapping();
        assert_eq!(
            Resolution::Resolved(
                t.resolve_canon(Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain))
            ),
            t.translate(n(11))
        );
    }
}
