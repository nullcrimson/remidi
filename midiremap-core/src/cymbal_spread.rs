use std::iter::once;

use strum::VariantArray;

use crate::{
    canon::{Canon, CrashIdx, CymArtic, CymKind, CymSlot, RideIdx, SpreadTo},
    spread::{spread, Aim},
};

/// The cymbals and rides an engine plays: every cymbal and ride stroke it has a note for, in
/// canon order.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct CymbalKit {
    plays: Vec<Canon>,
}

impl CymbalKit {
    /// The cymbals and rides among `drums`.
    pub(crate) fn of(drums: impl IntoIterator<Item = Canon>) -> Self {
        let drums: Vec<Canon> = drums
            .into_iter()
            .filter(|c| c.cymbal().is_some() || c.ride().is_some())
            .collect();
        Self {
            plays: Canon::all()
                .iter()
                .copied()
                .filter(|c| drums.contains(c))
                .collect(),
        }
    }

    /// The cymbals of `kind` the engine plays by a stroke other than the bell, in order.
    fn cymbals(&self, kind: CymKind) -> Vec<CymSlot> {
        let mut slots: Vec<CymSlot> = self
            .plays
            .iter()
            .filter_map(|c| c.cymbal())
            .filter(|&(slot, artic)| slot.kind() == kind && !artic.is_bell())
            .map(|(slot, _)| slot)
            .collect();
        slots.dedup();
        slots
    }

    /// The crashes whose bell the engine plays, in order.
    fn crash_bells(&self) -> Vec<CrashIdx> {
        let mut crashes: Vec<CrashIdx> = self
            .plays
            .iter()
            .filter_map(|c| match c.cymbal()? {
                (CymSlot::Crash(crash), artic) if artic.is_bell() => Some(crash),
                _ => None,
            })
            .collect();
        crashes.dedup();
        crashes
    }

    /// The rides whose bell the engine plays, in order.
    fn ride_bells(&self) -> Vec<RideIdx> {
        let mut rides: Vec<RideIdx> = self
            .plays
            .iter()
            .filter_map(|c| c.ride().filter(|(_, artic)| artic.is_bell()))
            .map(|(ride, _)| ride)
            .collect();
        rides.dedup();
        rides
    }

    /// The stroke `canon` plays as on this kit when nothing spreads it: itself, or the first
    /// stroke of its chain the kit plays.
    fn landing(&self, canon: Canon) -> Option<Canon> {
        once(canon)
            .chain(canon.fallback_chain().iter().copied())
            .find(|c| self.plays.contains(c))
    }
}

/// The cymbal or ride bell a stroke plays on, when it plays on one.
fn place(canon: Canon) -> Option<SpreadTo> {
    match (canon.cymbal(), canon.ride()) {
        (Some((slot, _)), _) => Some(SpreadTo::Cymbal(slot)),
        (_, Some((ride, artic))) if artic.is_bell() => Some(SpreadTo::RideBell(ride)),
        _ => None,
    }
}

/// What a crash's bell can play on: another crash's bell or a ride's bell.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
enum CrashBell {
    Crash(CrashIdx),
    Ride(RideIdx),
}

impl From<CrashBell> for SpreadTo {
    fn from(bell: CrashBell) -> Self {
        match bell {
            CrashBell::Crash(crash) => Self::Cymbal(CymSlot::Crash(crash)),
            CrashBell::Ride(ride) => Self::RideBell(ride),
        }
    }
}

/// Where each cymbal of a source kit plays on a target kit, so cymbals keep their own sound
/// instead of doubling up on one: each kind spreads over the target's cymbals of that kind like
/// the toms; a kind the target lacks takes the nearest unused cymbal of the next kind its chain
/// reaches, else plays as it does without a spread; a crash's bell plays on its spread crash's
/// bell, else on an unused bell of another crash, else on an unused ride bell.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct CymbalSpread {
    cymbals: Vec<(CymSlot, SpreadTo)>,
    bells: Vec<(CrashIdx, CrashBell)>,
    moved: Vec<CymSlot>,
}

impl CymbalSpread {
    pub(crate) fn new(source: &CymbalKit, target: &CymbalKit) -> Self {
        let mut cymbals: Vec<(CymSlot, SpreadTo)> = CymKind::VARIANTS
            .iter()
            .flat_map(|&kind| spread(source.cymbals(kind), target.cymbals(kind), Aim::Near))
            .map(|(from, to)| (from, SpreadTo::Cymbal(to)))
            .collect();
        let mut used: Vec<SpreadTo> = cymbals.iter().map(|&(_, to)| to).collect();
        used.extend(
            source
                .plays
                .iter()
                .filter(|c| c.ride().is_some_and(|(_, artic)| artic.is_bell()))
                .filter_map(|&c| target.landing(c).and_then(place))
                .filter(|to| matches!(to, SpreadTo::RideBell(_))),
        );
        for &kind in CymKind::VARIANTS {
            if !target.cymbals(kind).is_empty() {
                continue;
            }
            for from in source.cymbals(kind) {
                let free = substitutes(target, from)
                    .into_iter()
                    .filter(|(_, to)| !used.contains(to))
                    .min_by_key(|&(number, _)| (number.abs_diff(from.number()), number))
                    .map(|(_, to)| to);
                let taken = free.or_else(|| {
                    target
                        .landing(Canon::of_cymbal(from, CymArtic::Hit))
                        .and_then(place)
                });
                if let Some(to) = free {
                    cymbals.push((from, to));
                }
                used.extend(taken);
            }
        }
        let bells = crash_bells(source, target, &cymbals, &mut used);
        let moved = cymbals
            .iter()
            .filter(|&&(from, to)| {
                to != SpreadTo::Cymbal(from) && target.cymbals(from.kind()).contains(&from)
            })
            .map(|&(from, _)| from)
            .collect();
        Self {
            cymbals,
            bells,
            moved,
        }
    }

