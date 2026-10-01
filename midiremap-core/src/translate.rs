use std::{collections::BTreeMap, fmt, str::FromStr};

use serde::{Deserialize, Serialize, Serializer};

use crate::{canon::Canon, engine_map::EngineMap, note::Note, overrides::Overrides};

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum CanonResolution {
    Direct { canon: Canon, note: Note },
    Fallback { canon: Canon, note: Note },
    Dropped { canon: Canon },
}

impl CanonResolution {
    pub fn canon(&self) -> Canon {
        match self {
            Self::Direct { canon, .. } | Self::Fallback { canon, .. } | Self::Dropped { canon } => {
                *canon
            }
        }
    }

    pub fn note(&self) -> Option<Note> {
        match self {
            Self::Direct { note, .. } | Self::Fallback { note, .. } => Some(*note),
            Self::Dropped { .. } => None,
        }
    }
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Resolution {
    Resolved(CanonResolution),
    Unmapped,
}

/// What happens to a drum the target engine lacks.
#[derive(Copy, Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
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

impl fmt::Display for MissingDrums {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Nearest => "nearest",
            Self::Drop => "drop",
        })
    }
}

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("missing drums must be 'nearest' or 'drop', not '{0}'")]
pub struct MissingDrumsParseError(String);

impl FromStr for MissingDrums {
    type Err = MissingDrumsParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "nearest" => Ok(Self::Nearest),
            "drop" => Ok(Self::Drop),
            other => Err(MissingDrumsParseError(other.to_owned())),
        }
    }
}

/// A source and a target engine with overrides applied: the hub-and-spoke pipeline for
/// one conversion.
pub struct Mapping {
    src: EngineMap,
    tgt: EngineMap,
    missing: MissingDrums,
}

impl Mapping {
    pub fn new(
        src: &EngineMap,
        tgt: &EngineMap,
        overrides: &Overrides,
        missing: MissingDrums,
    ) -> Self {
        Self {
            src: src.with_source_overrides(&overrides.src),
            tgt: tgt.with_target_overrides(&overrides.tgt),
            missing,
        }
    }

    pub fn translate(&self, note: Note) -> Resolution {
        self.src.decode(note).map_or(Resolution::Unmapped, |canon| {
            Resolution::Resolved(self.resolve_canon(canon))
        })
    }

    pub fn resolve_canon(&self, canon: Canon) -> CanonResolution {
        resolve(canon, &self.tgt, self.missing)
    }

    /// Whether the target lacks `canon` and its nearest stand-in is another drum, so the
    /// [`MissingDrums`] setting decides what plays it.
    pub fn moves_to_other_drum(&self, canon: Canon) -> bool {
        self.tgt.encode(canon).is_none()
            && substitute(canon, &self.tgt, MissingDrums::Nearest)
                .is_some_and(|(alt, _)| !canon.same_drum(alt))
    }
}

pub(crate) fn substitute(
    canon: Canon,
    tgt: &EngineMap,
    missing: MissingDrums,
) -> Option<(Canon, Note)> {
    canon
        .fallback_chain()
        .iter()
        .copied()
        .filter(|&alt| missing.allows(canon, alt))
        .find_map(|alt| tgt.encode(alt).map(|note| (alt, note)))
}

/// Resolves a canon against a target: directly, else the nearest fallback `missing` allows.
pub(crate) fn resolve(canon: Canon, tgt: &EngineMap, missing: MissingDrums) -> CanonResolution {
    if let Some(note) = tgt.encode(canon) {
        return CanonResolution::Direct { canon, note };
    }
    substitute(canon, tgt, missing).map_or(CanonResolution::Dropped { canon }, |(_, note)| {
        CanonResolution::Fallback { canon, note }
    })
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct FallbackTally {
    pub note: Note,
    pub count: u32,
}

/// What a conversion did with each note hit; only the converter tallies it.
#[derive(Default, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Report {
    #[serde(serialize_with = "string_keys")]
    #[cfg_attr(feature = "ts", tsify(type = "Record<string, number>"))]
    unmapped_source: BTreeMap<Note, u32>,
    fallback_used: BTreeMap<Canon, FallbackTally>,
    dropped: BTreeMap<Canon, u32>,
    untouched: u32,
    converted: u32,
}

fn string_keys<S: Serializer>(map: &BTreeMap<Note, u32>, s: S) -> Result<S::Ok, S::Error> {
    s.collect_map(map.iter().map(|(note, count)| (note.to_string(), count)))
}

