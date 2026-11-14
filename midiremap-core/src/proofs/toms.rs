use std::collections::{BTreeMap, BTreeSet};

use rayon::prelude::*;

use crate::{
    canon::{k, Canon, TomArtic, TomPos},
    catalog::Catalog,
    engine_map::EngineMap,
    overrides::Overrides,
    resolution::{MissingDrums, Outcome},
    translate::Mapping,
};

fn hit(pos: TomPos) -> Canon {
    k("tom.rack1.hit").at_tom_pos(pos)
}

fn rimshot(pos: TomPos) -> Canon {
    k("tom.rack1.rimshot").at_tom_pos(pos)
}

fn rim(pos: TomPos) -> Canon {
    k("tom.rack1.rim").at_tom_pos(pos)
}

/// The tom position `canon` plays on, when a tom plays it.
fn lands(mapping: &Mapping, canon: Canon) -> Option<Canon> {
    mapping
        .resolve_canon(canon)
        .played()
        .map(|(landed, _)| landed)
}

fn tom_of(canon: Canon) -> Option<TomPos> {
    canon.tom().map(|(pos, _)| pos)
}

fn in_order(landings: &[TomPos]) -> bool {
    landings.windows(2).all(|w| w[0] <= w[1])
}

/// The fewest toms that must cross between rack and floor to land `source` on as many of
/// `target`'s toms as possible, in order.
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
    let distinct: BTreeSet<TomPos> = fixed.iter().flatten().copied().collect();
    let mut gain = 0;
    let mut start = 0;
    while start < rims.len() {
        if fixed[start].is_some() {
            start += 1;
            continue;
        }
        let end = (start..rims.len())
            .find(|&i| fixed[i].is_some())
            .unwrap_or(rims.len());
        let below = start.checked_sub(1).and_then(|i| fixed[i]);
        let above = fixed.get(end).copied().flatten();
        let room = target
            .iter()
            .filter(|&&t| below.is_none_or(|b| t > b) && above.is_none_or(|a| t < a))
            .count();
        gain += (end - start).min(room);
        start = end;
    }
    distinct.len() + gain
}

fn failures(src: &EngineMap, tgt: &EngineMap) -> Vec<String> {
    let (source, target) = (src.toms(), tgt.toms());
    if source.hits().is_empty() || target.hits().is_empty() {
        return Vec::new();
    }
    let near = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let pair = format!("{} -> {}", src.id(), tgt.id());
    let mut out = Vec::new();
    let mut fail = |what: String| out.push(format!("{pair}: {what}"));

    let landing: BTreeMap<TomPos, TomPos> = source
        .hits()
        .iter()
        .filter_map(|&p| lands(&near, hit(p)).and_then(tom_of).map(|to| (p, to)))
        .collect();
    let order: Vec<TomPos> = landing.values().copied().collect();
    if landing.len() != source.hits().len() {
        fail(format!("not every tom hit lands on a tom: {landing:?}"));
        return out;
    }
    if !in_order(&order) {
        fail(format!("toms out of order: {order:?}"));
    }
    let distinct: BTreeSet<TomPos> = order.iter().copied().collect();
    if distinct.len() != source.hits().len().min(target.hits().len()) {
        fail(format!("uses {} distinct toms: {order:?}", distinct.len()));
    }
    let crossings = landing
        .iter()
        .filter(|(from, to)| from.is_rack() != to.is_rack())
        .count();
    if crossings != fewest_crossings(source.hits(), target.hits()) {
        fail(format!(
            "{crossings} toms cross between rack and floor: {order:?}"
        ));
    }
    if source.hits().is_subset(target.hits()) && landing.iter().any(|(from, to)| from != to) {
        fail(format!(
            "moves a tom the target has with no need: {landing:?}"
        ));
    }

    for (&from, &to) in &landing {
        let outcome = near.resolve_canon(hit(from));
        let ok = match outcome {
            Outcome::Direct(_) => tgt.encode(hit(from)).is_some(),
            Outcome::Fallback(_) => {
                tgt.encode(hit(from)).is_none() && outcome.moves_to_other_drum()
            }
            Outcome::Dropped { .. } => false,
        };
        if !ok {
            fail(format!("{} lands as {outcome:?}", hit(from)));
        }
        if src.encode(rimshot(from)).is_some() {
            let want = if tgt.encode(rimshot(to)).is_some() {
                rimshot(to)
            } else {
                hit(to)
            };
            let got = lands(&near, rimshot(from));
            if got != Some(want) {
                fail(format!("{} lands on {got:?}, not {want}", rimshot(from)));
            }
            let own_drum = target.hits().contains(&from);
            if own_drum
                && got == Some(hit(to))
                && near.resolve_canon(rimshot(from)).moves_to_other_drum()
            {
                fail(format!(
                    "{} counts as another drum on its own tom",
                    rimshot(from)
                ));
            }
        }
    }

    let rims: Vec<TomPos> = source.rims().iter().copied().collect();
    if !rims.is_empty() && !target.rims().is_empty() {
        let anchor = |r: TomPos| landing.get(&r).copied().unwrap_or(r);
        let rim_landing: Vec<Option<TomPos>> = rims
            .iter()
            .map(|&r| {
                lands(&near, rim(r))
                    .and_then(|c| c.tom())
                    .filter(|&(_, stroke)| stroke == TomArtic::Rim)
                    .map(|(pos, _)| pos)
            })
            .collect();
        let Some(rim_order): Option<Vec<TomPos>> = rim_landing.iter().copied().collect() else {
            fail(format!(
                "a rim lands off the target's rims: {rim_landing:?}"
            ));
            return out;
        };
        if !in_order(&rim_order) {
            fail(format!("rims out of order: {rim_order:?}"));
        }
        for (&r, &to) in rims.iter().zip(&rim_order) {
            let a = anchor(r);
            if target.rims().contains(&a) && to != a {
                fail(format!("{} leaves its drum {a:?} for {to:?}", rim(r)));
            }
        }
        let used: BTreeSet<TomPos> = rim_order.iter().copied().collect();
        let most = most_distinct_rims(&rims, anchor, target.rims());
        if used.len() != most {
            fail(format!(
                "rims use {} distinct rims, {most} possible: {rim_order:?}",
                used.len()
            ));
        }
    }
    out
}

#[test]
fn every_builtin_pair_spreads_its_toms_over_the_targets() {
    let catalog = Catalog::builtin();
    let engines: Vec<&EngineMap> = catalog.engines().collect();
    let failures: Vec<String> = engines
        .par_iter()
        .flat_map_iter(|&src| engines.iter().flat_map(move |&tgt| failures(src, tgt)))
        .collect();
    assert!(
        failures.is_empty(),
        "{} tom landings break the spread, e.g.\n{}",
        failures.len(),
        failures[..failures.len().min(25)].join("\n")
    );
}
