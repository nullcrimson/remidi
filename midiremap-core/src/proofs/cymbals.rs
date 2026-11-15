use std::collections::BTreeSet;

use rayon::prelude::*;
use strum::VariantArray;

use super::{all_pairs, assert_none};
use crate::{
    canon::{Canon, CymArtic, CymKind, CymSlot, SpreadTo},
    engine_map::EngineMap,
    overrides::Overrides,
    resolution::{MissingDrums, Outcome},
    translate::Mapping,
};

fn hit(slot: CymSlot) -> Canon {
    Canon::of_cymbal(slot, CymArtic::Hit)
}

/// The cymbal or ride bell `canon` is a stroke of, when it is one.
fn place_of(canon: Canon) -> Option<SpreadTo> {
    match (canon.cymbal(), canon.ride()) {
        (Some((slot, _)), _) => Some(SpreadTo::Cymbal(slot)),
        (_, Some((ride, artic))) if artic.is_bell() => Some(SpreadTo::RideBell(ride)),
        _ => None,
    }
}

/// Whether `canon` is a stroke of a crash's bell or a ride's bell.
fn is_bell(canon: Canon) -> bool {
    canon.cymbal().is_some_and(|(_, artic)| artic.is_bell())
        || canon.ride().is_some_and(|(_, artic)| artic.is_bell())
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
    fn place(&self, slot: CymSlot) -> Option<SpreadTo> {
        let own = kit(self.tgt, slot.kind())
            .contains(&slot)
            .then_some(SpreadTo::Cymbal(slot));
        self.near
            .matched_drum(hit(slot))
            .and_then(place_of)
            .or(own)
            .or_else(|| self.played(hit(slot)).and_then(place_of))
    }

    /// Where every cymbal and ride stroke the source plays lands.
    fn landings(&self) -> Vec<(Canon, Canon)> {
        Canon::all()
            .iter()
            .copied()
            .filter(|&c| {
                (c.cymbal().is_some() || c.ride().is_some()) && self.src.encode(c).is_some()
            })
            .filter_map(|c| Some((c, self.played(c)?)))
            .collect()
    }

    /// Whether no cymbal or ride stroke of the source plays on `place`, nor does a spread place
    /// a source cymbal there (`bells` only: on its bell).
    fn idle(&self, place: SpreadTo, bells: bool) -> bool {
        let landed = self
            .landings()
            .into_iter()
            .any(|(_, landed)| place_of(landed) == Some(place) && (!bells || is_bell(landed)));
        let placed = !bells
            && CymKind::VARIANTS
                .iter()
                .flat_map(|&kind| kit(self.src, kind))
                .any(|slot| self.place(slot) == Some(place));
        !landed && !placed
    }

    fn fail(&self, what: impl std::fmt::Display) -> String {
        format!("{}: {what}", self.label)
    }
}

/// The cymbals of `kind` `engine` plays by a stroke other than the bell.
fn kit(engine: &EngineMap, kind: CymKind) -> BTreeSet<CymSlot> {
    Canon::all()
        .iter()
        .filter_map(|&c| c.cymbal().filter(|_| engine.encode(c).is_some()))
        .filter(|&(slot, artic)| slot.kind() == kind && !artic.is_bell())
        .map(|(slot, _)| slot)
        .collect()
}

/// The places on `engine` a cymbal of a kind it lacks may take: the cymbals of the first other
/// kind on `from`'s chain it plays, or its ride bells.
fn next_kind(engine: &EngineMap, from: CymSlot) -> Vec<SpreadTo> {
    let ride_bells: Vec<SpreadTo> = Canon::all()
        .iter()
        .filter(|&&c| c.ride().is_some_and(|(_, a)| a.is_bell()) && engine.encode(c).is_some())
        .filter_map(|&c| place_of(c))
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    hit(from)
        .fallback_chain()
        .iter()
        .find_map(|&c| match (c.cymbal(), c.ride()) {
            (Some((slot, _)), _) if slot.kind() != from.kind() => {
                let kit = kit(engine, slot.kind());
                (!kit.is_empty()).then(|| kit.into_iter().map(SpreadTo::Cymbal).collect())
            }
            (_, Some((_, artic))) if artic.is_bell() && !ride_bells.is_empty() => {
                Some(ride_bells.clone())
            }
            _ => None,
        })
        .unwrap_or_default()
}

fn number(place: SpreadTo) -> u8 {
    match place {
        SpreadTo::Cymbal(slot) => slot.number(),
        SpreadTo::RideBell(ride) => ride.get(),
        SpreadTo::Tom(_) => unreachable!("a cymbal never spreads onto a tom"),
    }
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
                let places: Vec<Option<SpreadTo>> = source.iter().map(|&s| p.place(s)).collect();
                let distinct: BTreeSet<Option<SpreadTo>> = places.iter().copied().collect();
                let in_kind = places
                    .iter()
                    .all(|place| matches!(place, Some(SpreadTo::Cymbal(s)) if s.kind() == kind));
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
                let pool = next_kind(p.tgt, from);
                let idle: Vec<SpreadTo> =
                    pool.iter().copied().filter(|&c| p.idle(c, false)).collect();
                let place = p.place(from)?;
                let distance = |c: SpreadTo| (number(c).abs_diff(from.number()), number(c));
                let shared = p
                    .landings()
                    .iter()
                    .filter(|&&(c, landed)| {
                        place_of(landed) == Some(place)
                            && c.cymbal().is_none_or(|(slot, _)| slot != from)
                    })
                    .count()
                    > 0;
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
        let target_bells: Vec<SpreadTo> = Canon::all()
            .iter()
            .filter(|&&c| is_bell(c) && p.tgt.encode(c).is_some())
            .filter_map(|&c| place_of(c))
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        let idle = |crash: bool| {
            target_bells
                .iter()
                .copied()
                .filter(|b| !matches!(b, SpreadTo::Cymbal(s) if !matches!(s, CymSlot::Crash(_))))
                .any(|b| {
                    matches!(b, SpreadTo::Cymbal(CymSlot::Crash(_))) == crash && p.idle(b, true)
                })
        };
        p.landings()
            .into_iter()
            .filter(|&(c, _)| matches!(c.cymbal(), Some((CymSlot::Crash(_), a)) if a.is_bell()))
            .filter_map(|(c, landed)| {
                let (slot, _) = c.cymbal()?;
                let own = p.place(slot).filter(|own| target_bells.contains(own));
                let on = place_of(landed);
                let shared = p
                    .landings()
                    .iter()
                    .any(|&(o, l)| !o.same_drum(c) && is_bell(l) && place_of(l) == on);
                let ok = match own {
                    Some(own) => on == Some(own),
                    None => {
                        !(matches!(on, Some(SpreadTo::RideBell(_))) && idle(true))
                            && !(shared && (idle(true) || idle(false)))
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
        let rides_have_bells = Canon::all()
            .iter()
            .any(|&c| c.ride().is_some_and(|(_, a)| a.is_bell()) && p.tgt.encode(c).is_some());
        if !kit(p.tgt, CymKind::Bell).is_empty() || !rides_have_bells {
            return Vec::new();
        }
        p.landings()
            .into_iter()
            .filter(|&(c, landed)| {
                matches!(c.cymbal(), Some((CymSlot::Bell(_), _)))
                    && !matches!(place_of(landed), Some(SpreadTo::RideBell(_)))
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
