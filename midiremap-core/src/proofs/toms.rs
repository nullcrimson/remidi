use std::collections::{BTreeMap, BTreeSet};

use rayon::prelude::*;

use super::{all_pairs, assert_none};
use crate::{
    canon::{k, Canon, TomArtic, TomPos},
    engine_map::EngineMap,
    overrides::Overrides,
    resolution::{MissingDrums, Outcome},
    tom_spread::TomKit,
    translate::Mapping,
};

fn stroke(pos: TomPos, stroke: TomArtic) -> Canon {
    let key = match stroke {
        TomArtic::Hit => "tom.rack1.hit",
        TomArtic::Rim => "tom.rack1.rim",
        TomArtic::Rimshot => "tom.rack1.rimshot",
    };
    k(key).at_tom_pos(pos)
}

/// A pair whose kits both have toms, its mapping under `Nearest`, and the target tom each
/// source tom hit lands on.
struct Spread<'a> {
    label: String,
    src: &'a EngineMap,
    tgt: &'a EngineMap,
    near: Mapping<'a>,
    hits: BTreeMap<TomPos, TomPos>,
}

impl<'a> Spread<'a> {
    fn new(src: &'a EngineMap, tgt: &'a EngineMap) -> Option<Self> {
        if src.toms().hits().is_empty() || tgt.toms().hits().is_empty() {
            return None;
        }
        let near = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
        let hits = src
            .toms()
            .hits()
            .iter()
            .filter_map(|&p| Some((p, near_tom(&near, stroke(p, TomArtic::Hit))?.0)))
            .collect();
        Some(Self {
            label: format!("{} -> {}", src.id(), tgt.id()),
            src,
            tgt,
            near,
            hits,
        })
    }

    fn source(&self) -> &TomKit {
        self.src.toms()
    }

    fn target(&self) -> &TomKit {
        self.tgt.toms()
    }

    fn landings(&self) -> Vec<TomPos> {
        self.hits.values().copied().collect()
    }

    fn fail(&self, what: impl std::fmt::Display) -> String {
        format!("{}: {what}", self.label)
    }
}

/// The tom position and stroke `canon` plays as, when a tom plays it.
fn near_tom(near: &Mapping, canon: Canon) -> Option<(TomPos, TomArtic)> {
    near.resolve_canon(canon).played()?.0.tom()
}

fn every_spread(check: impl Fn(&Spread) -> Vec<String> + Sync) -> Vec<String> {
    all_pairs()
        .par_iter()
        .filter_map(|&(src, tgt)| Spread::new(src, tgt))
        .flat_map_iter(|s| check(&s))
        .collect()
}

#[test]
fn every_builtin_pair_lands_its_tom_hits_in_order_on_as_many_toms_as_it_can() {
    let failures = every_spread(|s| {
        let landings = s.landings();
        let distinct: BTreeSet<TomPos> = landings.iter().copied().collect();
        let most = s.source().hits().len().min(s.target().hits().len());
        [
            (s.hits.len() != s.source().hits().len())
                .then(|| s.fail(format_args!("a tom hit lands off the toms: {:?}", s.hits))),
            (!landings.is_sorted()).then(|| s.fail(format_args!("out of order: {landings:?}"))),
            (distinct.len() != most).then(|| {
                s.fail(format_args!(
                    "{} of {most} toms used: {landings:?}",
                    distinct.len()
                ))
            }),
        ]
        .into_iter()
        .flatten()
        .collect()
    });
    assert_none(&failures, "tom spreads lose order or pitches");
}

/// The fewest toms that must cross between rack and floor to land `source` in order on as
/// many of `target`'s toms as possible.
fn fewest_crossings(source: &BTreeSet<TomPos>, target: &BTreeSet<TomPos>) -> usize {
    let racks = |set: &BTreeSet<TomPos>| set.iter().filter(|p| p.is_rack()).count();
    let (sr, tr) = (racks(source), racks(target));
    let (sf, tf) = (source.len() - sr, target.len() - tr);
    if tr == 0 {
        sr
    } else if tf == 0 {
        sf
    } else {
        source
            .len()
            .min(target.len())
            .saturating_sub(sr.min(tr) + sf.min(tf))
    }
}

#[test]
fn every_builtin_pair_crosses_toms_between_rack_and_floor_only_where_it_must() {
    let failures = every_spread(|s| {
        let crossings = s
            .hits
            .iter()
            .filter(|(from, to)| from.is_rack() != to.is_rack())
            .count();
        let fewest = fewest_crossings(s.source().hits(), s.target().hits());
        (crossings != fewest)
            .then(|| {
                s.fail(format_args!(
                    "{crossings} cross, {fewest} must: {:?}",
                    s.hits
                ))
            })
            .into_iter()
            .collect()
    });
    assert_none(
        &failures,
        "tom spreads cross between rack and floor needlessly",
    );
}

#[test]
fn every_builtin_pair_keeps_its_toms_in_place_on_a_target_with_all_of_them() {
    let failures = every_spread(|s| {
        let all_there = s.source().hits().is_subset(s.target().hits());
        (all_there && s.hits.iter().any(|(from, to)| from != to))
            .then(|| s.fail(format_args!("moves toms it need not: {:?}", s.hits)))
            .into_iter()
            .collect()
    });
    assert_none(&failures, "tom spreads move toms the target has");
}

