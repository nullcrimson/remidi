use midiremap_kit::engine::{Catalog, EngineId, EngineMap};
use serde::Serialize;

use super::{
    fit::{first_above, Lacks, SourceFit},
    hits::NoteHits,
};
use crate::share::{Fraction, Share};

/// The fewest hits read that the advice names an engine for, and so that Convert asks about:
/// one-note probes and edge-case files miss all or nothing, and an engine guessed from a few
/// notes is one the visitor may never have heard of.
const NAMED_MIN_HITS: u32 = 16;

/// The share of the hits read that a source must miss before Convert asks about it.
const ASK_MISSED: Fraction = Fraction::new(1, 3).expect("three is not zero");

/// What to tell a visitor about the chosen source.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub enum SourceAdvice {
    /// The source recognizes every hit.
    Fits,
    /// The source misses hits, and no engine is named: fewer than `NAMED_MIN_HITS` hits were
    /// read, or no other engine recognizes more of them.
    Unknown,
    /// The engine that recognizes the most hits is the target the advice was computed for:
    /// the file may already be in its layout.
    LooksLikeTarget(Named),
    /// Another engine recognizes more hits than the source, the best of them for the target
    /// as [`source_advice`] ranks them.
    Suggest {
        engine: EngineId,
        #[serde(flatten)]
        named: Named,
    },
}

impl SourceAdvice {
    /// What the advice says of the engine it names, when it names one.
    pub fn named(&self) -> Option<&Named> {
        match self {
            Self::Fits | Self::Unknown => None,
            Self::LooksLikeTarget(named) | Self::Suggest { named, .. } => Some(named),
        }
    }
}

/// What the advice says when it names an engine: `missing` of `hits` are hits the source does
/// not recognize; `recognized` are the hits the engine named recognizes; `ask` is what the
/// source lacks when Convert asks before converting.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub struct Named {
    pub missing: u32,
    pub hits: u32,
    pub recognized: u32,
    pub ask: Option<Lacks>,
}

/// The advice for one source and target, with the ids it was computed for: a reader holding
/// another pair knows it is stale.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Advised {
    source: EngineId,
    target: Option<EngineId>,
    advice: SourceAdvice,
}

impl Advised {
    pub fn advice(&self) -> &SourceAdvice {
        &self.advice
    }

    pub fn target(&self) -> Option<&EngineId> {
        self.target.as_ref()
    }
}

/// What to tell a visitor converting `hits` from `src` to `tgt`: [`SourceAdvice::Fits`] when
/// `src` recognizes every hit; otherwise, from `NAMED_MIN_HITS` hits read, the best engine of
/// `catalog` for `tgt` among those that recognize more hits than `src`, named as the target or
/// suggested; and [`SourceAdvice::Unknown`] when fewer hits were read or there is no such
/// engine. Engines rank by the most recognized hits, then the better standing, then the most
/// kick, snare and hi-hat hits, then the engines of `tgt`'s vendor, then `tgt` itself, then by
/// id.
pub fn source_advice(
    catalog: &Catalog,
    hits: &NoteHits,
    src: &EngineMap,
    tgt: Option<&EngineMap>,
) -> Advised {
    let own = SourceFit::of(hits, src);
    let advice = match own.missed().filter(|missed| missed.part() > 0) {
        None => SourceAdvice::Fits,
        Some(missed) => missed_advice(catalog, hits, &own, missed, tgt),
    };
    Advised {
        source: EngineId::from(src),
        target: tgt.map(EngineId::from),
        advice,
    }
}

/// The advice for a source that fits as `own` and misses the `missed` share of `hits`.
fn missed_advice(
    catalog: &Catalog,
    hits: &NoteHits,
    own: &SourceFit,
    missed: Share,
    tgt: Option<&EngineMap>,
) -> SourceAdvice {
    if missed.whole() < NAMED_MIN_HITS {
        return SourceAdvice::Unknown;
    }
    let Some(best) = first_above(catalog, hits, own.recognized(), tgt) else {
        return SourceAdvice::Unknown;
    };
    let named = Named {
        missing: missed.part(),
        hits: missed.whole(),
        recognized: best.recognized(),
        ask: asks(own, &best, missed),
    };
    if tgt.map(EngineId::from).as_ref() == Some(best.engine()) {
        SourceAdvice::LooksLikeTarget(named)
    } else {
        SourceAdvice::Suggest {
            engine: best.engine().clone(),
            named,
        }
    }
}

