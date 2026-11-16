use std::cmp::Ordering;

use midiremap_kit::{
    canon::{HatZone, OpenLevel, Rung},
    engine::{Catalog, HatLadder},
};
use strum::VariantArray;

use super::assert_none;

/// Every engine whose hi-hat plays some open levels, loose or not: each set of rungs it plays,
/// each rung in the zone `place` gives it, with each of its levels as its main level.
fn every_hat(place: impl Fn(Rung) -> HatZone) -> Vec<HatLadder> {
    let all: Vec<OpenLevel> = OpenLevel::all().collect();
    let mut hats = Vec::new();
    for loose in [false, true] {
        for mask in 1..1u32 << all.len() {
            let levels: Vec<OpenLevel> = all
                .iter()
                .enumerate()
                .filter(|&(i, _)| mask & (1 << i) != 0)
                .map(|(_, &l)| l)
                .collect();
            let rungs: Vec<Rung> = loose
                .then_some(Rung::Loose)
                .into_iter()
                .chain(levels.iter().copied().map(Rung::Level))
                .collect();
            for &main in &levels {
                let played = rungs.iter().map(|&r| (r, place(r)));
                hats.push(
                    HatLadder::new(played, main).expect("the main level is among the played ones"),
                );
            }
        }
    }
    hats
}

/// The rungs of `rungs` on `side` of `main`, nearest it first.
fn outward(rungs: &[Rung], main: Rung, side: Ordering) -> Vec<Rung> {
    let mut on_side: Vec<Rung> = rungs
        .iter()
        .copied()
        .filter(|r| r.cmp(&main) == side)
        .collect();
    on_side.sort_by_key(|r| r.distance(main));
    on_side
}

/// What breaks the agreed rules when `src` plays its rungs of `zone` on `tgt`, each engine
/// counted among the rungs its ladder counts among there.
fn breaks(src: &HatLadder, tgt: &HatLadder, zone: HatZone) -> Vec<String> {
    let (from, to) = (src.rungs_in(zone), tgt.rungs_in(zone));
    let (from_main, to_main) = (Rung::Level(src.main()), Rung::Level(tgt.main()));
    let land = |r: Rung| src.toward(tgt, r, zone);
    let main_at = land(from_main);
    let mut out = Vec::new();
    let nearest = to
        .iter()
        .all(|t| t.distance(to_main) >= main_at.distance(to_main));
    if !to.contains(&main_at) || (to.contains(&to_main) && main_at != to_main) || !nearest {
        out.push(format!(
            "the main level lands on {main_at:?}, not the zone's rung nearest {to_main:?}"
        ));
    }
    for &r in &from {
        let at = land(r);
        let side = r.cmp(&from_main);
        let room = to.iter().any(|t| t.cmp(&to_main) == side);
        if !to.contains(&at) {
            out.push(format!(
                "{r:?} lands on {at:?}, which the zone does not play"
            ));
        }
        let on_side = if side.is_ne() && room {
            at.cmp(&to_main) == side
        } else {
            at == main_at
        };
        if !on_side {
            out.push(format!(
                "{r:?} lands on {at:?}, off its side of {to_main:?}"
            ));
        }
    }
    let landed: Vec<Rung> = from.iter().map(|&r| land(r)).collect();
    if landed.windows(2).any(|w| w[0] > w[1]) {
        out.push(format!("order {landed:?}"));
    }
    for side in [Ordering::Less, Ordering::Greater] {
        let theirs = outward(&to, to_main, side);
        let mine: Vec<Rung> = outward(&from, from_main, side)
            .into_iter()
            .map(land)
            .collect();
        if mine
            .windows(2)
            .any(|w| w[0] == w[1] && theirs.last().is_some_and(|&last| w[0] != last))
        {
            out.push(format!(
                "{side:?}: {mine:?} share a rung before the last of {theirs:?}"
            ));
        }
        let mut used: Vec<Rung> = mine
            .iter()
            .copied()
            .filter(|at| at.cmp(&to_main) == side)
            .collect();
        used.dedup();
        if theirs.get(..used.len()) != Some(&used[..]) {
            out.push(format!("{side:?}: {mine:?} skip a rung of {theirs:?}"));
        }
    }
    out
}

#[test]
fn every_rung_lands_on_a_played_rung_on_its_side_of_the_main_in_order() {
    let hats = every_hat(|_| HatZone::Plain);
    let failures: Vec<String> = hats
        .iter()
        .flat_map(|src| hats.iter().map(move |tgt| (src, tgt)))
        .flat_map(|(src, tgt)| {
            breaks(src, tgt, HatZone::Plain).into_iter().map(move |f| {
                format!(
                    "{:?} main {} -> {:?} main {}: {f}",
                    src.rungs_in(HatZone::Plain),
                    src.main(),
                    tgt.rungs_in(HatZone::Plain),
                    tgt.main()
                )
            })
        })
        .collect();
    assert_eq!(hats.len(), 384);
    assert_none(&failures, "breaks");
}

#[test]
fn a_zone_that_plays_no_level_counts_among_the_levels_of_every_zone() {
    let in_plain = every_hat(|_| HatZone::Plain);
    let in_tip = every_hat(|_| HatZone::Tip);
    let loose_apart = every_hat(|r| match r {
        Rung::Loose => HatZone::Plain,
        Rung::Level(_) => HatZone::Tip,
    });
    let hats: Vec<(&HatLadder, &HatLadder, &HatLadder)> = in_plain
        .iter()
        .zip(&in_tip)
        .zip(&loose_apart)
        .map(|((plain, tip), apart)| (plain, tip, apart))
        .collect();
    for &(src, src_tip, src_apart) in &hats {
        for &(tgt, tgt_tip, tgt_apart) in &hats {
            for r in src.rungs_in(HatZone::Plain) {
                let plain = src.toward(tgt, r, HatZone::Plain);
                assert_eq!(src_tip.toward(tgt, r, HatZone::Plain), plain);
                assert_eq!(src.toward(tgt_tip, r, HatZone::Plain), plain);
                assert_eq!(src_apart.toward(tgt, r, HatZone::Plain), plain);
                assert_eq!(src.toward(tgt_apart, r, HatZone::Plain), plain);
            }
        }
    }
}

#[test]
fn every_builtin_pair_lands_each_rung_in_its_zone_on_its_side_in_order() {
    let catalog = Catalog::shared();
    let hats: Vec<(&str, &HatLadder)> = catalog
        .engines()
        .filter_map(|e| e.hat_ladder().map(|l| (e.id(), l)))
        .collect();
    let mut failures = Vec::new();
    for &(src_id, src) in &hats {
        for &(tgt_id, tgt) in &hats {
            for &zone in HatZone::VARIANTS {
                failures.extend(
                    breaks(src, tgt, zone)
                        .into_iter()
                        .map(|f| format!("{src_id} -> {tgt_id} {zone:?}: {f}")),
                );
            }
        }
    }
    assert!(
        hats.len() > 40,
        "only {} engines have a hat ladder",
        hats.len()
    );
    assert_none(&failures, "breaks");
}
