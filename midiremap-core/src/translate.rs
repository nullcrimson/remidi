use std::collections::BTreeMap;

use serde::{Serialize, Serializer};

use crate::{
    canon::{fallback, Canon},
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
};

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

/// A source and a target engine with overrides applied: the hub-and-spoke pipeline for
/// one conversion.
pub struct Mapping {
    src: EngineMap,
    tgt: EngineMap,
}

impl Mapping {
    pub fn new(src: &EngineMap, tgt: &EngineMap, overrides: &Overrides) -> Self {
        Self {
            src: src.with_source_overrides(&overrides.src),
            tgt: tgt.with_target_overrides(&overrides.tgt),
        }
    }

    pub fn translate(&self, note: Note) -> Resolution {
        self.src.decode(note).map_or(Resolution::Unmapped, |canon| {
            Resolution::Resolved(self.resolve_canon(canon))
        })
    }

    pub fn resolve_canon(&self, canon: Canon) -> CanonResolution {
        resolve(canon, &self.tgt)
    }
}

/// Resolves a canon against a target: directly, else the nearest fallback it can play.
pub fn resolve(canon: Canon, tgt: &EngineMap) -> CanonResolution {
    if let Some(note) = tgt.encode(canon) {
        return CanonResolution::Direct { canon, note };
    }
    fallback(canon)
        .into_iter()
        .find_map(|alt| tgt.encode(alt))
        .map_or(CanonResolution::Dropped { canon }, |note| {
            CanonResolution::Fallback { canon, note }
        })
}

#[derive(Serialize, Debug, PartialEq, Eq)]
pub struct FallbackTally {
    pub note: Note,
    pub count: u32,
}

#[derive(Default, Serialize, Debug)]
pub struct Report {
    #[serde(serialize_with = "string_keys")]
    pub unmapped_source: BTreeMap<Note, u32>,
    pub fallback_used: BTreeMap<Canon, FallbackTally>,
    pub dropped: BTreeMap<Canon, u32>,
}

fn string_keys<S: Serializer>(map: &BTreeMap<Note, u32>, s: S) -> Result<S::Ok, S::Error> {
    s.collect_map(map.iter().map(|(note, count)| (note.to_string(), count)))
}

impl Report {
    /// Tallies one source hit; direct hits are not recorded.
    pub fn record(&mut self, source_note: Note, resolution: &Resolution) {
        match resolution {
            Resolution::Unmapped => *self.unmapped_source.entry(source_note).or_default() += 1,
            Resolution::Resolved(CanonResolution::Fallback { canon, note }) => {
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
            Resolution::Resolved(CanonResolution::Direct { .. }) => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, HatOpen, HatZone, KickKind, SnareArtic},
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
        ]
    "#;

    fn mapping() -> Mapping {
        Mapping::new(
            &from_toml(SRC).unwrap(),
            &from_toml(TGT).unwrap(),
            &Overrides::default(),
        )
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
                note: n(60)
            })
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
            r#"{"unmapped_source":{"5":2,"12":1,"99":1},"fallback_used":{},"dropped":{"china.1.hit":1,"splash.1.hit":1}}"#
        );
    }
}