/// What `own` lacks when Convert asks first: the source misses a third or more of the hits and
/// reads no kick or no snare, and the `candidate` reads both.
fn asks(own: &SourceFit, candidate: &SourceFit, missed: Share) -> Option<Lacks> {
    let asked = missed.reaches(ASK_MISSED) && candidate.lacks().is_none();
    asked.then(|| own.lacks()).flatten()
}

#[cfg(test)]
mod tests {
    use midiremap_smf::parts::ChannelScope;
    use midiremap_testkit::{engine_json, played};

    use super::*;
    use crate::inspect::note_hits;

    const KICK: &str = "kick.main";
    const SNARE: &str = "snare1.hit";
    const HAT: &str = "hat.closed";

    fn engine(id: &str, notes: &[(u8, &str)]) -> EngineMap {
        EngineMap::from_json(&engine_json(id, notes).to_string()).unwrap()
    }

    fn hits_of(keys: &[(u8, usize)]) -> NoteHits {
        note_hits(&played(keys), ChannelScope::Auto).unwrap()
    }

    fn advise(engines: Vec<EngineMap>, hits: &NoteHits, src: &str, tgt: Option<&str>) -> Advised {
        let catalog = Catalog::from_maps(engines).unwrap();
        let source = catalog.get(src).unwrap();
        source_advice(&catalog, hits, source, tgt.and_then(|t| catalog.get(t)))
    }

    fn kit(id: &str) -> EngineMap {
        engine(id, &[(36, KICK), (38, SNARE), (42, HAT)])
    }

    fn groove() -> NoteHits {
        hits_of(&[(36, 6), (38, 5), (42, 5)])
    }

    /// What Convert asks about when the source `own` is read beside a full kit, over `kicks`
    /// kick, `snares` snare and `hats` hi-hat hits.
    fn asked(own: &[(u8, &str)], kicks: usize, snares: usize, hats: usize) -> Option<Lacks> {
        asked_beside(own, kit("b"), kicks, snares, hats)
    }

    fn asked_beside(
        own: &[(u8, &str)],
        candidate: EngineMap,
        kicks: usize,
        snares: usize,
        hats: usize,
    ) -> Option<Lacks> {
        let hits = hits_of(&[(36, kicks), (38, snares), (42, hats)]);
        let advised = advise(vec![engine("a", own), candidate], &hits, "a", None);
        advised
            .advice()
            .named()
            .expect("a source missing hits beside a full kit is told of an engine")
            .ask
    }

    #[test]
    fn a_source_that_recognizes_every_hit_fits() {
        let advised = advise(vec![kit("a"), kit("b")], &groove(), "a", Some("b"));
        assert_eq!(advised.advice(), &SourceAdvice::Fits);
    }

    #[test]
    fn a_source_fits_a_file_without_hits() {
        let advised = advise(vec![kit("a")], &NoteHits::default(), "a", None);
        assert_eq!(advised.advice(), &SourceAdvice::Fits);
    }

    #[test]
    fn a_source_no_engine_reads_better_is_unknown() {
        let partial = engine("a", &[(36, KICK)]);
        let advised = advise(
            vec![partial, engine("b", &[(38, SNARE)])],
            &groove(),
            "a",
            None,
        );
        assert_eq!(advised.advice(), &SourceAdvice::Unknown);
    }

