use std::collections::HashMap;

use serde::Serialize;

use crate::{
    canon::{Canon, FallbackResolver},
    engine_map::{Decoder, Encoder},
};

/// Outcome of resolving one source note through source -> canon -> target.
/// Pure data; recording it in a [`Report`] is the caller's concern.
#[derive(Debug, PartialEq)]
pub enum Resolution {
    /// Target plays this canonical slot directly.
    Direct { note: u8 },
    /// Approximated via a fallback chain.
    Fallback { canon: Canon, note: u8 },
    /// Source note has no canonical meaning.
    Unmapped,
    /// Canon exists but the target can't play it and no fallback applied.
    Dropped { canon: Canon },
}

/// A directed engine→engine note translator: source decoder + target encoder +
/// fallback resolver. This *is* the hub-and-spoke pipeline, with no MIDI
/// knowledge and no side effects.
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

    /// Reads as the spec sentence: note → canon → target → fallback walk → drop.
    pub fn translate(&self, note: u8) -> Resolution {
        let Some(canon) = self.decoder.decode(note) else {
            return Resolution::Unmapped;
        };
        if let Some(n) = self.encoder.encode(canon) {
            return Resolution::Direct { note: n };
        }
        for &alt in self.resolver.chain(canon) {
            if let Some(n) = self.encoder.encode(alt) {
                return Resolution::Fallback { canon, note: n };
            }
        }
        Resolution::Dropped { canon }
    }
}

/// Observer for lossy/approximated translations. Counting policy lives here, in
/// one place, decoupled from the translation decision.
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
            Resolution::Unmapped => *self.unmapped_source.entry(source_note).or_insert(0) += 1,
            Resolution::Fallback { canon, .. } => {
                *self.fallback_used.entry(*canon).or_insert(0) += 1
            }
            Resolution::Dropped { canon } => *self.dropped.entry(*canon).or_insert(0) += 1,
            Resolution::Direct { .. } => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{canon::DefaultFallbacks, engine_map::from_toml};

    // Synthetic source: 10=SnareCenter (empty chain), 11=HatOpen3, 12=KickMain.
    const SRC: &str = r#"
        id = "src"
        name = "Src"
        notes = [
          { note = 10, canon = "SnareCenter", primary = true },
          { note = 11, canon = "HatOpen3", primary = true },
          { note = 12, canon = "KickMain", primary = true },
        ]
    "#;
    // Target that can play KickMain (50) and HatClosed (60) only.
    const TGT: &str = r#"
        id = "tgt"
        name = "Tgt"
        notes = [
          { note = 50, canon = "KickMain", primary = true },
          { note = 60, canon = "HatClosed", primary = true },
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
            Resolution::Direct { note: 50 }
        );
    }

    #[test]
    fn fallback_walks_chain() {
        let (src, tgt, fb) = (
            from_toml(SRC).unwrap(),
            from_toml(TGT).unwrap(),
            DefaultFallbacks,
        );
        // HatOpen3 -> HatOpen2 -> HatOpen1 -> HatClosed (60)
        assert_eq!(
            translator(&src, &tgt, &fb).translate(11),
            Resolution::Fallback {
                canon: Canon::HatOpen3,
                note: 60
            }
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
        // SnareCenter has an empty chain and the target lacks it.
        assert_eq!(
            translator(&src, &tgt, &fb).translate(10),
            Resolution::Dropped {
                canon: Canon::SnareCenter
            }
        );
    }

    #[test]
    fn report_tallies_each_arm() {
        let mut r = Report::default();
        r.record(99, &Resolution::Unmapped);
        r.record(
            11,
            &Resolution::Fallback {
                canon: Canon::HatOpen3,
                note: 60,
            },
        );
        r.record(
            10,
            &Resolution::Dropped {
                canon: Canon::SnareCenter,
            },
        );
        r.record(12, &Resolution::Direct { note: 50 });
        assert_eq!(r.unmapped_source.get(&99), Some(&1));
        assert_eq!(r.fallback_used.get(&Canon::HatOpen3), Some(&1));
        assert_eq!(r.dropped.get(&Canon::SnareCenter), Some(&1));
        // Direct hits are not recorded.
        assert!(!r.unmapped_source.contains_key(&12));
    }
}
