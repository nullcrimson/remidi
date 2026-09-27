use std::collections::HashMap;

use serde::Serialize;

use crate::{
    canon::{Canon, FallbackResolver},
    engine_map::{Decoder, Encoder},
    note::Note,
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

pub struct Translator<'a> {
    decoder: &'a dyn Decoder,
    encoder: &'a dyn Encoder,
    resolver: &'a dyn FallbackResolver,
}

impl<'a> Translator<'a> {
    pub fn new(
        decoder: &'a dyn Decoder,
        encoder: &'a dyn Encoder,
        resolver: &'a dyn FallbackResolver,
    ) -> Self {
        Self {
            decoder,
            encoder,
            resolver,
        }
    }

    pub fn translate(&self, note: Note) -> Resolution {
        let Some(canon) = self.decoder.decode(note) else {
            return Resolution::Unmapped;
        };
        Resolution::Resolved(self.resolve_canon(canon))
    }

    pub fn resolve_canon(&self, canon: Canon) -> CanonResolution {
        if let Some(n) = self.encoder.encode(canon) {
            return CanonResolution::Direct { canon, note: n };
        }
        for alt in self.resolver.chain(canon) {
            if let Some(n) = self.encoder.encode(alt) {
                return CanonResolution::Fallback { canon, note: n };
            }
        }
        CanonResolution::Dropped { canon }
    }
}

pub trait ReportSink {
    fn record(&mut self, source_note: Note, resolution: &Resolution);
}

#[derive(Serialize, Debug, PartialEq, Eq)]
pub struct FallbackTally {
    pub note: Note,
    pub count: u32,
}

#[derive(Default, Serialize, Debug)]
pub struct Report {
    pub unmapped_source: HashMap<Note, u32>,
    pub fallback_used: HashMap<Canon, FallbackTally>,
    pub dropped: HashMap<Canon, u32>,
}

impl ReportSink for Report {
    fn record(&mut self, source_note: Note, resolution: &Resolution) {
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
        canon::{idx, DefaultFallbacks, HatOpen, HatZone, KickKind, SnareArtic},
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

    fn translator<'a>(
        src: &'a crate::engine_map::EngineMap,
        tgt: &'a crate::engine_map::EngineMap,
        fb: &'a DefaultFallbacks,
    ) -> Translator<'a> {
        Translator::new(src, tgt, fb)
    }

    #[test]
    fn direct_hit() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        assert_eq!(
            translator(&src, &tgt, &fb).translate(n(12)),
            Resolution::Resolved(CanonResolution::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50)
            })
        );
    }

    #[test]
    fn fallback_walks_chain() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        assert_eq!(
            translator(&src, &tgt, &fb).translate(n(11)),
            Resolution::Resolved(CanonResolution::Fallback {
                canon: Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain),
                note: n(60)
            })
        );
    }

    #[test]
    fn unmapped_when_source_lacks_note() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        assert_eq!(
            translator(&src, &tgt, &fb).translate(n(99)),
            Resolution::Unmapped
        );
    }

    #[test]
    fn dropped_when_target_and_chain_empty() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        assert_eq!(
            translator(&src, &tgt, &fb).translate(n(10)),
            Resolution::Resolved(CanonResolution::Dropped {
                canon: Canon::Snare(idx(1), SnareArtic::Hit)
            })
        );
    }

    #[test]
    fn resolve_canon_matches_translate_on_decoded_notes() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        let t = Translator::new(&src, &tgt, &fb);
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
}