impl Report {
    /// Hits on source notes the source engine does not map, by note.
    pub fn unmapped_source(&self) -> &BTreeMap<Note, u32> {
        &self.unmapped_source
    }

    /// Hits played on a stand-in because the target lacks the drum, by drum.
    pub fn fallback_used(&self) -> &BTreeMap<Canon, FallbackTally> {
        &self.fallback_used
    }

    /// Hits left out because nothing on the target may play them, by drum.
    pub fn dropped(&self) -> &BTreeMap<Canon, u32> {
        &self.dropped
    }

    /// Note hits left as they were because the channel scope did not select them.
    pub fn untouched(&self) -> u32 {
        self.untouched
    }

    /// Note hits written to the output, directly or on a substitute.
    pub fn converted(&self) -> u32 {
        self.converted
    }

    pub(crate) fn record_untouched(&mut self) {
        self.untouched += 1;
    }

    /// Tallies one source hit; direct hits only count as converted.
    pub(crate) fn record(&mut self, source_note: Note, resolution: &Resolution) {
        match resolution {
            Resolution::Unmapped => *self.unmapped_source.entry(source_note).or_default() += 1,
            Resolution::Resolved(CanonResolution::Fallback { canon, note }) => {
                self.converted += 1;
                self.fallback_used
                    .entry(*canon)
                    .or_insert(FallbackTally {
                        note: *note,
                        count: 0,
                    })
                    .count += 1
            }
            Resolution::Resolved(CanonResolution::Dropped { canon }) => {
                *self.dropped.entry(*canon).or_default() += 1
            }
            Resolution::Resolved(CanonResolution::Direct { .. }) => self.converted += 1,
        }
    }
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

    #[test]
    fn drop_keeps_a_same_drum_articulation_fallback() {
        let tgt = target(&[(38, "snare1.hit")]);
        let canon = k("snare1.rimshot");
        let expected = CanonResolution::Fallback { canon, note: n(38) };
        assert_eq!(resolve(canon, &tgt, MissingDrums::Drop), expected);
        assert_eq!(resolve(canon, &tgt, MissingDrums::Nearest), expected);
    }

    #[test]
    fn drop_leaves_out_a_swap_that_nearest_plays() {
        let tgt = target(&[(49, "crash.1.hit")]);
        let canon = k("china.1.hit");
        assert_eq!(
            resolve(canon, &tgt, MissingDrums::Nearest),
            CanonResolution::Fallback { canon, note: n(49) }
        );
        assert_eq!(
            resolve(canon, &tgt, MissingDrums::Drop),
            CanonResolution::Dropped { canon }
        );
    }

    #[test]
    fn both_modes_keep_the_same_drum_before_another() {
        let tgt = target(&[(40, "snare1.rimshot"), (41, "snare2.hit")]);
        let canon = k("snare2.rimshot");
        assert_eq!(
            resolve(canon, &tgt, MissingDrums::Nearest).note(),
            Some(n(41))
        );
        assert_eq!(resolve(canon, &tgt, MissingDrums::Drop).note(), Some(n(41)));
    }