#[test]
fn every_builtin_tom_the_target_has_lands_directly_and_a_missing_one_stands_in() {
    let failures = every_spread(|s| {
        s.hits
            .keys()
            .filter_map(|&from| {
                let hit = stroke(from, TomArtic::Hit);
                let outcome = s.near.resolve_canon(hit);
                let ok = match outcome {
                    Outcome::Direct(_) => s.tgt.encode(hit).is_some(),
                    Outcome::Fallback(_) => {
                        s.tgt.encode(hit).is_none() && outcome.moves_to_other_drum()
                    }
                    Outcome::Dropped { .. } => false,
                };
                (!ok).then(|| s.fail(format_args!("{hit} lands as {outcome:?}")))
            })
            .collect()
    });
    assert_none(&failures, "tom hits land as the wrong outcome");
}

#[test]
fn every_builtin_rimshot_lands_on_its_spread_toms_rimshot_or_hit_as_the_same_drum() {
    let failures = every_spread(|s| {
        s.hits
            .iter()
            .filter(|&(&from, _)| s.src.encode(stroke(from, TomArtic::Rimshot)).is_some())
            .flat_map(|(&from, &to)| {
                let rimshot = stroke(from, TomArtic::Rimshot);
                let want = if s.tgt.encode(stroke(to, TomArtic::Rimshot)).is_some() {
                    (to, TomArtic::Rimshot)
                } else {
                    (to, TomArtic::Hit)
                };
                let got = near_tom(&s.near, rimshot);
                let own_drum = s.target().hits().contains(&from);
                let swapped = s.near.resolve_canon(rimshot).moves_to_other_drum();
                [
                    (got != Some(want))
                        .then(|| s.fail(format_args!("{rimshot} lands on {got:?}, not {want:?}"))),
                    (own_drum && swapped)
                        .then(|| s.fail(format_args!("{rimshot} counts as another drum"))),
                ]
            })
            .flatten()
            .collect()
    });
    assert_none(&failures, "rimshots leave their tom");
}

/// The runs of rims with no fixed tom, each with the fixed toms just below and above it.
fn free_runs(
    fixed: &[Option<TomPos>],
) -> impl Iterator<Item = (Option<TomPos>, usize, Option<TomPos>)> + '_ {
    let starts = fixed
        .chunk_by(|a, b| a.is_none() && b.is_none())
        .scan(0, |start, run| {
            let at = *start;
            *start += run.len();
            Some((at, run))
        });
    starts.filter(|(_, run)| run[0].is_none()).map(|(at, run)| {
        let below = at.checked_sub(1).and_then(|i| fixed[i]);
        let above = fixed.get(at + run.len()).copied().flatten();
        (below, run.len(), above)
    })
}

/// The most distinct target rims an in-order landing of `rims` can use while each rim whose
/// `anchor` the target has a rim on lands there.
fn most_distinct_rims(
    rims: &[TomPos],
    anchor: impl Fn(TomPos) -> TomPos,
    target: &BTreeSet<TomPos>,
) -> usize {
    let fixed: Vec<Option<TomPos>> = rims
        .iter()
        .map(|&r| Some(anchor(r)).filter(|a| target.contains(a)))
        .collect();
    let kept: BTreeSet<TomPos> = fixed.iter().flatten().copied().collect();
    let room = |below: Option<TomPos>, above: Option<TomPos>| {
        target
            .iter()
            .filter(|&&t| below.is_none_or(|b| t > b) && above.is_none_or(|a| t < a))
            .count()
    };
    kept.len()
        + free_runs(&fixed)
            .map(|(below, len, above)| len.min(room(below, above)))
            .sum::<usize>()
}

#[test]
fn every_builtin_rim_stays_on_its_drum_and_uses_as_many_rims_as_it_can() {
    let failures = every_spread(|s| {
        let rims: Vec<TomPos> = s.source().rims().iter().copied().collect();
        if rims.is_empty() || s.target().rims().is_empty() {
            return Vec::new();
        }
        let anchor = |r: TomPos| s.hits.get(&r).copied().unwrap_or(r);
        let landings: Option<Vec<TomPos>> = rims
            .iter()
            .map(|&r| match near_tom(&s.near, stroke(r, TomArtic::Rim)) {
                Some((to, TomArtic::Rim)) => Some(to),
                _ => None,
            })
            .collect();
        let Some(landings) = landings else {
            return vec![s.fail("a rim lands off the target's rims")];
        };
        let split = rims
            .iter()
            .zip(&landings)
            .filter(|&(&r, &to)| s.target().rims().contains(&anchor(r)) && to != anchor(r))
            .map(|(&r, &to)| s.fail(format_args!("rim {r:?} leaves its drum for {to:?}")));
        let used = landings.iter().collect::<BTreeSet<_>>().len();
        let most = most_distinct_rims(&rims, anchor, s.target().rims());
        split
            .chain(
                (!landings.is_sorted())
                    .then(|| s.fail(format_args!("rims out of order: {landings:?}"))),
            )
            .chain(
                (used != most)
                    .then(|| s.fail(format_args!("{used} of {most} rims used: {landings:?}"))),
            )
            .collect()
    });
    assert_none(&failures, "rim spreads split a drum or lose a rim");
}
