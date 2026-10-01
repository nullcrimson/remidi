use std::{
    collections::{HashMap, VecDeque},
    iter::once,
    mem::discriminant,
    sync::LazyLock,
};

use super::{
    tom_positions, Canon, CymArtic, CymSlot, HatOpen, HatZone, Idx, KickKind, OpenLevel, RackIdx,
    RideArtic, RideIdx, SnareArtic, SnareIdx, TomArtic, TomPos,
};

fn kick_order(k: KickKind) -> &'static [KickKind] {
    use KickKind::*;
    match k {
        Main => &[Alt, Left],
        Alt => &[Main, Left],
        Left => &[Main, Alt],
    }
}

fn snare_order(a: SnareArtic) -> &'static [SnareArtic] {
    use SnareArtic::*;
    match a {
        Hit => &[Side],
        Side | Rimshot | Flam | Off => &[Hit],
        Rim => &[Sidestick],
        Sidestick => &[Rim],
        Ruff => &[Flam, Hit],
    }
}

fn tom_order(a: TomArtic) -> &'static [TomArtic] {
    match a {
        TomArtic::Rimshot => &[TomArtic::Hit],
        TomArtic::Hit | TomArtic::Rim => &[],
    }
}

fn cym_order(a: CymArtic) -> &'static [CymArtic] {
    use CymArtic::*;
    match a {
        Hit => &[Edge],
        Edge => &[Hit],
        Bow => &[BowTip],
        BowTip => &[Bow],
        Bell => &[BellTip],
        BellTip => &[Bell],
        Mute => &[Hit, Edge],
    }
}

fn ride_order(a: RideArtic) -> &'static [RideArtic] {
    use RideArtic::*;
    match a {
        Bow => &[BowTip],
        BowTip => &[Bow],
        Bell => &[BellTip],
        BellTip => &[Bell],
        Mute => &[Bow, BowTip],
        Edge => &[],
    }
}

fn open_level(o: HatOpen) -> u8 {
    match o {
        HatOpen::Open(n) => n.get(),
        _ => 0,
    }
}

fn opening_order(o: HatOpen) -> Vec<HatOpen> {
    use HatOpen::*;
    match o {
        Tight => vec![Closed, Cc],
        Closed => vec![Tight, Cc],
        Cc => vec![Closed, Tight],
        Pedal => Vec::new(),
        PedalSplash => vec![Pedal],
        Loose | Open(_) => {
            let mut others: Vec<HatOpen> = once(Loose)
                .chain(OpenLevel::all().map(Open))
                .filter(|&x| x != o)
                .collect();
            others.sort_by_key(|&x| (open_level(x).abs_diff(open_level(o)), open_level(x)));
            others
        }
    }
}

fn zone_order(from: HatZone, opening: HatOpen) -> &'static [HatZone] {
    use HatZone::*;
    let sounds_open = matches!(
        opening,
        HatOpen::Loose | HatOpen::Open(_) | HatOpen::PedalSplash
    );
    match from {
        Plain if sounds_open => &[Plain, Edge, Tip],
        Plain => &[Plain, Tip, Edge],
        Tip => &[Tip, Plain, Edge],
        Edge => &[Edge, Plain, Tip],
        Bell => &[Bell, Edge, Tip, Plain],
    }
}

fn hat_order(o: HatOpen, z: HatZone) -> Vec<(HatOpen, HatZone)> {
    let own = zone_order(z, o).iter().skip(1).map(|&zone| (o, zone));
    let others = opening_order(o)
        .into_iter()
        .flat_map(|to| zone_order(z, to).iter().map(move |&zone| (to, zone)));
    own.chain(others).collect()
}

/// The other strokes of the same drum that may stand in for this one, nearest first.
fn variants(c: Canon) -> Vec<Canon> {
    match c {
        Canon::Kick(k) => kick_order(k).iter().map(|&b| Canon::Kick(b)).collect(),
        Canon::Snare(i, a) => snare_order(a).iter().map(|&b| Canon::Snare(i, b)).collect(),
        Canon::Tom(p, a) => tom_order(a).iter().map(|&b| Canon::Tom(p, b)).collect(),
        Canon::Hat(o, z) => hat_order(o, z)
            .into_iter()
            .map(|(o, z)| Canon::Hat(o, z))
            .collect(),
        Canon::Aux(i, o, z) => hat_order(o, z)
            .into_iter()
            .map(|(o, z)| Canon::Aux(i, o, z))
            .collect(),
        Canon::Cymbal(s, a) => cym_order(a).iter().map(|&b| Canon::Cymbal(s, b)).collect(),
        Canon::Ride(i, a) => ride_order(a).iter().map(|&b| Canon::Ride(i, b)).collect(),
        Canon::Perc(_) => Vec::new(),
    }
}

