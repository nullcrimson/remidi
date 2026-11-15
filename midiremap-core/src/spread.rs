use std::{
    collections::{BTreeMap, BTreeSet},
    iter::once,
    ops::Add,
};

use crate::canon::{CymDistance, CymSlot, TomDistance, TomPos};

/// A place on a kit that a spread lands drums on: ordered along the kit, the first the one a
/// tie goes to, with how far apart two places sit and whether moving between them crosses
/// from one part of the kit to another.
pub(crate) trait SpreadPos: Copy + Ord {
    type Distance: Copy + Ord + Default + Add<Output = Self::Distance>;

    fn distance(self, other: Self) -> Self::Distance;

    fn crosses(self, other: Self) -> bool;
}

impl SpreadPos for TomPos {
    type Distance = TomDistance;

    fn distance(self, other: Self) -> TomDistance {
        TomPos::distance(self, other)
    }

    fn crosses(self, other: Self) -> bool {
        self.is_rack() != other.is_rack()
    }
}

impl SpreadPos for CymSlot {
    type Distance = CymDistance;

    fn distance(self, other: Self) -> CymDistance {
        CymSlot::distance(self, other)
    }

    fn crosses(self, other: Self) -> bool {
        self.kind() != other.kind()
    }
}

/// Where a source drum aims: near a target place, or kept on it whenever the target has it.
#[derive(Copy, Clone)]
pub(crate) enum Aim<P> {
    Near(P),
    Kept(P),
}

/// What a landing gives up, worst first: drums split from the place they keep to, neighbours
/// merged onto one target place, crossings, and distance.
#[derive(Copy, Clone, Default, PartialEq, Eq, PartialOrd, Ord)]
struct Cost<D> {
    splits: u8,
    merges: u8,
    crossings: u8,
    distance: D,
}

impl<D: Add<Output = D>> Add for Cost<D> {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self {
            splits: self.splits + other.splits,
            merges: self.merges + other.merges,
            crossings: self.crossings + other.crossings,
            distance: self.distance + other.distance,
        }
    }
}

impl<P: SpreadPos> Aim<P> {
    fn at(self) -> P {
        match self {
            Self::Near(pos) | Self::Kept(pos) => pos,
        }
    }

    fn cost(self, to: P) -> Cost<P::Distance> {
        Cost {
            splits: u8::from(matches!(self, Self::Kept(pos) if pos != to)),
            merges: 0,
            crossings: u8::from(self.at().crosses(to)),
            distance: self.at().distance(to),
        }
    }
}

fn merge<D: Default>() -> Cost<D> {
    Cost {
        merges: 1,
        ..Cost::default()
    }
}

/// The landing of each of `source`'s places on `target`'s, in order, that costs least, the
/// first target places on a tie.
pub(crate) fn spread<P: SpreadPos>(
    source: &BTreeSet<P>,
    target: &BTreeSet<P>,
    aim: impl Fn(P) -> Aim<P>,
) -> BTreeMap<P, P> {
    let from: Vec<P> = source.iter().copied().collect();
    let to: Vec<P> = target.iter().copied().collect();
    let Some(&last) = from.last() else {
        return BTreeMap::new();
    };
    if to.is_empty() {
        return BTreeMap::new();
    }
    let mut suffix: Vec<(Cost<P::Distance>, Vec<usize>)> = (0..to.len())
        .map(|j| (aim(last).cost(to[j]), vec![j]))
        .collect();
    for &place in from.iter().rev().skip(1) {
        suffix = (0..to.len())
            .map(|j| {
                let (rest_cost, rest) = (j..to.len())
                    .map(|next| {
                        let merge = if next == j { merge() } else { Cost::default() };
                        (suffix[next].0 + merge, &suffix[next].1)
                    })
                    .min()
                    .expect("j is a target place, so j.. holds one");
                let landings = once(j).chain(rest.iter().copied()).collect();
                (aim(place).cost(to[j]) + rest_cost, landings)
            })
            .collect();
    }
    let (_, landings) = suffix.into_iter().min().expect("the target has a place");
    from.into_iter()
        .zip(landings.into_iter().map(|j| to[j]))
        .collect()
}
