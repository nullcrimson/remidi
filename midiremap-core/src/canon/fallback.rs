use std::collections::{HashSet, VecDeque};

use super::{
    tom_positions, Canon, CymArtic, CymSlot, HatOpen, HatZone, Idx, KickKind, RackIdx, RideArtic,
    RideIdx, SnareArtic, TomArtic, TomPos,
};

fn snare_artic_step(a: SnareArtic) -> Option<SnareArtic> {
    use SnareArtic::*;
    match a {
        Rimshot => Some(Rim),
        Rim => Some(Hit),
        Ruff => Some(Flam),
        Flam => Some(Hit),
        Sidestick => Some(Hit),
        Off => Some(Hit),
        Side => Some(Hit),
        Hit => None,
    }
}
fn tom_artic_step(a: TomArtic) -> Option<TomArtic> {
    match a {
        TomArtic::Rimshot => Some(TomArtic::Rim),
        TomArtic::Rim => Some(TomArtic::Hit),
        TomArtic::Hit => None,
    }
}
fn cym_artic_step(a: CymArtic) -> Option<CymArtic> {
    use CymArtic::*;
    match a {
        Mute => Some(Hit),
        BellTip => Some(Bell),
        Bell => Some(Bow),
        BowTip => Some(Bow),
        Bow => Some(Hit),
        Edge => Some(Hit),
        Hit => None,
    }
}
fn ride_artic_step(a: RideArtic) -> Option<RideArtic> {
    use RideArtic::*;
    match a {
        Bell => Some(Bow),
        BellTip => Some(Bell),
        BowTip => Some(Bow),
        Edge => Some(Bow),
        Mute => Some(Bow),
        Bow => Some(BowTip),
    }
}
fn hat_zone_step(z: HatZone) -> Option<HatZone> {
    match z {
        HatZone::Bell => Some(HatZone::Edge),
        HatZone::Edge => Some(HatZone::Tip),
        HatZone::Tip => Some(HatZone::Plain),
        HatZone::Plain => None,
    }
}
fn hat_open_step(o: HatOpen) -> Option<HatOpen> {
    use HatOpen::*;
    match o {
        Open(n) => Some(n.prev().map_or(Loose, Open)),
        Loose => Some(Closed),
        Tight => Some(Closed),
        Cc => Some(Closed),
        PedalSplash => Some(Pedal),
        Pedal => Some(Closed),
        Closed => None,
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

/// One reduction step: the immediate, nearest canonical slots a slot degrades to.
/// `fallback` is the BFS-ordered transitive closure of this relation.
pub(crate) fn single_step(c: Canon) -> Vec<Canon> {
    match c {
        Canon::Kick(KickKind::Alt) | Canon::Kick(KickKind::Left) => {
            vec![Canon::Kick(KickKind::Main)]
        }
        Canon::Kick(KickKind::Main) => vec![],
        Canon::Perc(_) => vec![],
        Canon::Snare(i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = snare_artic_step(a) {
                edges.push(Canon::Snare(i, p));
            }
            if let Some(prev) = i.prev() {
                edges.push(Canon::Snare(prev, a));
            }
            edges
        }
        Canon::Tom(pos, a) => match tom_artic_step(a) {
            Some(p) => vec![Canon::Tom(pos, p)],
            None => tom_neighbors(pos)
                .into_iter()
                .map(|q| Canon::Tom(q, TomArtic::Hit))
                .collect(),
        },
        Canon::Hat(o, z) => match hat_zone_step(z) {
            Some(pz) => vec![Canon::Hat(o, pz)],
            None => hat_open_step(o)
                .map(|po| Canon::Hat(po, HatZone::Plain))
                .into_iter()
                .collect(),
        },
        Canon::Aux(_, o, z) => vec![Canon::Hat(o, z)],
        Canon::Cymbal(slot, a) => {
            let mut edges = Vec::new();
            if let Some(p) = cym_artic_step(a) {
                edges.push(Canon::Cymbal(slot, p));
            }
            if let Some(prev) = slot.prev() {
                edges.push(Canon::Cymbal(prev, a));
            } else if a == CymArtic::Hit {
                match slot {
                    CymSlot::Crash(_) => {}
                    CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) => {
                        edges.push(Canon::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit));
                    }
                    CymSlot::Bell(_) => edges.push(Canon::Ride(RideIdx::FIRST, RideArtic::Bell)),
                }
            }
            edges
        }
        Canon::Ride(i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = ride_artic_step(a) {
                edges.push(Canon::Ride(i, p));
            }
            if let Some(prev) = i.prev() {
                edges.push(Canon::Ride(prev, a));
            } else if a == RideArtic::Bow {
                edges.push(Canon::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit));
            }
            edges
        }
    }
}

