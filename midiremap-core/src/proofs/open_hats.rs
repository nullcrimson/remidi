use strum::VariantArray;

use crate::{
    canon::{HatZone, OpenLevel},
    catalog::Catalog,
    open_levels::OpenLevels,
};

/// Every engine whose hi-hat opens in one zone: each set of levels it plays, with each of them
/// as its main level.
fn every_one_zone_hat(zone: HatZone) -> Vec<(Vec<OpenLevel>, OpenLevels)> {
    let all: Vec<OpenLevel> = OpenLevel::all().collect();
    (1..1u32 << all.len())
        .flat_map(|mask| {
            let played: Vec<OpenLevel> = all
                .iter()
                .enumerate()
                .filter(|&(i, _)| mask & (1 << i) != 0)
                .map(|(_, &l)| l)
                .collect();
            played
                .clone()
                .into_iter()
                .map(move |main| {
                    let levels = OpenLevels::new(played.iter().map(|&l| (l, zone)), main)
                        .expect("the main level is among the played ones");
                    (played.clone(), levels)
                })
                .collect::<Vec<_>>()
        })
        .collect()
}

/// What breaks the agreed rules when `from` plays its levels on `to`, both in one zone.
fn broken(from: &(Vec<OpenLevel>, OpenLevels), to: &(Vec<OpenLevel>, OpenLevels)) -> Vec<String> {
    let ((played, src), (among, tgt)) = (from, to);
    let land = |l: OpenLevel| src.toward(tgt, l, HatZone::Plain);
    let (from_main, to_main) = (src.main(), tgt.main());
    let mut out = Vec::new();
    for &l in played {
        let at = land(l);
        let side = l.cmp(&from_main);
        let target_side = among.iter().any(|t| t.cmp(&to_main) == side);
        let lands_on_side = at.cmp(&to_main) == side;
        if !among.contains(&at) {
            out.push(format!("{l} lands on {at}, which the target does not play"));
        }
        if side.is_eq() && at != to_main {
            out.push(format!("main {l} lands on {at}, not the main {to_main}"));
        }
        if side.is_ne() && lands_on_side != target_side {
            out.push(format!("{l} lands on {at}, on the wrong side of {to_main}"));
        }
    }
    for pair in played.windows(2) {
        if land(pair[0]) > land(pair[1]) {
            out.push(format!("{} lands more open than {}", pair[0], pair[1]));
        }
    }
    out
}

#[test]
fn every_open_level_lands_on_a_played_level_on_its_side_of_the_main_in_order() {
    let hats = every_one_zone_hat(HatZone::Plain);
    let failures: Vec<String> = hats
        .iter()
        .flat_map(|from| hats.iter().map(move |to| (from, to)))
        .flat_map(|(from, to)| {
            broken(from, to).into_iter().map(move |f| {
                format!(
                    "{:?} main {} -> {:?} main {}: {f}",
                    from.0,
                    from.1.main(),
                    to.0,
                    to.1.main()
                )
            })
        })
        .collect();
    assert_eq!(hats.len(), 192);
    assert!(
        failures.is_empty(),
        "{} breaks, e.g.\n{}",
        failures.len(),
        failures[..failures.len().min(25)].join("\n")
    );
}

#[test]
fn a_zone_that_plays_no_level_counts_among_the_levels_of_every_zone() {
    let in_plain = every_one_zone_hat(HatZone::Plain);
    let in_tip = every_one_zone_hat(HatZone::Tip);
    for ((played, src), (_, src_tip)) in in_plain.iter().zip(&in_tip) {
        for ((_, tgt), (_, tgt_tip)) in in_plain.iter().zip(&in_tip) {
            for &l in played {
                let plain = src.toward(tgt, l, HatZone::Plain);
                assert_eq!(src_tip.toward(tgt, l, HatZone::Plain), plain);
                assert_eq!(src.toward(tgt_tip, l, HatZone::Plain), plain);
            }
        }
    }
}

/// The levels `hat` plays in `zone`, or in any zone when it plays none there.
fn levels_in_zone(hat: &OpenLevels, zone: HatZone) -> Vec<OpenLevel> {
    let all: Vec<OpenLevel> = hat.played().iter().map(|&(_, l)| l).collect();
    let in_zone: Vec<OpenLevel> = hat
        .played()
        .iter()
        .filter(|&&(z, _)| z == zone)
        .map(|&(_, l)| l)
        .collect();
    let mut levels = if in_zone.is_empty() { all } else { in_zone };
    levels.sort();
    levels.dedup();
    levels
}

/// The level of `levels` nearest `hat`'s main level, the less open one on a tie.
fn zone_main(hat: &OpenLevels, levels: &[OpenLevel]) -> OpenLevel {
    let main = hat.main().get();
    *levels
        .iter()
        .min_by_key(|l| (l.get().abs_diff(main), l.get()))
        .expect("every zone has a level")
}

#[test]
fn every_builtin_pair_lands_each_open_level_in_its_zone_on_its_side_in_order() {
    let catalog = Catalog::shared();
    let hats: Vec<(&str, &OpenLevels)> = catalog
        .engines()
        .filter_map(|e| e.open_levels().map(|l| (e.id(), l)))
        .collect();
    let mut failures = Vec::new();
    for &(src_id, src) in &hats {
        for &(tgt_id, tgt) in &hats {
            for &zone in HatZone::VARIANTS {
                let (from, to) = (levels_in_zone(src, zone), levels_in_zone(tgt, zone));
                let (from_main, to_main) = (zone_main(src, &from), zone_main(tgt, &to));
                let landed: Vec<OpenLevel> =
                    from.iter().map(|&l| src.toward(tgt, l, zone)).collect();
                for (&l, &at) in from.iter().zip(&landed) {
                    let side = l.cmp(&from_main);
                    let room = to.iter().any(|t| t.cmp(&to_main) == side);
                    let ok = to.contains(&at)
                        && (side.is_ne() || at == to_main)
                        && (side.is_eq() || (at.cmp(&to_main) == side) == room);
                    if !ok {
                        failures.push(format!("{src_id} -> {tgt_id} {zone:?}: {l} lands on {at}"));
                    }
                }
                if landed.windows(2).any(|w| w[0] > w[1]) {
                    failures.push(format!("{src_id} -> {tgt_id} {zone:?}: order {landed:?}"));
                }
            }
        }
    }
    assert!(
        hats.len() > 40,
        "only {} engines have open levels",
        hats.len()
    );
    assert!(
        failures.is_empty(),
        "{} breaks, e.g.\n{}",
        failures.len(),
        failures[..failures.len().min(25)].join("\n")
    );
}