    /// Where the stroke `artic` of the source cymbal `slot` plays, when the spread places it.
    pub(crate) fn landing(&self, slot: CymSlot, artic: CymArtic) -> Option<SpreadTo> {
        let bell = match slot {
            CymSlot::Crash(crash) if artic.is_bell() => self
                .bells
                .iter()
                .find(|&&(from, _)| from == crash)
                .map(|&(_, bell)| SpreadTo::from(bell)),
            CymSlot::Crash(_)
            | CymSlot::China(_)
            | CymSlot::Splash(_)
            | CymSlot::Stack(_)
            | CymSlot::Bell(_) => None,
        };
        bell.or_else(|| self.cymbal(slot))
    }

    /// Whether the target has the cymbal `slot` and the source's cymbal there plays on another.
    pub(crate) fn moved(&self, slot: CymSlot) -> bool {
        self.moved.contains(&slot)
    }

    /// The target cymbal the strokes of the source cymbal `slot` count as: the one it plays on
    /// when the spread moved it, else its own.
    pub(crate) fn drum(&self, slot: CymSlot) -> SpreadTo {
        match self.cymbal(slot) {
            Some(to) if self.moved(slot) => to,
            _ => SpreadTo::Cymbal(slot),
        }
    }

    fn cymbal(&self, slot: CymSlot) -> Option<SpreadTo> {
        self.cymbals
            .iter()
            .find(|&&(from, _)| from == slot)
            .map(|&(_, to)| to)
    }
}

/// The cymbals or ride bells of `target` that can take the place of the cymbal `from` of a
/// kind it lacks, each with its number: those of the first other kind on `from`'s chain the
/// target plays.
fn substitutes(target: &CymbalKit, from: CymSlot) -> Vec<(u8, SpreadTo)> {
    let ride_bells = target.ride_bells();
    Canon::of_cymbal(from, CymArtic::Hit)
        .fallback_chain()
        .iter()
        .find_map(|&c| match (c.cymbal(), c.ride()) {
            (Some((slot, _)), _) if slot.kind() != from.kind() => {
                let kit = target.cymbals(slot.kind());
                (!kit.is_empty()).then(|| {
                    kit.into_iter()
                        .map(|s| (s.number(), SpreadTo::Cymbal(s)))
                        .collect()
                })
            }
            (_, Some((_, artic))) if artic.is_bell() && !ride_bells.is_empty() => Some(
                ride_bells
                    .iter()
                    .map(|&r| (r.get(), SpreadTo::RideBell(r)))
                    .collect(),
            ),
            _ => None,
        })
        .unwrap_or_default()
}

/// Where each crash bell of `source` plays on `target`: first every one on its spread crash's
/// bell, then, in crash order, each other one on the nearest unused bell of another crash, else
/// on the first unused ride bell.
fn crash_bells(
    source: &CymbalKit,
    target: &CymbalKit,
    cymbals: &[(CymSlot, SpreadTo)],
    used: &mut Vec<SpreadTo>,
) -> Vec<(CrashIdx, CrashBell)> {
    let spread_crash = |crash: CrashIdx| {
        cymbals
            .iter()
            .find_map(|&(from, to)| match (from, to) {
                (CymSlot::Crash(f), SpreadTo::Cymbal(CymSlot::Crash(t))) if f == crash => Some(t),
                _ => None,
            })
            .unwrap_or(crash)
    };
    let targets = target.crash_bells();
    let (kept, rest): (Vec<CrashIdx>, Vec<CrashIdx>) = source
        .crash_bells()
        .into_iter()
        .partition(|&crash| targets.contains(&spread_crash(crash)));
    let mut taken: Vec<CrashIdx> = kept.iter().map(|&crash| spread_crash(crash)).collect();
    let mut bells: Vec<(CrashIdx, CrashBell)> = kept
        .into_iter()
        .map(|crash| (crash, CrashBell::Crash(spread_crash(crash))))
        .collect();
    for crash in rest {
        let near = spread_crash(crash);
        let other = targets
            .iter()
            .copied()
            .filter(|c| !taken.contains(c))
            .min_by_key(|&c| (c.distance(near), c));
        let bell = other.map(CrashBell::Crash).or_else(|| {
            target
                .ride_bells()
                .into_iter()
                .find(|&r| !used.contains(&SpreadTo::RideBell(r)))
                .map(CrashBell::Ride)
        });
        if let Some(bell) = bell {
            match bell {
                CrashBell::Crash(c) => taken.push(c),
                CrashBell::Ride(_) => used.push(bell.into()),
            }
            bells.push((crash, bell));
        }
    }
    bells
}