impl Canon {
    /// The drums that stand in for this one when a target lacks it, nearest first.
    pub fn fallback_chain(self) -> Vec<Canon> {
        fallback(self)
    }
}

fn fallback(c: Canon) -> Vec<Canon> {
    let mut out: Vec<Canon> = Vec::new();
    let mut seen: HashSet<Canon> = HashSet::new();
    seen.insert(c);
    let mut queue: VecDeque<Canon> = single_step(c).into();
    while let Some(n) = queue.pop_front() {
        if !seen.insert(n) {
            continue;
        }
        out.push(n);
        for nxt in single_step(n) {
            queue.push_back(nxt);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    #[test]
    fn worked_chains() {
        assert_eq!(
            fallback(k("china.2.mute")),
            vec![
                k("china.2.hit"),
                k("china.1.mute"),
                k("china.1.hit"),
                k("crash.1.hit")
            ]
        );
        assert_eq!(
            fallback(k("crash.2.mute")),
            vec![k("crash.2.hit"), k("crash.1.mute"), k("crash.1.hit")]
        );
        assert_eq!(
            fallback(k("ride.1.belltip")),
            vec![
                k("ride.1.bell"),
                k("ride.1"),
                k("ride.1.bowtip"),
                k("crash.1.hit")
            ]
        );
        assert_eq!(
            fallback(k("ride.1")),
            vec![k("ride.1.bowtip"), k("crash.1.hit")]
        );
        assert_eq!(fallback(k("kick.left")), vec![k("kick.main")]);
        assert_eq!(fallback(k("stack.1.hit")), vec![k("crash.1.hit")]);
        let hat = fallback(k("hat.open3.bell"));
        assert_eq!(
            &hat[..4],
            &[
                k("hat.open3.edge"),
                k("hat.open3.tip"),
                k("hat.open3"),
                k("hat.open2")
            ]
        );
        assert_eq!(hat.last(), Some(&k("hat.closed")));
    }

    #[test]
    fn roots_and_perc_are_empty() {
        for r in [
            "kick.main",
            "snare1.hit",
            "hat.closed",
            "crash.1.hit",
            "perc.cowbell",
            "perc.misc",
        ] {
            assert!(fallback(k(r)).is_empty(), "{r} must be a root");
        }
        assert!(
            !fallback(k("tom.rack1.hit")).is_empty(),
            "toms are a clique, not roots"
        );
    }

    #[test]
    fn chain_is_closed_no_self_no_dupes() {
        for &c in Canon::all() {
            let chain = fallback(c);
            assert!(!chain.contains(&c), "{c:?} in own chain");
            let mut seen = HashSet::new();
            for d in &chain {
                assert!(seen.insert(*d), "dup {d:?} in {c:?}");
            }
            let allowed: HashSet<Canon> = chain.iter().copied().chain(std::iter::once(c)).collect();
            for d in &chain {
                for nxt in single_step(*d) {
                    assert!(
                        allowed.contains(&nxt),
                        "chain({c:?}) not closed: {d:?}->{nxt:?} missing"
                    );
                }
            }
            assert!(chain.len() < Canon::all().len());
        }
    }
}
