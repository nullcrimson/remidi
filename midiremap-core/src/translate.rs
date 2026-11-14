use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::{
    canon::{Canon, TomArtic, TomPos},
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    resolution::{resolve, Encoding, Landing, MissingDrums, Outcome, StandIn},
    tom_spread::TomSpread,
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
    spread: TomSpread,
    matched: HashMap<Canon, Canon>,
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
        let spread = match missing {
            MissingDrums::Nearest => TomSpread::new(src.toms(), tgt.toms()),
            MissingDrums::Drop => TomSpread::default(),
        };
        let matched: HashMap<Canon, Canon> = Canon::all()
            .iter()
            .filter_map(|&canon| matched_drum(src, tgt, &spread, canon).map(|m| (canon, m)))
            .collect();
        let edits = overrides.target();
        let encode = encoding(tgt, edits.iter());
        let follow = encoding(
            tgt,
            edits
                .iter()
                .filter(|&(c, _)| !c.tom().is_some_and(|(pos, _)| spread.moved(pos))),
        );
        let drums: HashMap<Canon, Outcome> = Canon::all()
            .iter()
            .map(|&canon| {
                let outcome = match matched.get(&canon) {
                    Some(_) if edits.contains_key(&canon) => resolve(canon, &encode, missing),
                    Some(&plays) if plays.tom().is_some() => {
                        land(tgt, &spread, canon, plays, resolve(plays, &follow, missing))
                    }
                    Some(&plays) => land(tgt, &spread, canon, plays, tgt.resolve(plays, missing)),
                    None => resolve(canon, &encode, missing),
                };
                (canon, outcome)
            })
            .collect();
        let decode = decoding(src, overrides);
        Self {
            source: src,
            target: tgt,
            missing,
            spread,
            matched,
            edited: overrides.source().keys().copied().collect(),
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
            Some(Outcome::Direct(landing)) => Some(Destination::Drum {
                canon: landing.canon(),
                note: landing.note(),
            }),
            Some(fallback @ Outcome::Fallback(s)) => Some(Destination::Drum {
                canon: fallback.canon(),
                note: s.note(),
            }),
            Some(Outcome::Dropped { .. }) => None,
            None => self.unrecognized.keeps().then_some(Destination::Kept(note)),
        }
    }

    pub fn resolve_canon(&self, canon: Canon) -> Outcome {
        self.drums[&canon]
    }

    /// Where `canon` lands with no target edits.
    pub(crate) fn unedited(&self, canon: Canon) -> Outcome {
        let plays = self.matched_drum(canon).unwrap_or(canon);
        let resolved = self.target.resolve(plays, self.missing);
        land(self.target, &self.spread, canon, plays, resolved)
    }

    /// The target drum `canon` lands on by matching the source's, rather than by walking its
    /// chain: for an open main hi-hat, the opening of the target that matches the opening of
    /// the source, when both name their normal open hat; for a tom under
    /// [`MissingDrums::Nearest`], the same stroke on the target tom the [`TomSpread`] moves it
    /// to.
    pub(crate) fn matched_drum(&self, canon: Canon) -> Option<Canon> {
        self.matched.get(&canon).copied()
    }

    /// How the source's toms spread over the target's.
    #[cfg(test)]
    pub(crate) fn spread(&self) -> &TomSpread {
        &self.spread
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

fn matched_drum(
    src: &EngineMap,
    tgt: &EngineMap,
    spread: &TomSpread,
    canon: Canon,
) -> Option<Canon> {
    if let (Some((level, zone)), Some(from), Some(to)) =
        (canon.opening(), src.open_levels(), tgt.open_levels())
    {
        return Some(canon.at_open_level(from.toward(to, level, zone)));
    }
    let (pos, artic) = canon.tom()?;
    let to = match artic {
        TomArtic::Hit | TomArtic::Rimshot => spread.hit(pos),
        TomArtic::Rim => spread.rim(pos),
    }?;
    (to != pos).then(|| canon.at_tom_pos(to))
}

/// `canon` played as `plays`, where `plays` lands as `resolved`.
fn land(
    tgt: &EngineMap,
    spread: &TomSpread,
    canon: Canon,
    plays: Canon,
    resolved: Outcome,
) -> Outcome {
    match (canon.tom(), plays.tom()) {
        (Some((from, _)), Some((to, _))) if from != to => {
            spread_landing(tgt, spread, canon, from, to, resolved)
        }
        _ => resolved.for_drum(canon),
    }
}

/// The tom `canon`, at `from`, spread to the same stroke at `to`, which lands as `resolved`.
/// A tom the target has keeps landing directly, and its strokes count as that tom's wherever
/// it plays them; a tom the target lacks stands in, judged by its own drum as before.
fn spread_landing(
    tgt: &EngineMap,
    spread: &TomSpread,
    canon: Canon,
    from: TomPos,
    to: TomPos,
    resolved: Outcome,
) -> Outcome {
    let drum = match spread.hit(from) {
        Some(hit) if tgt.toms().hits().contains(&from) => canon.at_tom_pos(hit),
        _ => canon,
    };
    match resolved {
        Outcome::Direct(landing) if tgt.encode(canon).is_some() => {
            Outcome::Direct(Landing::spread_to(canon, to, landing.note()))
        }
        Outcome::Direct(landing) => {
            Outcome::Fallback(StandIn::new(canon, drum, landing.plays(), landing.note()))
        }
        Outcome::Fallback(s) => {
            Outcome::Fallback(StandIn::new(canon, drum, s.stand_in(), s.note()))
        }
        Outcome::Dropped { other_drum, .. } => Outcome::Dropped { canon, other_drum },
    }
}

fn decoding(src: &EngineMap, overrides: &Overrides) -> Decoding {
    let mut decode: Decoding = src.decodings().collect();
    for (&note, &canon) in overrides.source() {
        match canon {
            Some(canon) => decode.insert(note, canon),
            None => decode.remove(&note),
        };
    }
    decode
}

fn encoding<'e>(tgt: &EngineMap, edits: impl Iterator<Item = (&'e Canon, &'e Note)>) -> Encoding {
    tgt.encodings()
        .chain(edits.map(|(&canon, &note)| (canon, note)))
        .collect()
}

