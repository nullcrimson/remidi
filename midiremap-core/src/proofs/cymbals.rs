use std::collections::BTreeSet;

use rayon::prelude::*;
use strum::VariantArray;

use super::{all_pairs, assert_none};
use crate::{
    canon::{Canon, CymArtic, CymKind, CymSlot, CymStroke},
    engine::EngineMap,
    mapping::{Mapping, MissingDrums, Outcome, Overrides},
    spread::CymbalPlace,
};

fn hit(slot: CymSlot) -> Canon {
    Canon::of_cymbal(slot, CymArtic::Hit)
}

/// Whether `canon` is a stroke of a cymbal's bell or a ride's bell.
fn is_bell(canon: Canon) -> bool {
    canon.cymbal_stroke().is_some_and(CymStroke::is_bell)
}

/// Which source strokes keep a place busy: any stroke or spread placement, or bell strokes
/// only.
#[derive(Copy, Clone)]
enum Strokes {
    Any,
    Bells,
}

/// The bell a crash's bell can play on: another crash's or a ride's.
#[derive(Copy, Clone, PartialEq, Eq)]
enum Bell {
    Crash,
    Ride,
}

fn bell_of(place: CymbalPlace) -> Option<Bell> {
    match place {
        CymbalPlace::Cymbal(CymSlot::Crash(_)) => Some(Bell::Crash),
        CymbalPlace::RideBell(_) => Some(Bell::Ride),
        CymbalPlace::Cymbal(_) => None,
    }
}

/// A pair whose source plays a cymbal, with its mapping under `Nearest`.
struct Pair<'a> {
    label: String,
    src: &'a EngineMap,
    tgt: &'a EngineMap,
    near: Mapping<'a>,
}

impl<'a> Pair<'a> {
    fn new(src: &'a EngineMap, tgt: &'a EngineMap) -> Option<Self> {
        if CymKind::VARIANTS
            .iter()
            .all(|&kind| kit(src, kind).is_empty())
        {
            return None;
        }
        Some(Self {
            label: format!("{} -> {}", src.id(), tgt.id()),
            src,
            tgt,
            near: Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
        })
    }

    /// The target drum `canon` plays as.
    fn played(&self, canon: Canon) -> Option<Canon> {
        self.near.resolve_canon(canon).played().map(|(c, _)| c)
    }

    /// The cymbal or ride bell the source cymbal `slot` plays on: where a spread places it,
    /// else its own cymbal on a target that has it, else where its hit lands.
    fn place(&self, slot: CymSlot) -> Option<CymbalPlace> {
        let own = kit(self.tgt, slot.kind())
            .contains(&slot)
            .then_some(CymbalPlace::Cymbal(slot));
        self.near
            .matched_drum(hit(slot))
            .and_then(CymbalPlace::of)
            .or(own)
            .or_else(|| self.played(hit(slot)).and_then(CymbalPlace::of))
    }

    /// Where every cymbal and ride stroke the source plays lands.
    fn landings(&self) -> Vec<(Canon, Canon)> {
        Canon::all()
            .iter()
            .copied()
            .filter(|&c| c.cymbal_stroke().is_some() && self.src.encode(c).is_some())
            .filter_map(|c| Some((c, self.played(c)?)))
            .collect()
    }

    /// Whether no source stroke of `strokes` plays on `place`, nor, for any stroke, does a
    /// spread place a source cymbal there.
    fn idle(&self, place: CymbalPlace, strokes: Strokes) -> bool {
        let counts = |landed: Canon| match strokes {
            Strokes::Any => true,
            Strokes::Bells => is_bell(landed),
        };
        let landed = self
            .landings()
            .into_iter()
            .any(|(_, landed)| CymbalPlace::of(landed) == Some(place) && counts(landed));
        let placed = match strokes {
            Strokes::Any => CymKind::VARIANTS
                .iter()
                .flat_map(|&kind| kit(self.src, kind))
                .any(|slot| self.place(slot) == Some(place)),
            Strokes::Bells => false,
        };
        !landed && !placed
    }

    fn fail(&self, what: impl std::fmt::Display) -> String {
        format!("{}: {what}", self.label)
    }
}

/// The cymbals of `kind` `engine` plays by a stroke other than the bell, in order.
fn kit(engine: &EngineMap, kind: CymKind) -> Vec<CymSlot> {
    engine.kit().cymbals().cymbals(kind).to_vec()
}

fn every_pair(check: impl Fn(&Pair) -> Vec<String> + Sync) -> Vec<String> {
    all_pairs()
        .par_iter()
        .filter_map(|&(src, tgt)| Pair::new(src, tgt))
        .flat_map_iter(|p| check(&p))
        .collect()
}

#[test]
fn every_builtin_pair_spreads_a_kind_the_target_has_in_order_over_as_many_of_its_cymbals() {
    let failures = every_pair(|p| {
        CymKind::VARIANTS
            .iter()
            .filter_map(|&kind| {
                let (source, target) = (kit(p.src, kind), kit(p.tgt, kind));
                if source.is_empty() || target.is_empty() {
                    return None;
                }
                let places: Vec<Option<CymbalPlace>> = source.iter().map(|&s| p.place(s)).collect();
                let distinct: BTreeSet<Option<CymbalPlace>> = places.iter().copied().collect();
                let in_kind = places
                    .iter()
                    .all(|place| matches!(place, Some(CymbalPlace::Cymbal(s)) if s.kind() == kind));
                let most = source.len().min(target.len());
                (!in_kind || !places.is_sorted() || distinct.len() != most)
                    .then(|| p.fail(format_args!("{kind:?}: {source:?} on {places:?}")))
            })
            .collect()
    });
    assert_none(
        &failures,
        "cymbal spreads leave the kind, lose order or sounds",
    );
}

