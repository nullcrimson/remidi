use strum::VariantArray;

use super::{
    assign::{spread, Aim, Places},
    landings::{Landings, Moved},
};
use crate::canon::{
    Canon, CrashIdx, CymArtic, CymDistance, CymKind, CymSlot, CymStroke, RideArtic, RideIdx,
};

/// A cymbal or a ride's bell: where a spread places a source cymbal or a crash's bell.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub(crate) enum CymbalPlace {
    Cymbal(CymSlot),
    RideBell(RideIdx),
}

impl From<CymSlot> for CymbalPlace {
    fn from(slot: CymSlot) -> Self {
        Self::Cymbal(slot)
    }
}

impl CymbalPlace {
    /// The cymbal or ride bell `canon` is a stroke of, when it is one.
    pub(crate) fn of(canon: Canon) -> Option<Self> {
        match canon.cymbal_stroke()? {
            CymStroke::Cymbal(slot, _) => Some(Self::Cymbal(slot)),
            CymStroke::Ride(ride, artic) => artic.is_bell().then_some(Self::RideBell(ride)),
        }
    }

    /// The stroke `artic` of a cymbal played here: the same stroke on a cymbal, and on a ride's
    /// bell the stroke [`CymArtic::on_ride_bell`] names.
    pub(crate) fn plays(self, artic: CymArtic) -> Canon {
        match self {
            Self::Cymbal(slot) => Canon::of_cymbal(slot, artic),
            Self::RideBell(ride) => Canon::of_ride(ride, artic.on_ride_bell()),
        }
    }

    /// How far this place's number sits from the cymbal `from`'s.
    pub(crate) fn distance(self, from: CymSlot) -> CymDistance {
        match self {
            Self::Cymbal(slot) => from.distance(slot),
            Self::RideBell(ride) => from.ride_distance(ride),
        }
    }
}

/// The cymbals and rides an engine plays: each cymbal and each ride stroke it has a note for,
/// in canon order.
#[derive(Debug)]
pub(crate) struct CymbalKit {
    cymbals: Vec<(CymSlot, CymArtic)>,
    rides: Vec<(RideIdx, RideArtic)>,
}

impl CymbalKit {
    /// The cymbals and rides among `drums`.
    pub(crate) fn of(drums: &[Canon]) -> Self {
        let mut strokes: Vec<(Canon, CymStroke)> = drums
            .iter()
            .filter_map(|&c| Some((c, c.cymbal_stroke()?)))
            .collect();
        strokes.sort_unstable_by_key(|&(c, _)| c);
        let mut kit = Self {
            cymbals: Vec::new(),
            rides: Vec::new(),
        };
        for (_, stroke) in strokes {
            match stroke {
                CymStroke::Cymbal(slot, artic) => kit.cymbals.push((slot, artic)),
                CymStroke::Ride(ride, artic) => kit.rides.push((ride, artic)),
            }
        }
        kit
    }

    /// The cymbals of `kind` the engine plays by a stroke other than the bell.
    pub(crate) fn cymbals(&self, kind: CymKind) -> Places<CymSlot> {
        Places::of(
            self.cymbals
                .iter()
                .filter(|&&(slot, artic)| slot.kind() == kind && !artic.is_bell())
                .map(|&(slot, _)| slot),
        )
    }

    /// The crashes whose bell the engine plays, in order.
    fn crash_bells(&self) -> Places<CrashIdx> {
        Places::of(self.cymbals.iter().filter_map(|&(slot, artic)| match slot {
            CymSlot::Crash(crash) if artic.is_bell() => Some(crash),
            CymSlot::Crash(_)
            | CymSlot::China(_)
            | CymSlot::Splash(_)
            | CymSlot::Stack(_)
            | CymSlot::Bell(_) => None,
        }))
    }

    /// The rides whose bell the engine plays, in order.
    pub(crate) fn ride_bells(&self) -> Places<RideIdx> {
        Places::of(
            self.rides
                .iter()
                .filter(|(_, artic)| artic.is_bell())
                .map(|&(ride, _)| ride),
        )
    }