#[cfg(test)]
mod tests {
    use std::sync::LazyLock;

    use super::*;
    use crate::{
        canon::k,
        catalog::Catalog,
        engine_map::from_toml,
        note::n,
        resolution::{Landing, StandIn},
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

    fn openings(map: &EngineMap) -> Vec<Canon> {
        let mut played: Vec<Canon> = map
            .drums()
            .iter()
            .map(|d| d.entry.canon())
            .filter(|c| c.opening().is_some())
            .collect();
        played.sort();
        played.dedup();
        played
    }

    fn named_pairs() -> Vec<(&'static EngineMap, &'static EngineMap, Mapping<'static>)> {
        let catalog = Catalog::shared();
        let named: Vec<&EngineMap> = catalog
            .engines()
            .filter(|m| m.open_levels().is_some())
            .collect();
        named
            .iter()
            .flat_map(|&src| named.iter().map(move |&tgt| (src, tgt)))
            .map(|(src, tgt)| {
                let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
                (src, tgt, mapping)
            })
            .collect()
    }

    fn plays_in_zone(tgt: &EngineMap, canon: Canon) -> bool {
        openings(tgt)
            .iter()
            .any(|c| c.opening().map(|(_, z)| z) == canon.opening().map(|(_, z)| z))
    }

    #[test]
    fn an_opening_lands_exactly_in_its_zone_on_a_target_playing_that_zone() {
        for (src, tgt, mapping) in named_pairs() {
            for canon in openings(src).into_iter().filter(|&c| plays_in_zone(tgt, c)) {
                let outcome = mapping.resolve_canon(canon);
                let zone = outcome
                    .played()
                    .and_then(|(c, _)| c.opening())
                    .map(|(_, z)| z);
                assert!(
                    matches!(outcome, Outcome::Direct(_))
                        && zone == canon.opening().map(|(_, z)| z),
                    "{} -> {}: {canon} {outcome:?}",
                    src.id(),
                    tgt.id()
                );
            }
        }
    }

    #[test]
    fn every_main_open_hat_lands_on_the_targets_main_open_hat() {
        for (src, tgt, mapping) in named_pairs() {
            let (from, to) = (src.open_levels().unwrap(), tgt.open_levels().unwrap());
            let mains = openings(src)
                .into_iter()
                .filter(|c| c.opening().is_some_and(|(l, _)| l == from.main()))
                .filter(|c| tgt.encode(c.at_open_level(to.main())).is_some());
            for canon in mains {
                assert_eq!(
                    mapping.resolve_canon(canon).played().map(|(c, _)| c),
                    Some(canon.at_open_level(to.main())),
                    "{} -> {}: {canon}",
                    src.id(),
                    tgt.id()
                );
            }
        }
    }

    #[test]
    fn a_more_open_source_hat_never_lands_less_open() {
        for (src, tgt, mapping) in named_pairs() {
            let mut landed: Vec<_> = openings(src)
                .into_iter()
                .filter_map(|c| {
                    let (level, zone) = c.opening()?;
                    let (played, _) = mapping.resolve_canon(c).played()?;
                    Some((zone, level, played.opening()?.0))
                })
                .collect();
            landed.sort();
            let flipped = landed
                .windows(2)
                .find(|w| w[0].0 == w[1].0 && w[0].2 > w[1].2);
            assert_eq!(flipped, None, "{} -> {}", src.id(), tgt.id());
        }
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
        Some(Outcome::Direct(Landing::itself(k("kick.main"), n(note))))
    }

    #[test]
    fn target_override_beats_base() {
        let mapping = kick_and_snare_edited(r#"{"edits":{"kick.main":35},"srcEdits":{}}"#);
        assert_eq!(mapping.resolve_canon(k("kick.main")).note(), Some(n(35)));
    }

    #[test]
    fn target_override_leaves_other_drums_on_the_base() {
        let mapping = kick_and_snare_edited(r#"{"edits":{"kick.main":35},"srcEdits":{}}"#);
        assert_eq!(mapping.resolve_canon(k("snare1.hit")).note(), Some(n(38)));
    }

    #[test]
    fn source_override_with_null_canon_unassigns_the_note() {
        let mapping =
            kick_and_snare_edited(r#"{"edits":{},"srcEdits":{"36":null,"40":"kick.main"}}"#);
        assert_eq!(mapping.get(n(36)), None);
    }

    #[test]
    fn source_override_assigns_a_new_note_alongside_an_unassigned_one() {
        let mapping =
            kick_and_snare_edited(r#"{"edits":{},"srcEdits":{"36":null,"40":"kick.main"}}"#);
        assert_eq!(mapping.get(n(40)), kick_on(36));
    }

    #[test]
    fn source_override_rescues_a_note() {
        let mapping = kick_and_snare_edited(r#"{"edits":{},"srcEdits":{"99":"kick.main"}}"#);
        assert_eq!(mapping.get(n(99)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_a_base_note_mapped() {
        let mapping = kick_and_snare_edited(r#"{"edits":{},"srcEdits":{"99":"kick.main"}}"#);
        assert_eq!(mapping.get(n(36)), kick_on(36));
    }

    #[test]
    fn source_override_leaves_another_note_unmapped() {
        let mapping = kick_and_snare_edited(r#"{"edits":{},"srcEdits":{"99":"kick.main"}}"#);
        assert_eq!(mapping.get(n(50)), None);
    }

    #[test]
    fn drop_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = Outcome::Fallback(StandIn::new(canon, canon, k("snare1.hit"), n(38)));
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(canon),
            expected
        );
    }

    #[test]
    fn nearest_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = Outcome::Fallback(StandIn::new(canon, canon, k("snare1.hit"), n(38)));
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
            Outcome::Fallback(StandIn::new(canon, canon, k("crash.1.hit"), n(49)))
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
        let catalog = Catalog::builtin();
        for id in catalog.ids() {
            let tgt = catalog.get(id).unwrap();
            let nearest = onto(tgt, MissingDrums::Nearest);
            let dropping = onto(tgt, MissingDrums::Drop);
            for &canon in Canon::all() {
                let near = nearest.resolve_canon(canon);
                let drop = dropping.resolve_canon(canon);
                if let Outcome::Fallback(s) = drop {
                    let stand_in = s.stand_in();
                    assert!(canon.same_drum(stand_in), "{id}: {canon} -> {stand_in}");
                }
                match near {
                    Outcome::Direct(_) => assert_eq!(drop, near, "{id}: {canon}"),
                    Outcome::Dropped { .. } => assert_eq!(drop, near, "{id}: {canon}"),
                    Outcome::Fallback(s) => {
                        if canon.same_drum(s.stand_in()) {
                            assert_eq!(drop, near, "{id}: {canon}");
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn an_engine_resolves_a_drum_as_a_mapping_without_overrides_does() {
        let catalog = Catalog::builtin();
        for map in catalog.engines() {
            for missing in [MissingDrums::Nearest, MissingDrums::Drop] {
                let mapping = onto(map, missing);
                let unplayed_opening = |canon: Canon| {
                    canon.opening().is_some()
                        && map.open_levels().is_some()
                        && map.encode(canon).is_none()
                };
                for &canon in Canon::all().iter().filter(|&&c| !unplayed_opening(c)) {
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
            serde_json::from_str(r#"{"edits":{"china.1.hit":55},"srcEdits":{}}"#).unwrap();
        let mapping = Mapping::new(&src, &tgt, &ov, MissingDrums::Drop);
        assert_eq!(
            mapping.get(n(60)),
            Some(Outcome::Direct(Landing::itself(k("china.1.hit"), n(55))))
        );
    }

    #[test]
    fn a_target_edit_is_not_a_move_to_another_drum_under_drop() {
        let src = target(&[(60, "china.1.hit")]);
        let tgt = target(&[(49, "crash.1.hit")]);
        let ov: Overrides =
            serde_json::from_str(r#"{"edits":{"china.1.hit":55},"srcEdits":{}}"#).unwrap();
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
            Some(Outcome::Direct(Landing::itself(k("kick.main"), n(50))))
        );
    }

    #[test]
    fn fallback_walks_chain() {
        assert_eq!(
            mapping().get(n(11)),
            Some(Outcome::Fallback(StandIn::new(
                k("hat.open3"),
                k("hat.open3"),
                k("hat.open1"),
                n(61)
            )))
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
    fn a_muted_conga_plays_the_open_conga_under_drop() {
        let tgt = target(&[(60, "perc.conga.high")]);
        assert_eq!(
            onto(&tgt, MissingDrums::Drop).resolve_canon(k("perc.conga.high.mute")),
            Outcome::Fallback(StandIn::new(
                k("perc.conga.high.mute"),
                k("perc.conga.high.mute"),
                k("perc.conga.high"),
                n(60)
            ))
        );
    }

    #[test]
    fn a_muted_conga_never_plays_another_drum_under_nearest() {
        let tgt = target(&[(60, "perc.bongo.high"), (61, "perc.conga.low")]);
        assert_eq!(
            onto(&tgt, MissingDrums::Nearest).resolve_canon(k("perc.conga.high.mute")),
            Outcome::Dropped {
                canon: k("perc.conga.high.mute"),
                other_drum: false
            }
        );
    }

    #[test]
    fn a_general_midi_bongo_is_dropped_on_a_kit_without_one_even_when_keeping_unrecognized_notes() {
        let catalog = Catalog::builtin();
        let gm = catalog.get("general_midi").unwrap();
        let sd3 = catalog.get("superior_drummer3").unwrap();
        let mapping = Mapping::new(gm, sd3, &Overrides::default(), MissingDrums::Nearest)
            .with_unrecognized(Unrecognized::Keep);
        assert_eq!(
            mapping.get(n(60)),
            Some(Outcome::Dropped {
                canon: k("perc.bongo.high"),
                other_drum: false
            })
        );
        assert_eq!(mapping.destination(n(60)), None);
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
                canon: k("snare1.hit"),
                other_drum: false
            })
        );
    }

    #[test]
    fn a_drum_the_source_plays_and_the_target_lacks_is_dropped() {
        let catalog = Catalog::builtin();
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
        assert_eq!(Some(t.resolve_canon(k("hat.open3"))), t.get(n(11)));
    }
}