    #[test]
    fn drop_never_plays_another_drum_on_any_builtin_target() {
        let catalog = Catalog::builtin().unwrap();
        for id in catalog.ids() {
            let tgt = catalog.get(id).unwrap();
            for &canon in Canon::all() {
                let near = resolve(canon, tgt, MissingDrums::Nearest);
                let drop = resolve(canon, tgt, MissingDrums::Drop);
                if let Some((alt, _)) = substitute(canon, tgt, MissingDrums::Drop) {
                    assert!(canon.same_drum(alt), "{id}: {canon} -> {alt}");
                }
                match &near {
                    CanonResolution::Direct { .. } | CanonResolution::Dropped { .. } => {
                        assert_eq!(drop, near, "{id}: {canon}")
                    }
                    CanonResolution::Fallback { .. } => {
                        if let Some((alt, _)) = substitute(canon, tgt, MissingDrums::Nearest) {
                            if canon.same_drum(alt) {
                                assert_eq!(drop, near, "{id}: {canon}");
                            }
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn a_target_edit_wins_under_drop() {
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
        assert!(!mapping.moves_to_other_drum(k("china.1.hit")));
    }

    #[test]
    fn moves_to_other_drum_only_for_swaps() {
        let src = target(&[(1, "kick.main")]);
        let tgt = target(&[(36, "kick.main"), (38, "snare1.hit"), (49, "crash.1.hit")]);
        for missing in [MissingDrums::Nearest, MissingDrums::Drop] {
            let mapping = Mapping::new(&src, &tgt, &Overrides::default(), missing);
            assert!(mapping.moves_to_other_drum(k("china.1.hit")));
            assert!(mapping.moves_to_other_drum(k("snare2.hit")));
            assert!(!mapping.moves_to_other_drum(k("snare1.rimshot")));
            assert!(!mapping.moves_to_other_drum(k("kick.main")));
            assert!(!mapping.moves_to_other_drum(k("perc.cowbell")));
        }
    }

    #[test]
    fn missing_drums_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&MissingDrums::Drop).unwrap(),
            r#""drop""#
        );
        assert_eq!(
            serde_json::from_str::<MissingDrums>(r#""nearest""#).unwrap(),
            MissingDrums::Nearest
        );
        assert!(serde_json::from_str::<MissingDrums>(r#""maybe""#).is_err());
    }

    #[test]
    fn missing_drums_parses_and_prints_its_two_values() {
        assert_eq!(MissingDrums::default(), MissingDrums::Nearest);
        for m in [MissingDrums::Nearest, MissingDrums::Drop] {
            assert_eq!(m.to_string().parse::<MissingDrums>().unwrap(), m);
        }
        assert_eq!("drop".parse::<MissingDrums>().unwrap(), MissingDrums::Drop);
        let err = "maybe".parse::<MissingDrums>().unwrap_err().to_string();
        assert!(
            err.contains("maybe") && err.contains("nearest") && err.contains("drop"),
            "{err}"
        );
    }

    #[test]
    fn direct_hit() {
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
                note: n(61)
            })
        );
    }

    #[test]
    fn an_open_hat_never_plays_closed() {
        let tgt = target(&[(60, "hat.closed")]);
        let canon = k("hat.open3");
        for missing in [MissingDrums::Nearest, MissingDrums::Drop] {
            assert_eq!(
                resolve(canon, &tgt, missing),
                CanonResolution::Dropped { canon }
            );
        }
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
                canon: Canon::Snare(idx(1), SnareArtic::Hit)
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
        assert_eq!(
            t.resolve_canon(Canon::Snare(idx(1), SnareArtic::Hit)),
            CanonResolution::Dropped {
                canon: Canon::Snare(idx(1), SnareArtic::Hit)
            }
        );
    }

    #[test]
    fn report_tallies_each_arm() {
        let mut r = Report::default();
        r.record(n(99), &Resolution::Unmapped);
        r.record(
            n(11),
            &Resolution::Resolved(CanonResolution::Fallback {
                canon: Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain),
                note: n(60),
            }),
        );
        r.record(
            n(10),
            &Resolution::Resolved(CanonResolution::Dropped {
                canon: Canon::Snare(idx(1), SnareArtic::Hit),
            }),
        );
        r.record(
            n(12),
            &Resolution::Resolved(CanonResolution::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50),
            }),
        );
        assert_eq!(r.unmapped_source.get(&n(99)), Some(&1));
        assert_eq!(
            r.fallback_used
                .get(&Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain)),
            Some(&FallbackTally {
                note: n(60),
                count: 1
            })
        );
        assert_eq!(
            r.dropped.get(&Canon::Snare(idx(1), SnareArtic::Hit)),
            Some(&1)
        );
        assert!(!r.unmapped_source.contains_key(&n(12)));
        assert_eq!(r.converted(), 2);
        assert_eq!(r.untouched(), 0);
        r.record_untouched();
        assert_eq!(r.untouched(), 1);
    }

    #[test]
    fn report_serializes_sorted_with_string_note_keys() {
        let mut r = Report::default();
        for note in [99, 5, 12, 5] {
            r.record(n(note), &Resolution::Unmapped);
        }
        for key in ["splash.1.hit", "china.1.hit"] {
            r.record(
                n(1),
                &Resolution::Resolved(CanonResolution::Dropped {
                    canon: key.parse().unwrap(),
                }),
            );
        }
        assert_eq!(
            serde_json::to_string(&r).unwrap(),
            r#"{"unmappedSource":{"5":2,"12":1,"99":1},"fallbackUsed":{},"dropped":{"china.1.hit":1,"splash.1.hit":1},"untouched":0,"converted":0}"#
        );
    }
}
