use std::{
    collections::{HashMap, VecDeque},
    iter::once,
    mem::discriminant,
    sync::LazyLock,
};

use super::{
    tom_positions, Canon, CymArtic, CymSlot, HandStroke, HatOpen, HatZone, Idx, KickKind,
    OpenLevel, RideArtic, RideIdx, Slot, SnareArtic, SnareIdx, TomArtic, TomPos,
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
        Side | Rimshot | Flam | Off | Ghost => &[Hit],
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

fn hand_order(s: HandStroke) -> &'static [HandStroke] {
    match s {
        HandStroke::Mute => &[HandStroke::Open],
        HandStroke::Open => &[],
    }
}

fn cym_order(a: CymArtic) -> &'static [CymArtic] {
    use CymArtic::*;
    match a {
        Hit => &[Edge],
        Edge => &[Hit],
        Bow => &[BowTip, Hit, Edge],
        BowTip => &[Bow, Hit, Edge],
        Bell => &[BellTip],
        BellTip => &[Bell],
        Mute => &[Hit, Edge],
    }
}

fn ride_bell_for(a: CymArtic) -> Option<Canon> {
    let ride = |r| Some(Canon(Slot::Ride(RideIdx::FIRST, r)));
    match a {
        CymArtic::Bell => ride(RideArtic::Bell),
        CymArtic::BellTip => ride(RideArtic::BellTip),
        CymArtic::Hit | CymArtic::Edge | CymArtic::Bow | CymArtic::BowTip | CymArtic::Mute => None,
    }
}

fn ride_order(a: RideArtic) -> &'static [RideArtic] {
    use RideArtic::*;
    match a {
        Bow => &[BowTip],
        BowTip => &[Bow],
        Bell => &[BellTip, Bow, BowTip],
        BellTip => &[Bell, Bow, BowTip],
        Mute => &[Bow, BowTip],
        Edge => &[Bow, BowTip],
    }
}