    #[test]
    fn the_best_other_engine_is_suggested() {
        let partial = engine("a", &[(36, KICK)]);
        let advised = advise(
            vec![partial, kit("b"), engine("c", &[(36, KICK), (38, SNARE)])],
            &groove(),
            "a",
            None,
        );
        assert_eq!(
            advised.advice(),
            &SourceAdvice::Suggest {
                engine: EngineId::new("b"),
                named: Named {
                    missing: 10,
                    hits: 16,
                    recognized: 16,
                    ask: Some(Lacks::Snare),
                },
            }
        );
    }

    #[test]
    fn the_target_is_named_when_it_ranks_first() {
        let partial = engine("a", &[(36, KICK)]);
        let advised = advise(vec![partial, kit("b"), kit("t")], &groove(), "a", Some("t"));
        assert_eq!(
            advised.advice(),
            &SourceAdvice::LooksLikeTarget(Named {
                missing: 10,
                hits: 16,
                recognized: 16,
                ask: Some(Lacks::Snare),
            })
        );
    }

    fn few() -> NoteHits {
        hits_of(&[(36, 5), (38, 5), (42, 5)])
    }

    #[test]
    fn suggests_no_engine_below_sixteen_hits() {
        let partial = engine("a", &[(36, KICK)]);
        let advised = advise(vec![partial, kit("b")], &few(), "a", None);
        assert_eq!(advised.advice(), &SourceAdvice::Unknown);
    }

    #[test]
    fn names_no_target_below_sixteen_hits() {
        let partial = engine("a", &[(36, KICK)]);
        let advised = advise(vec![partial, kit("t")], &few(), "a", Some("t"));
        assert_eq!(advised.advice(), &SourceAdvice::Unknown);
    }

    #[test]
    fn the_advice_names_the_source_and_target_it_was_computed_for() {
        let advised = advise(vec![kit("a"), kit("b")], &groove(), "a", Some("b"));
        assert_eq!(
            advised,
            Advised {
                source: EngineId::new("a"),
                target: Some(EngineId::new("b")),
                advice: SourceAdvice::Fits,
            }
        );
    }

    #[test]
    fn asks_from_sixteen_hits() {
        assert_eq!(asked(&[(38, SNARE), (42, HAT)], 6, 5, 5), Some(Lacks::Kick));
    }

    const KICK_AND_HAT: [(u8, &str); 2] = [(36, KICK), (42, HAT)];

    #[test]
    fn asks_when_a_third_is_missed() {
        assert_eq!(asked(&KICK_AND_HAT, 16, 16, 16), Some(Lacks::Snare));
    }

    #[test]
    fn does_not_ask_when_less_than_a_third_is_missed() {
        assert_eq!(asked(&KICK_AND_HAT, 17, 15, 16), None);
    }

    #[test]
    fn does_not_ask_a_source_that_reads_a_kick_and_a_snare() {
        assert_eq!(asked(&[(36, KICK), (38, SNARE)], 8, 8, 32), None);
    }

    #[test]
    fn does_not_ask_when_the_candidate_reads_no_snare() {
        let kick_and_hat = engine("b", &KICK_AND_HAT);
        assert_eq!(asked_beside(&[(42, HAT)], kick_and_hat, 16, 16, 16), None);
    }

    #[test]
    fn does_not_ask_when_the_candidate_reads_no_kick() {
        let snare_and_hat = engine("b", &[(38, SNARE), (42, HAT)]);
        assert_eq!(asked_beside(&[(42, HAT)], snare_and_hat, 16, 16, 16), None);
    }

    #[test]
    fn says_what_the_source_lacks() {
        assert_eq!(asked(&[(42, HAT)], 16, 16, 16), Some(Lacks::KickAndSnare));
    }

    #[test]
    fn the_target_case_asks_too() {
        let hats = engine("a", &[(42, HAT)]);
        let advised = advise(
            vec![hats, kit("t")],
            &hits_of(&[(36, 8), (38, 8), (42, 8)]),
            "a",
            Some("t"),
        );
        assert_eq!(
            advised.advice(),
            &SourceAdvice::LooksLikeTarget(Named {
                missing: 16,
                hits: 24,
                recognized: 24,
                ask: Some(Lacks::KickAndSnare),
            })
        );
    }
}