    /// Every ride bell stroke the engine plays.
    fn ride_bell_strokes(&self) -> impl Iterator<Item = Canon> + '_ {
        self.rides
            .iter()
            .filter(|(_, artic)| artic.is_bell())
            .map(|&(ride, artic)| Canon::of_ride(ride, artic))
    }

    /// The places of this kit that can take a source cymbal `from` of a kind it lacks: the
    /// cymbals of the first other kind on `from`'s chain it plays, or its ride bells.
    pub(crate) fn substitutes(&self, from: CymSlot) -> Vec<CymbalPlace> {
        let ride_bells = self.ride_bells();
        Canon::of_cymbal(from, CymArtic::Hit)
            .fallback_chain()
            .iter()
            .find_map(|&c| match c.cymbal_stroke()? {
                CymStroke::Cymbal(slot, _) => {
                    let kit = self.cymbals(slot.kind());
                    (!kit.is_empty()).then(|| kit.iter().map(|&s| CymbalPlace::Cymbal(s)).collect())
                }
                CymStroke::Ride(_, artic) => {
                    (artic.is_bell() && !ride_bells.is_empty()).then(|| {
                        ride_bells
                            .iter()
                            .map(|&ride| CymbalPlace::RideBell(ride))
                            .collect()
                    })
                }
            })
            .unwrap_or_default()
    }
}

/// What a crash's bell can play on: another crash's bell or a ride's bell.
#[derive(Copy, Clone)]
enum CrashBell {
    Crash(CrashIdx),
    Ride(RideIdx),
}

impl From<CrashBell> for CymbalPlace {
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
#[derive(Default)]
pub(crate) struct CymbalSpread {
    cymbals: Moved<CymSlot, CymbalPlace>,
    bells: Landings<CrashIdx, CrashBell>,
}

impl CymbalSpread {
    /// The spread of `source`'s cymbals over `target`'s, where `stand_in` gives the target
    /// stroke a stroke plays as when nothing spreads it.
    pub(crate) fn new(
        source: &CymbalKit,
        target: &CymbalKit,
        stand_in: impl Fn(Canon) -> Option<Canon>,
    ) -> Self {
        let placed = missing_kinds(
            source,
            target,
            &stand_in,
            own_kinds(source, target, &stand_in),
        );
        let bells = crash_bells(source, target, &placed);
        Self {
            cymbals: Moved::new(placed.cymbals, |from| {
                target.cymbals(from.kind()).contains(&from)
            }),
            bells,
        }
    }

    /// Where the stroke `artic` of the source cymbal `slot` plays, when the spread places it.
    pub(crate) fn place(&self, slot: CymSlot, artic: CymArtic) -> Option<CymbalPlace> {
        let bell = match slot {
            CymSlot::Crash(crash) if artic.is_bell() => {
                self.bells.get(crash).map(CymbalPlace::from)
            }
            CymSlot::Crash(_)
            | CymSlot::China(_)
            | CymSlot::Splash(_)
            | CymSlot::Stack(_)
            | CymSlot::Bell(_) => None,
        };
        bell.or_else(|| self.cymbals.get(slot))
    }

    /// Whether the target has the cymbal `slot` and the source's cymbal there plays on another.
    pub(crate) fn moved(&self, slot: CymSlot) -> bool {
        self.cymbals.moved(slot)
    }