#[test]
fn every_builtin_cymbal_of_a_kind_the_target_lacks_takes_the_nearest_idle_cymbal_of_its_next_kind()
{
    let failures = every_pair(|p| {
        CymKind::VARIANTS
            .iter()
            .filter(|&&kind| kit(p.tgt, kind).is_empty())
            .flat_map(|&kind| kit(p.src, kind))
            .filter_map(|from| {
                let pool = p.tgt.kit().cymbals().substitutes(from);
                let idle: Vec<CymbalPlace> = pool
                    .iter()
                    .copied()
                    .filter(|&c| p.idle(c, Strokes::Any))
                    .collect();
                let place = p.place(from)?;
                let distance = |c: CymbalPlace| (c.distance(from), c);
                let shared = p.landings().iter().any(|&(c, landed)| {
                    CymbalPlace::of(landed) == Some(place)
                        && c.cymbal().is_none_or(|(slot, _)| slot != from)
                });
                let nearer = idle.iter().any(|&c| distance(c) < distance(place));
                let ok = idle.is_empty() || (pool.contains(&place) && !shared && !nearer);
                (!ok).then(|| p.fail(format_args!("{from:?} on {place:?}, idle {idle:?}")))
            })
            .collect()
    });
    assert_none(
        &failures,
        "cymbals of a missing kind share or go far while their next kind has one idle",
    );
}

#[test]
fn every_builtin_crash_bell_plays_on_its_crashs_bell_else_an_idle_crash_bell_else_an_idle_ride_bell(
) {
    let failures = every_pair(|p| {
        let target_bells: Vec<CymbalPlace> = Canon::all()
            .iter()
            .filter(|&&c| is_bell(c) && p.tgt.encode(c).is_some())
            .filter_map(|&c| CymbalPlace::of(c))
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        let idle = |bell: Bell| {
            target_bells
                .iter()
                .copied()
                .any(|b| bell_of(b) == Some(bell) && p.idle(b, Strokes::Bells))
        };
        p.landings()
            .into_iter()
            .filter_map(|(c, landed)| match c.cymbal() {
                Some((slot @ CymSlot::Crash(_), artic)) if artic.is_bell() => {
                    Some((c, slot, landed))
                }
                _ => None,
            })
            .filter_map(|(c, slot, landed)| {
                let own = p.place(slot).filter(|own| target_bells.contains(own));
                let on = CymbalPlace::of(landed);
                let shared = p
                    .landings()
                    .iter()
                    .any(|&(o, l)| !o.same_drum(c) && is_bell(l) && CymbalPlace::of(l) == on);
                let ok = match own {
                    Some(own) => on == Some(own),
                    None => {
                        !(matches!(on, Some(CymbalPlace::RideBell(_))) && idle(Bell::Crash))
                            && !(shared && (idle(Bell::Crash) || idle(Bell::Ride)))
                    }
                };
                (!ok).then(|| p.fail(format_args!("{c} on {landed}")))
            })
            .collect()
    });
    assert_none(&failures, "crash bells skip a bell the order gives them");
}

#[test]
fn every_builtin_bell_cymbal_stroke_plays_on_a_ride_bell_where_the_target_has_one() {
    let failures = every_pair(|p| {
        let rides_have_bells = !p.tgt.kit().cymbals().ride_bells().is_empty();
        if !kit(p.tgt, CymKind::Bell).is_empty() || !rides_have_bells {
            return Vec::new();
        }
        p.landings()
            .into_iter()
            .filter(|&(c, landed)| {
                matches!(c.cymbal(), Some((CymSlot::Bell(_), _)))
                    && !matches!(CymbalPlace::of(landed), Some(CymbalPlace::RideBell(_)))
            })
            .map(|(c, landed)| p.fail(format_args!("{c} on {landed}")))
            .collect()
    });
    assert_none(&failures, "bell cymbal strokes land off the ride bells");
}

#[test]
fn every_builtin_cymbal_stroke_the_target_names_stays_unless_a_spread_moved_its_cymbal() {
    let failures = every_pair(|p| {
        p.landings()
            .into_iter()
            .filter(|&(c, landed)| c.cymbal().is_some() && p.tgt.encode(c).is_some() && landed != c)
            .filter(|&(c, _)| p.near.matched_drum(c).is_none())
            .map(|(c, landed)| p.fail(format_args!("{c} on {landed}")))
            .collect()
    });
    assert_none(
        &failures,
        "cymbal strokes the target names leave their note",
    );
}

#[test]
fn every_builtin_spread_cymbal_lands_directly_when_named_and_stands_in_when_missing() {
    let failures = every_pair(|p| {
        p.landings()
            .into_iter()
            .filter_map(|(c, _)| Some((c, c.cymbal()?.0, p.near.matched_drum(c)?)))
            .filter_map(|(c, slot, spread)| {
                let outcome = p.near.resolve_canon(c);
                let missing = !kit(p.tgt, slot.kind()).contains(&slot);
                let named = p.tgt.encode(c).is_some();
                let ok = match outcome {
                    Outcome::Direct(l) => named && l.plays() == spread,
                    Outcome::Fallback(_) => {
                        !(named && p.tgt.encode(spread).is_some())
                            && (!missing || outcome.moves_to_other_drum())
                    }
                    Outcome::Dropped { .. } => false,
                };
                (!ok).then(|| p.fail(format_args!("{c} lands as {outcome:?}")))
            })
            .collect()
    });
    assert_none(&failures, "spread cymbals land as the wrong outcome");
}