fn tom_rank(p: TomPos) -> u8 {
    match p {
        TomPos::Rack(n) => n.get() - 1,
        TomPos::Floor(n) => RackIdx::MAX + n.get() - 1,
    }
}

fn tom_neighbors(p: TomPos) -> Vec<TomPos> {
    let r = i16::from(tom_rank(p));
    let mut others: Vec<TomPos> = tom_positions().filter(|&q| q != p).collect();
    others.sort_by_key(|&q| {
        let d = (i16::from(tom_rank(q)) - r).abs();
        (d, tom_rank(q))
    });
    others
}

fn cymbals_like(slot: CymSlot) -> Vec<CymSlot> {
    let mut others: Vec<CymSlot> = CymSlot::all()
        .filter(|&s| s != slot && discriminant(&s) == discriminant(&slot))
        .collect();
    others.sort_by_key(|&s| (s.index().abs_diff(slot.index()), s.index()));
    others
}

/// The slots on other drums that stand in next, nearest first, played the same way where
/// they can be; only Nearest uses them.
fn neighbours(c: Canon) -> Vec<Canon> {
    let crash = |a| Canon::Cymbal(CymSlot::Crash(Idx::FIRST), a);
    match c {
        Canon::Kick(_) | Canon::Hat(..) | Canon::Perc(_) => Vec::new(),
        Canon::Snare(i, a) => SnareIdx::all()
            .filter(|&j| j != i)
            .map(|j| Canon::Snare(j, a))
            .collect(),
        Canon::Tom(p, a) => tom_neighbors(p)
            .into_iter()
            .map(|q| Canon::Tom(q, a))
            .collect(),
        Canon::Aux(_, o, z) => vec![Canon::Hat(o, z)],
        Canon::Cymbal(slot, a) => {
            let same_kind = cymbals_like(slot).into_iter().map(|s| Canon::Cymbal(s, a));
            let next = match slot {
                CymSlot::Crash(_) => None,
                CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) => Some(crash(a)),
                CymSlot::Bell(_) => Some(Canon::Ride(RideIdx::FIRST, RideArtic::Bell)),
            };
            same_kind.chain(next).collect()
        }
        Canon::Ride(i, a) => {
            let other = RideIdx::all()
                .filter(|&j| j != i)
                .map(|j| Canon::Ride(j, a));
            let crash_for_edge = (a == RideArtic::Edge).then(|| crash(CymArtic::Hit));
            other.chain(crash_for_edge).collect()
        }
    }
}

fn fallback(c: Canon) -> Vec<Canon> {
    let mut out = variants(c);
    let mut queue: VecDeque<Canon> = once(c)
        .chain(out.iter().copied())
        .flat_map(neighbours)
        .collect();
    while let Some(entry) = queue.pop_front() {
        if c.same_drum(entry) || out.contains(&entry) {
            continue;
        }
        let stands_in: Vec<Canon> = once(entry)
            .chain(variants(entry))
            .filter(|s| !out.contains(s))
            .collect();
        queue.extend(stands_in.iter().copied().flat_map(neighbours));
        out.extend(stands_in);
    }
    out
}

static CHAINS: LazyLock<HashMap<Canon, Vec<Canon>>> =
    LazyLock::new(|| Canon::all().iter().map(|&c| (c, fallback(c))).collect());