    /// The target cymbal the strokes of the source cymbal `slot` count as: the one it plays on
    /// when the spread moved it, else its own.
    pub(crate) fn drum(&self, slot: CymSlot) -> CymbalPlace {
        self.cymbals.drum(slot)
    }
}

/// The target places source cymbals already play on, which no later cymbal doubles up on.
struct Taken(Vec<CymbalPlace>);

impl Taken {
    fn has(&self, place: CymbalPlace) -> bool {
        self.0.contains(&place)
    }
}

impl FromIterator<CymbalPlace> for Taken {
    fn from_iter<I: IntoIterator<Item = CymbalPlace>>(places: I) -> Self {
        Self(places.into_iter().collect())
    }
}

impl Extend<CymbalPlace> for Taken {
    fn extend<I: IntoIterator<Item = CymbalPlace>>(&mut self, places: I) {
        self.0.extend(places);
    }
}

/// What one step of the cymbal spread hands the next: the cymbals placed so far and the places
/// taken.
struct Placed {
    cymbals: Landings<CymSlot, CymbalPlace>,
    taken: Taken,
}

/// The first step: each cymbal of a kind both kits have, spread over the target's cymbals of its
/// kind. The places they land on are taken, and so is each ride bell `stand_in` plays a source
/// ride bell stroke on.
fn own_kinds(
    source: &CymbalKit,
    target: &CymbalKit,
    stand_in: &impl Fn(Canon) -> Option<Canon>,
) -> Placed {
    let cymbals: Landings<CymSlot, CymbalPlace> = CymKind::VARIANTS
        .iter()
        .flat_map(|&kind| spread(&source.cymbals(kind), &target.cymbals(kind), Aim::Near))
        .map(|(from, to)| (from, CymbalPlace::Cymbal(to)))
        .collect();
    let own_ride_bells = source
        .ride_bell_strokes()
        .filter_map(|c| stand_in(c).and_then(CymbalPlace::of))
        .filter(|place| matches!(place, CymbalPlace::RideBell(_)));
    let taken = cymbals
        .iter()
        .map(|(_, to)| to)
        .chain(own_ride_bells)
        .collect();
    Placed { cymbals, taken }
}

/// The second step: each cymbal of a kind `target` lacks, kinds in canon order, on the free place
/// of its next kind nearest its number, else nowhere, only taking the place `stand_in` plays its
/// hit on.
fn missing_kinds(
    source: &CymbalKit,
    target: &CymbalKit,
    stand_in: &impl Fn(Canon) -> Option<Canon>,
    placed: Placed,
) -> Placed {
    let Placed {
        mut cymbals,
        mut taken,
    } = placed;
    for &kind in CymKind::VARIANTS {
        if !target.cymbals(kind).is_empty() {
            continue;
        }
        for &from in source.cymbals(kind).iter() {
            let free = target
                .substitutes(from)
                .into_iter()
                .filter(|&to| !taken.has(to))
                .min_by_key(|&to| (to.distance(from), to));
            match free {
                Some(to) => {
                    cymbals.place(from, to);
                    taken.extend([to]);
                }
                None => taken.extend(
                    stand_in(Canon::of_cymbal(from, CymArtic::Hit)).and_then(CymbalPlace::of),
                ),
            }
        }
    }
    Placed { cymbals, taken }
}

/// The third step: where each crash bell of `source` plays on `target`: first every one on its
/// spread crash's bell, then, in crash order, each other one on the nearest free bell of another
/// crash, else on the first ride bell neither `placed` took nor an earlier crash bell claimed.
fn crash_bells(
    source: &CymbalKit,
    target: &CymbalKit,
    placed: &Placed,
) -> Landings<CrashIdx, CrashBell> {
    let spread_crash = |crash: CrashIdx| match placed.cymbals.get(CymSlot::Crash(crash)) {
        Some(CymbalPlace::Cymbal(CymSlot::Crash(to))) => to,
        _ => crash,
    };
    let targets = target.crash_bells();
    let (kept, rest): (Vec<CrashIdx>, Vec<CrashIdx>) = source
        .crash_bells()
        .iter()
        .copied()
        .partition(|&crash| targets.contains(&spread_crash(crash)));
    let mut crashes: Vec<CrashIdx> = kept.iter().map(|&crash| spread_crash(crash)).collect();
    let mut rides: Vec<RideIdx> = Vec::new();
    let mut bells: Landings<CrashIdx, CrashBell> = kept
        .into_iter()
        .map(|crash| (crash, CrashBell::Crash(spread_crash(crash))))
        .collect();
    for crash in rest {
        let near = CymSlot::Crash(spread_crash(crash));
        let other = targets
            .iter()
            .copied()
            .filter(|c| !crashes.contains(c))
            .min_by_key(|&c| (CymSlot::Crash(c).distance(near), c));
        let bell = other.map(CrashBell::Crash).or_else(|| {
            target
                .ride_bells()
                .iter()
                .copied()
                .find(|&ride| {
                    !placed.taken.has(CymbalPlace::RideBell(ride)) && !rides.contains(&ride)
                })
                .map(CrashBell::Ride)
        });
        if let Some(bell) = bell {
            match bell {
                CrashBell::Crash(c) => crashes.push(c),
                CrashBell::Ride(ride) => rides.push(ride),
            }
            bells.place(crash, bell);
        }
    }
    bells
}
