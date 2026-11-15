use std::cmp::Reverse;

use serde::Serialize;

use super::hits::NoteHits;
use crate::engine::{Catalog, EngineId};

/// How many of the hits one engine's layout recognizes.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct SourceFit {
    engine: EngineId,
    recognized: u32,
}

impl SourceFit {
    pub fn engine(&self) -> &EngineId {
        &self.engine
    }

    /// The hits on notes the engine's map decodes: the ones converting from it keeps.
    pub fn recognized(&self) -> u32 {
        self.recognized
    }
}

/// Every engine of a catalog fitted to the same hits, best first; no engine recognizes more
/// than `hits`.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct SourceFits {
    hits: u32,
    ranked: Vec<SourceFit>,
}

impl SourceFits {
    /// Every hit, on any note.
    pub fn hits(&self) -> u32 {
        self.hits
    }

    /// The fits, best first: the most recognized hits, ties in catalog order.
    pub fn ranked(&self) -> &[SourceFit] {
        &self.ranked
    }
}

/// Every engine of `catalog` fitted to `hits`, best first: the most recognized hits, ties in
/// catalog order.
pub fn source_fits(catalog: &Catalog, hits: &NoteHits) -> SourceFits {
    let mut ranked: Vec<SourceFit> = catalog
        .engines()
        .map(|engine| SourceFit {
            engine: engine.into(),
            recognized: hits.recognized_by(engine),
        })
        .collect();
    ranked.sort_by_key(|fit| Reverse(fit.recognized));
    SourceFits {
        hits: hits.total(),
        ranked,
    }
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, engine_json, on, tracks, DRUMS};

    use super::*;
    use crate::{
        convert::convert,
        engine::EngineMap,
        inspect::note_hits,
        mapping::{Mapping, MissingDrums, Overrides},
        parts::ChannelScope,
    };

    fn engine(id: &str, notes: &[u8]) -> EngineMap {
        let canons = ["kick.main", "snare1.hit", "hat.closed"];
        let notes: Vec<(u8, &str)> = notes.iter().copied().zip(canons).collect();
        EngineMap::from_json(&engine_json(id, &notes).to_string()).unwrap()
    }

    fn ranked(catalog: &Catalog, midi: &[u8]) -> (u32, Vec<(String, u32)>) {
        let fits = source_fits(catalog, &note_hits(midi, ChannelScope::Auto).unwrap());
        let ranked = fits
            .ranked()
            .iter()
            .map(|fit| (fit.engine().as_str().to_owned(), fit.recognized()))
            .collect();
        (fits.hits(), ranked)
    }

    fn three_engines() -> Catalog {
        Catalog::from_maps([
            engine("a_partial", &[36]),
            engine("b_none", &[60]),
            engine("c_full", &[36, 38, 42]),
            engine("d_partial", &[36, 61]),
        ])
        .unwrap()
    }

    #[test]
    fn source_fits_rank_engines_by_the_hits_they_recognize_ties_in_catalog_order() {
        let midi = drums(&[(0, on(36)), (0, on(36)), (0, on(38)), (0, on(42))]);
        assert_eq!(
            ranked(&three_engines(), &midi),
            (
                4,
                vec![
                    ("c_full".to_owned(), 4),
                    ("a_partial".to_owned(), 2),
                    ("d_partial".to_owned(), 2),
                    ("b_none".to_owned(), 0),
                ]
            )
        );
    }

    #[test]
    fn source_fits_agree_with_what_converting_removes_as_unrecognized() {
        let midi = tracks(&[
            &[(0, DRUMS, on(24)), (0, DRUMS, on(99)), (0, DRUMS, on(99))],
            &[(0, 1, on(26))],
        ]);
        let catalog = Catalog::builtin();
        let hits = note_hits(&midi, ChannelScope::Auto).unwrap();
        let src = catalog.get("ggd_invasion").unwrap();
        let tgt = catalog.get("ezdrummer").unwrap();
        let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
        let report = convert(&midi, &mapping, ChannelScope::Auto)
            .map(|c| c.done().expect("converted"))
            .unwrap()
            .report;
        let fits = source_fits(&catalog, &hits);
        let fit = fits
            .ranked()
            .iter()
            .find(|fit| fit.engine().as_str() == "ggd_invasion")
            .unwrap();
        let unmapped: u32 = report.unmapped_source().map(|(_, count)| count).sum();
        assert_eq!(
            (fits.hits(), fits.hits() - fit.recognized()),
            (report.hits() - report.untouched(), unmapped)
        );
    }
}
