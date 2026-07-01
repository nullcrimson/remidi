use std::collections::HashMap;

use serde::Serialize;

use crate::{
    canon::{Canon, FallbackResolver},
    engine_map::{Decoder, Encoder},
};

#[derive(Debug, PartialEq)]
pub enum CanonResolution {
    Direct { note: u8 },
    Fallback { canon: Canon, note: u8 },
    Dropped { canon: Canon },
}

#[derive(Debug, PartialEq)]
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

    pub fn translate(&self, note: u8) -> Resolution {
        let Some(canon) = self.decoder.decode(note) else {
            return Resolution::Unmapped;
        };
        Resolution::Resolved(self.resolve_canon(canon))
    }

    pub fn resolve_canon(&self, canon: Canon) -> CanonResolution {
        if let Some(n) = self.encoder.encode(canon) {
            return CanonResolution::Direct { note: n };
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
    fn record(&mut self, source_note: u8, resolution: &Resolution);
}

#[derive(Default, Serialize, Debug)]
pub struct Report {
    pub unmapped_source: HashMap<u8, u32>,
    pub fallback_used: HashMap<Canon, u32>,
    pub dropped: HashMap<Canon, u32>,
}

impl ReportSink for Report {
    fn record(&mut self, source_note: u8, resolution: &Resolution) {
        match resolution {
            Resolution::Unmapped => *self.unmapped_source.entry(source_note).or_default() += 1,
            Resolution::Resolved(CanonResolution::Fallback { canon, .. }) => {
                *self.fallback_used.entry(*canon).or_default() += 1
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
        canon::{DefaultFallbacks, HatOpen, HatZone, SnareArtic},
        engine_map::from_toml,
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
            translator(&src, &tgt, &fb).translate(12),
            Resolution::Resolved(CanonResolution::Direct { note: 50 })
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
            translator(&src, &tgt, &fb).translate(11),
            Resolution::Resolved(CanonResolution::Fallback {
                canon: Canon::Hat(HatOpen::Open(3), HatZone::Plain),
                note: 60
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
            translator(&src, &tgt, &fb).translate(99),
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
            translator(&src, &tgt, &fb).translate(10),
            Resolution::Resolved(CanonResolution::Dropped {
                canon: Canon::Snare(1, SnareArtic::Hit)
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
            Resolution::Resolved(t.resolve_canon(Canon::Hat(HatOpen::Open(3), HatZone::Plain))),
            t.translate(11)
        );
        assert_eq!(
            t.resolve_canon(Canon::Snare(1, SnareArtic::Hit)),
            CanonResolution::Dropped {
                canon: Canon::Snare(1, SnareArtic::Hit)
            }
        );
    }

    #[test]
    fn report_tallies_each_arm() {
        let mut r = Report::default();
        r.record(99, &Resolution::Unmapped);
        r.record(
            11,
            &Resolution::Resolved(CanonResolution::Fallback {
                canon: Canon::Hat(HatOpen::Open(3), HatZone::Plain),
                note: 60,
            }),
        );
        r.record(
            10,
            &Resolution::Resolved(CanonResolution::Dropped {
                canon: Canon::Snare(1, SnareArtic::Hit),
            }),
        );
        r.record(
            12,
            &Resolution::Resolved(CanonResolution::Direct { note: 50 }),
        );
        assert_eq!(r.unmapped_source.get(&99), Some(&1));
        assert_eq!(
            r.fallback_used
                .get(&Canon::Hat(HatOpen::Open(3), HatZone::Plain)),
            Some(&1)
        );
        assert_eq!(r.dropped.get(&Canon::Snare(1, SnareArtic::Hit)), Some(&1));
        assert!(!r.unmapped_source.contains_key(&12));
    }
}