fn open_level(o: HatOpen) -> u8 {
    match o {
        HatOpen::Open(n) => n.get(),
        HatOpen::Tight
        | HatOpen::Closed
        | HatOpen::Loose
        | HatOpen::Cc
        | HatOpen::Pedal
        | HatOpen::PedalSplash => 0,
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
        Loose | Open(_) => nearest(o, once(Loose).chain(OpenLevel::all().map(Open)), |a, b| {
            open_level(a).abs_diff(open_level(b))
        }),
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

fn variants(c: Canon) -> Vec<Canon> {
    match c.0 {
        Slot::Kick(k) => kick_order(k)
            .iter()
            .map(|&b| Canon(Slot::Kick(b)))
            .collect(),
        Slot::Snare(i, a) => snare_order(a)
            .iter()
            .map(|&b| Canon(Slot::Snare(i, b)))
            .collect(),
        Slot::Tom(p, a) => tom_order(a)
            .iter()
            .map(|&b| Canon(Slot::Tom(p, b)))
            .collect(),
        Slot::Hat(o, z) => hat_order(o, z)
            .into_iter()
            .map(|(o, z)| Canon(Slot::Hat(o, z)))
            .collect(),
        Slot::Aux(i, o, z) => hat_order(o, z)
            .into_iter()
            .map(|(o, z)| Canon(Slot::Aux(i, o, z)))
            .collect(),
        Slot::Cymbal(s, a) => cym_order(a)
            .iter()
            .map(|&b| Canon(Slot::Cymbal(s, b)))
            .collect(),
        Slot::Ride(i, a) => ride_order(a)
            .iter()
            .map(|&b| Canon(Slot::Ride(i, b)))
            .collect(),
        Slot::Perc(_) => Vec::new(),
        Slot::Hand(d) => hand_order(d.stroke())
            .iter()
            .map(|&b| Canon(Slot::Hand(d.played(b))))
            .collect(),
    }
}

/// The members of `among` other than `from`, nearest by `distance` first, the first in order
/// on a tie.
fn nearest<T: Copy + Ord, D: Ord>(
    from: T,
    among: impl Iterator<Item = T>,
    distance: impl Fn(T, T) -> D,
) -> Vec<T> {
    let mut others: Vec<T> = among.filter(|&x| x != from).collect();
    others.sort_by_key(|&x| (distance(from, x), x));
    others
}

fn neighbours(c: Canon) -> Vec<Canon> {
    let crash = |a| Canon(Slot::Cymbal(CymSlot::Crash(Idx::FIRST), a));
    match c.0 {
        Slot::Kick(_) | Slot::Hat(..) | Slot::Perc(_) | Slot::Hand(..) => Vec::new(),
        Slot::Snare(i, a) => SnareIdx::all()
            .filter(|&j| j != i)
            .map(|j| Canon(Slot::Snare(j, a)))
            .collect(),
        Slot::Tom(p, a) => nearest(p, tom_positions(), TomPos::distance)
            .into_iter()
            .map(|q| Canon(Slot::Tom(q, a)))
            .collect(),
        Slot::Aux(_, o, z) => vec![Canon(Slot::Hat(o, z))],
        Slot::Cymbal(slot, a) => {
            let kind = CymSlot::all().filter(|s| discriminant(s) == discriminant(&slot));
            let same_kind = nearest(slot, kind, |a, b| a.index().abs_diff(b.index()))
                .into_iter()
                .map(|s| Canon(Slot::Cymbal(s, a)));
            let every = |kind: fn(&CymSlot) -> bool| {
                CymSlot::all()
                    .filter(kind)
                    .map(move |s| Canon(Slot::Cymbal(s, a)))
            };
            let next: Vec<Canon> = match slot {
                CymSlot::Crash(_) => ride_bell_for(a).into_iter().collect(),
                CymSlot::China(_) => every(|s| matches!(s, CymSlot::Stack(_)))
                    .chain(once(crash(a)))
                    .collect(),
                CymSlot::Stack(_) => every(|s| matches!(s, CymSlot::China(_)))
                    .chain(once(crash(a)))
                    .collect(),
                CymSlot::Splash(_) => vec![crash(a)],
                CymSlot::Bell(_) => vec![Canon(Slot::Ride(RideIdx::FIRST, RideArtic::Bell))],
            };
            same_kind.chain(next).collect()
        }
        Slot::Ride(i, a) => {
            let other = RideIdx::all()
                .filter(|&j| j != i)
                .map(|j| Canon(Slot::Ride(j, a)));
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
        &CHAINS[&self]
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;
    use crate::canon::k;

    fn chain(s: &str) -> &'static [Canon] {
        k(s).fallback_chain()
    }

    fn keys(s: &[&str]) -> Vec<Canon> {
        s.iter().map(|x| k(x)).collect()
    }

    #[test]
    fn chain_has_no_dupes() {
        for &c in Canon::all() {
            let chain = c.fallback_chain();
            let unique: HashSet<Canon> = chain.iter().copied().collect();
            assert_eq!(unique.len(), chain.len(), "dupes in {c}");
        }
    }

    #[test]
    fn an_aux_hat_falls_to_the_main_hat_after_itself() {
        assert_eq!(
            chain("aux1.closed.tip")[8..10],
            keys(&["hat.closed.tip", "hat.closed"])
        );
    }

    #[test]
    fn a_snare_hit_tries_its_sidestick_then_the_other_snare() {
        assert_eq!(
            chain("snare1.hit"),
            keys(&["snare1.side", "snare2.hit", "snare2.side"])
        );
    }

    #[test]
    fn a_snare_rimshot_tries_its_hit_then_the_other_snare() {
        assert_eq!(
            chain("snare2.rimshot"),
            keys(&["snare2.hit", "snare1.rimshot", "snare1.hit"])
        );
    }

    #[test]
    fn a_tom_hit_tries_the_nearest_toms_first() {
        assert_eq!(
            chain("tom.rack2.hit")[..3],
            keys(&["tom.rack1.hit", "tom.rack3.hit", "tom.rack4.hit"])
        );
    }

    #[test]
    fn a_tom_hit_stands_in_only_with_tom_hits() {
        assert!(chain("tom.rack2.hit")
            .iter()
            .all(|o| o.to_string().ends_with(".hit")));
    }

    #[test]
    fn a_tom_rimshot_tries_its_hit_then_the_nearest_tom() {
        assert_eq!(
            chain("tom.rack2.rimshot")[..3],
            keys(&["tom.rack2.hit", "tom.rack1.rimshot", "tom.rack1.hit"])
        );
    }

    #[test]
    fn a_crash_tries_its_edge_then_the_next_crashes() {
        assert_eq!(
            chain("crash.1.hit")[..4],
            keys(&["crash.1.edge", "crash.2.hit", "crash.2.edge", "crash.3.hit"])
        );
    }

    fn first(chain: &[Canon], kind: &str) -> usize {
        chain
            .iter()
            .position(|c| c.to_string().starts_with(kind))
            .unwrap()
    }

    #[test]
    fn a_china_tries_the_other_chinas_then_the_stacks_before_a_crash() {
        let chain = chain("china.2.mute");
        assert_eq!(
            chain[..8],
            keys(&[
                "china.2.hit",
                "china.2.edge",
                "china.1.mute",
                "china.1.hit",
                "china.1.edge",
                "china.3.mute",
                "china.3.hit",
                "china.3.edge",
            ])
        );
        assert_eq!(chain[first(chain, "stack.")], k("stack.1.mute"));
        assert!(first(chain, "stack.") < first(chain, "crash."));
    }

    #[test]
    fn a_crash_bow_tries_its_tip_then_its_hit_then_the_next_crash() {
        assert_eq!(
            chain("crash.1.bow")[..4],
            keys(&[
                "crash.1.bowtip",
                "crash.1.hit",
                "crash.1.edge",
                "crash.2.bow"
            ])
        );
    }

    #[test]
    fn a_crash_bell_tries_the_other_crash_bells_then_the_ride_bell() {
        let chain = chain("crash.1.bell");
        let last_crash = chain
            .iter()
            .rposition(|c| c.to_string().starts_with("crash."))
            .unwrap();
        assert_eq!(chain[last_crash + 1], k("ride.1.bell"));
        assert!(chain[..=last_crash]
            .iter()
            .all(|c| c.to_string().ends_with(".bell") || c.to_string().ends_with(".belltip")));
    }

    #[test]
    fn a_stack_tries_the_other_stacks_then_the_chinas_before_a_crash() {
        let chain = chain("stack.1.hit");
        assert!(chain[..first(chain, "china.")]
            .iter()
            .all(|c| c.to_string().starts_with("stack.")));
        assert_eq!(chain[first(chain, "china.")], k("china.1.hit"));
        assert!(first(chain, "china.") < first(chain, "crash."));
    }

    #[test]
    fn a_ride_tries_its_bow_tip_then_the_other_ride() {
        assert_eq!(
            chain("ride.1"),
            keys(&["ride.1.bowtip", "ride.2", "ride.2.bowtip"])
        );
    }

    #[test]
    fn a_ride_edge_tries_its_own_bow_then_the_other_ride_edge_then_a_crash() {
        let chain = chain("ride.1.edge");
        assert_eq!(
            chain[..3],
            keys(&["ride.1", "ride.1.bowtip", "ride.2.edge"])
        );
        assert_eq!(chain[first(chain, "crash.")], k("crash.1.hit"));
    }

    #[test]
    fn a_ride_bell_tries_its_own_bow_then_the_other_ride_bell() {
        assert_eq!(
            chain("ride.1.bell")[..4],
            keys(&["ride.1.belltip", "ride.1", "ride.1.bowtip", "ride.2.bell"])
        );
    }

    #[test]
    fn a_bell_cymbal_tries_the_other_bell_then_the_ride_bell() {
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
}
