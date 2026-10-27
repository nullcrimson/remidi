use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::{
    canon::Canon,
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    resolution::{resolve, Encoding, MissingDrums, Outcome},
};

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

/// Where a source note plays on the target: on the note of the drum it decodes to, or
/// unchanged, when the source does not recognize it and the mapping keeps such notes.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub(crate) enum Destination {
    Drum { canon: Canon, note: Note },
    Kept(Note),
}

impl Destination {
    pub(crate) fn note(&self) -> Note {
        match *self {
            Self::Drum { note, .. } | Self::Kept(note) => note,
        }
    }
}

/// A source and a target engine with overrides applied: the one product every conversion,
/// preview, rack and pair page reads, holding where each source note and each drum lands.
pub struct Mapping<'a> {
    source: &'a EngineMap,
    target: &'a EngineMap,
    missing: MissingDrums,
    edited: HashSet<Note>,
    notes: [Option<Outcome>; Note::COUNT],
    drums: HashMap<Canon, Outcome>,
    unrecognized: Unrecognized,
}

type Decoding = HashMap<Note, Canon>;

impl<'a> Mapping<'a> {
    pub fn new(
        src: &'a EngineMap,
        tgt: &'a EngineMap,
        overrides: &Overrides,
        missing: MissingDrums,
    ) -> Self {
        let encode = encoding(tgt, overrides);
        let drums: HashMap<Canon, Outcome> = Canon::all()
            .iter()
            .map(|&canon| (canon, resolve(canon, &encode, missing)))
            .collect();
        let decode = decoding(src, overrides);
        Self {
            source: src,
            target: tgt,
            missing,
            edited: overrides.source().into_keys().collect(),
            notes: Note::ALL.map(|note| decode.get(&note).map(|canon| drums[canon])),
            drums,
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

    pub(crate) fn source(&self) -> &'a EngineMap {
        self.source
    }

    pub(crate) fn target(&self) -> &'a EngineMap {
        self.target
    }

    pub(crate) fn missing(&self) -> MissingDrums {
        self.missing
    }

    /// The source notes the overrides reassign or unassign.
    pub(crate) fn edited(&self) -> &HashSet<Note> {
        &self.edited
    }

    /// Where the drum `note` decodes to lands; `None` when the source does not recognize the
    /// note.
    pub(crate) fn get(&self, note: Note) -> Option<Outcome> {
        self.notes[note.index()]
    }

    /// Every source note the source recognizes, ascending, with where its drum lands.
    pub fn played(&self) -> impl Iterator<Item = (Note, Outcome)> + '_ {
        Note::ALL
            .into_iter()
            .filter_map(|note| self.get(note).map(|outcome| (note, outcome)))
    }

    /// Where `note` plays, or `None` when nothing plays it: its drum is dropped, or the source
    /// does not recognize it and the mapping removes such notes.
    pub(crate) fn destination(&self, note: Note) -> Option<Destination> {
        match self.get(note) {
            Some(
                Outcome::Direct { canon, note: to }
                | Outcome::Fallback {
                    canon, note: to, ..
                },
            ) => Some(Destination::Drum { canon, note: to }),
            Some(Outcome::Dropped { .. }) => None,
            None => self.unrecognized.keeps().then_some(Destination::Kept(note)),
        }
    }

    pub fn resolve_canon(&self, canon: Canon) -> Outcome {
        self.drums[&canon]
    }

    /// Each drum some source note decodes to, edits applied, with those notes ascending.
    pub(crate) fn played_drums(&self) -> HashMap<Canon, Vec<Note>> {
        let mut played: HashMap<Canon, Vec<Note>> = HashMap::new();
        for (note, outcome) in self.played() {
            played.entry(outcome.canon()).or_default().push(note);
        }
        played
    }

    /// The drums the source plays that nothing on the target plays, each once, in no order.
    pub fn dropped_drums(&self) -> impl Iterator<Item = Canon> + '_ {
        self.played_drums()
            .into_keys()
            .filter(|&canon| matches!(self.resolve_canon(canon), Outcome::Dropped { .. }))
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

#[cfg(test)]
mod tests {
    use std::sync::LazyLock;

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

    static SRC_MAP: LazyLock<EngineMap> = LazyLock::new(|| from_toml(SRC).unwrap());
    static TGT_MAP: LazyLock<EngineMap> = LazyLock::new(|| from_toml(TGT).unwrap());
    static KIT: LazyLock<EngineMap> =
        LazyLock::new(|| target(&[(36, "kick.main"), (38, "snare1.hit")]));

    fn mapping() -> Mapping<'static> {
        Mapping::new(
            &SRC_MAP,
            &TGT_MAP,
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

    fn onto(tgt: &EngineMap, missing: MissingDrums) -> Mapping<'_> {
        Mapping::new(tgt, tgt, &Overrides::default(), missing)
    }