impl Canon {
    /// The drums that stand in for this one when a target lacks it, nearest first: the
    /// strokes of the same drum that may stand in, then the nearest other drums.
    pub fn fallback_chain(self) -> &'static [Canon] {
        CHAINS.get(&self).map_or(&[], Vec::as_slice)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    fn chain(s: &str) -> &'static [Canon] {
        k(s).fallback_chain()
    }

    fn keys(s: &[&str]) -> Vec<Canon> {
        s.iter().map(|x| k(x)).collect()
    }

    #[test]
    fn chain_has_no_self_and_no_dupes() {
        for &c in Canon::all() {
            let chain = c.fallback_chain();
            assert!(!chain.contains(&c), "{c} in own chain");
            let unique: HashSet<Canon> = chain.iter().copied().collect();
            assert_eq!(unique.len(), chain.len(), "dupes in {c}");
        }
    }

    #[test]
    fn every_chain_tries_the_same_drum_before_another() {
        for &c in Canon::all() {
            let chain = c.fallback_chain();
            let same = chain.iter().take_while(|&&o| c.same_drum(o)).count();
            assert!(
                chain[same..].iter().all(|&o| !c.same_drum(o)),
                "{c} tries another drum before its own: {chain:?}"
            );
        }
    }

    #[test]
    fn a_closed_hat_stays_closed() {
        assert_eq!(
            chain("hat.closed"),
            keys(&[
                "hat.closed.tip",
                "hat.closed.edge",
                "hat.tight",
                "hat.tight.tip",
                "hat.tight.edge",
                "hat.cc",
                "hat.cc.tip",
                "hat.cc.edge",
            ])
        );
        assert_eq!(
            chain("hat.tight.tip")[..5],
            keys(&[
                "hat.tight",
                "hat.tight.edge",
                "hat.closed.tip",
                "hat.closed",
                "hat.closed.edge"
            ])
        );
    }

    #[test]
    fn an_open_hat_stays_open_nearest_and_closing_first() {
        assert_eq!(
            chain("hat.open2")[..9],
            keys(&[
                "hat.open2.edge",
                "hat.open2.tip",
                "hat.open1",
                "hat.open1.edge",
                "hat.open1.tip",
                "hat.open3",
                "hat.open3.edge",
                "hat.open3.tip",
                "hat.loose",
            ])
        );
        assert!(chain("hat.open2").iter().all(|o| {
            let key = o.to_string();
            (key.starts_with("hat.open") || key.starts_with("hat.loose")) && !key.ends_with(".bell")
        }));
        assert_eq!(
            chain("hat.open3.bell")[..4],
            keys(&[
                "hat.open3.edge",
                "hat.open3.tip",
                "hat.open3",
                "hat.open2.bell"
            ])
        );
    }

    #[test]
    fn the_foot_stays_with_the_foot() {
        assert_eq!(
            chain("hat.pedal"),
            keys(&["hat.pedal.tip", "hat.pedal.edge"])
        );
        assert_eq!(
            chain("hat.pedalsplash"),
            keys(&[
                "hat.pedalsplash.edge",
                "hat.pedalsplash.tip",
                "hat.pedal",
                "hat.pedal.tip",
                "hat.pedal.edge",
            ])
        );
    }

    #[test]
    fn an_aux_hat_tries_itself_then_the_main_hat() {
        let aux = chain("aux1.closed.tip");
        assert_eq!(
            aux[..3],
            keys(&["aux1.closed", "aux1.closed.edge", "aux1.tight.tip"])
        );
        assert_eq!(aux[8..10], keys(&["hat.closed.tip", "hat.closed"]));
    }

    #[test]
    fn snares_toms_and_kicks() {
        assert_eq!(
            chain("snare1.hit"),
            keys(&["snare1.side", "snare2.hit", "snare2.side"])
        );
        assert_eq!(
            chain("snare2.rimshot"),
            keys(&["snare2.hit", "snare1.rimshot", "snare1.hit"])
        );
        assert_eq!(
            chain("snare1.ruff")[..2],
            keys(&["snare1.flam", "snare1.hit"])
        );
        assert_eq!(chain("snare1.rim")[0], k("snare1.sidestick"));
        assert_eq!(
            chain("tom.rack2.hit")[..3],
            keys(&["tom.rack1.hit", "tom.rack3.hit", "tom.rack4.hit"])
        );
        assert!(chain("tom.rack2.hit")
            .iter()
            .all(|o| o.to_string().ends_with(".hit")));
        assert_eq!(
            chain("tom.rack2.rimshot")[..3],
            keys(&["tom.rack2.hit", "tom.rack1.rimshot", "tom.rack1.hit"])
        );
        assert_eq!(chain("kick.main"), keys(&["kick.alt", "kick.left"]));
        assert_eq!(chain("kick.left"), keys(&["kick.main", "kick.alt"]));
    }

    #[test]
    fn cymbals() {
        assert_eq!(
            chain("crash.1.hit")[..4],
            keys(&["crash.1.edge", "crash.2.hit", "crash.2.edge", "crash.3.hit"])
        );
        assert_eq!(
            chain("china.2.mute")[..11],
            keys(&[
                "china.2.hit",
                "china.2.edge",
                "china.1.mute",
                "china.1.hit",
                "china.1.edge",
                "china.3.mute",
                "china.3.hit",
                "china.3.edge",
                "crash.1.mute",
                "crash.1.hit",
                "crash.1.edge",
            ])
        );
        assert_eq!(chain("stack.1.hit")[7], k("crash.1.hit"));
        assert_eq!(
            chain("ride.1"),
            keys(&["ride.1.bowtip", "ride.2", "ride.2.bowtip"])
        );
        assert_eq!(
            chain("ride.1.edge")[..3],
            keys(&["ride.2.edge", "crash.1.hit", "crash.1.edge"])
        );
        assert_eq!(
            chain("ride.1.mute")[..2],
            keys(&["ride.1", "ride.1.bowtip"])
        );
        assert_eq!(
            chain("bell.1.hit")[..5],
            keys(&[
                "bell.1.edge",
                "bell.2.hit",
                "bell.2.edge",
                "ride.1.bell",
                "ride.1.belltip"
            ])
        );
    }

    #[test]
    fn percussion_has_no_stand_in() {
        for p in ["perc.cowbell", "perc.clap", "perc.misc"] {
            assert!(chain(p).is_empty(), "{p}");
        }
    }
}