    fn kick_and_snare_edited(edits: &str) -> Mapping<'static> {
        Mapping::new(
            &KIT,
            &KIT,
            &serde_json::from_str(edits).unwrap(),
            MissingDrums::Nearest,
        )
    }

    fn kick_on(note: u8) -> Option<Outcome> {
        Some(Outcome::Direct {
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
        assert_eq!(mapping.get(n(36)), None);
    }

    #[test]
    fn source_override_assigns_a_new_note_alongside_an_unassigned_one() {
        let mapping = kick_and_snare_edited(
            r#"{"src":[{"note":36,"canon":null},{"note":40,"canon":"kick.main"}]}"#,
        );
        assert_eq!(mapping.get(n(40)), kick_on(36));
    }

    #[test]
    fn source_override_rescues_a_note() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.get(n(99)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_a_base_note_mapped() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.get(n(36)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_another_note_unmapped() {
        let mapping = kick_and_snare_edited(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#);
        assert_eq!(mapping.get(n(50)), None);
    }

    #[test]
    fn drop_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = Outcome::Fallback {
            canon,
            stand_in: k("snare1.hit"),
            note: n(38),
            other_drum: false,
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
        let expected = Outcome::Fallback {
            canon,
            stand_in: k("snare1.hit"),
            note: n(38),
            other_drum: false,
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
            Outcome::Fallback {
                canon,
                stand_in: k("crash.1.hit"),
                note: n(49),
                other_drum: true
            }
        );
    }

    #[test]
    fn drop_leaves_out_a_swap_that_nearest_plays() {
        let tgt = target(&[(49, "crash.1.hit")]);
        let canon = k("china.1.hit");
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon),
            Outcome::Dropped {
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
                if let Outcome::Fallback { stand_in, .. } = drop {
                    assert!(canon.same_drum(stand_in), "{id}: {canon} -> {stand_in}");
                }
                match near {
                    Outcome::Direct { .. } => assert_eq!(drop, near, "{id}: {canon}"),
                    Outcome::Dropped { .. } => assert_eq!(drop, near, "{id}: {canon}"),
                    Outcome::Fallback { stand_in, .. } => {
                        if canon.same_drum(stand_in) {
                            assert_eq!(drop, near, "{id}: {canon}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn an_engine_resolves_a_drum_as_a_mapping_without_overrides_does() {
        let catalog = Catalog::builtin().unwrap();
        for map in catalog.engines() {
            for missing in [MissingDrums::Nearest, MissingDrums::Drop] {
                let mapping = onto(map, missing);
                for &canon in Canon::all() {
                    assert_eq!(
                        mapping.resolve_canon(canon),
                        map.resolve(canon, missing),
                        "{}: {canon}",
                        map.id()
                    );
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
            mapping.get(n(60)),
            Some(Outcome::Direct {
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

    static SWAP_SRC: LazyLock<EngineMap> = LazyLock::new(|| target(&[(1, "kick.main")]));
    static SWAP_TGT: LazyLock<EngineMap> =
        LazyLock::new(|| target(&[(36, "kick.main"), (38, "snare1.hit"), (49, "crash.1.hit")]));

    fn swap_mapping(missing: MissingDrums) -> Mapping<'static> {
        Mapping::new(&SWAP_SRC, &SWAP_TGT, &Overrides::default(), missing)
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
        assert_eq!(mapping().destination(n(99)), None);
    }

    #[test]
    fn a_mapping_keeps_unrecognized_notes_when_told_to() {
        let kept = mapping().with_unrecognized(Unrecognized::Keep);
        assert_eq!(kept.destination(n(99)), Some(Destination::Kept(n(99))));
    }

    #[test]
    fn keeping_unrecognized_notes_leaves_their_resolution_unmapped() {
        let kept = mapping().with_unrecognized(Unrecognized::Keep);
        assert_eq!(kept.get(n(99)), None);
    }

    #[test]
    fn a_drum_the_target_has_plays_on_its_note() {
        assert_eq!(
            mapping().get(n(12)),
            Some(Outcome::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50)
            })
        );
    }

    #[test]
    fn fallback_walks_chain() {
        assert_eq!(
            mapping().get(n(11)),
            Some(Outcome::Fallback {
                canon: Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain),
                stand_in: Canon::Hat(HatOpen::Open(idx(1)), HatZone::Plain),
                note: n(61),
                other_drum: false
            })
        );
    }

    #[test]
    fn an_open_hat_never_plays_closed_under_nearest() {
        let tgt = target(&[(60, "hat.closed")]);
        let canon = k("hat.open3");
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest).resolve_canon(canon),
            Outcome::Dropped {
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
            Outcome::Dropped {
                canon,
                other_drum: false
            }
        );
    }

    #[test]
    fn unmapped_when_source_lacks_note() {
        assert_eq!(mapping().get(n(99)), None);
    }

    #[test]
    fn dropped_when_target_and_chain_empty() {
        assert_eq!(
            mapping().get(n(10)),
            Some(Outcome::Dropped {
                canon: Canon::Snare(idx(1), SnareArtic::Hit),
                other_drum: false
            })
        );
    }

    #[test]
    fn a_drum_the_source_plays_and_the_target_lacks_is_dropped() {
        let catalog = Catalog::builtin().unwrap();
        let between = |src: &str, tgt: &str, missing| {
            Mapping::new(
                catalog.get(src).unwrap(),
                catalog.get(tgt).unwrap(),
                &Overrides::default(),
                missing,
            )
            .dropped_drums()
            .count()
        };
        assert!(between("superior_drummer3", "general_midi", MissingDrums::Drop) > 0);
        assert_eq!(
            between("ggd_invasion", "ezdrummer", MissingDrums::Nearest),
            0
        );
    }

    #[test]
    fn resolve_canon_matches_translate_on_decoded_notes() {
        let t = mapping();
        assert_eq!(
            Some(t.resolve_canon(Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain))),
            t.get(n(11))
        );
    }
}
