use std::{
    collections::{BTreeMap, BTreeSet},
    ops::Add,
};

use crate::canon::{Canon, TomArtic, TomDistance, TomPos};

/// The toms an engine plays: the positions it plays a hit on and those it plays a rim on.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct TomKit {
    hits: BTreeSet<TomPos>,
    rims: BTreeSet<TomPos>,
}

impl TomKit {
    /// The toms among `drums`.
    pub(crate) fn of(drums: impl IntoIterator<Item = Canon>) -> Self {
        let mut kit = Self::default();
        for (pos, stroke) in drums.into_iter().filter_map(Canon::tom) {
            match stroke {
                TomArtic::Hit => kit.hits.insert(pos),
                TomArtic::Rim => kit.rims.insert(pos),
                TomArtic::Rimshot => false,
            };
        }
        kit
    }

    #[cfg(test)]
    pub(crate) fn hits(&self) -> &BTreeSet<TomPos> {
        &self.hits
    }

    #[cfg(test)]
    pub(crate) fn rims(&self) -> &BTreeSet<TomPos> {
        &self.rims
    }
}

/// Where each tom of a source kit plays on a target kit, so a fill keeps as many pitches as
/// the target has toms: hits in pitch order onto as many target toms as possible, racks on
/// racks and floors on floors wherever that leaves no target tom idle, nearest first, the
/// higher tom on a tie; rims the same way over the target's rims, each on its hit's tom
/// whenever that tom has a rim.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct TomSpread {
    hits: BTreeMap<TomPos, TomPos>,
    rims: BTreeMap<TomPos, TomPos>,
    moved: BTreeSet<TomPos>,
}

impl TomSpread {
    pub(crate) fn new(source: &TomKit, target: &TomKit) -> Self {
        let hits = spread(&source.hits, &target.hits, Aim::Near);
        let rims = spread(&source.rims, &target.rims, |rim| {
            let anchor = hits.get(&rim).copied().unwrap_or(rim);
            if target.rims.contains(&anchor) {
                Aim::Kept(anchor)
            } else {
                Aim::Near(anchor)
            }
        });
        let moved = hits
            .iter()
            .filter(|&(from, to)| from != to && target.hits.contains(from))
            .map(|(&from, _)| from)
            .collect();
        Self { hits, rims, moved }
    }

    /// The target tom the source tom at `from` plays its hits and rimshots on.
    pub(crate) fn hit(&self, from: TomPos) -> Option<TomPos> {
        self.hits.get(&from).copied()
    }

    /// The target tom the source tom at `from` plays its rims on.
    pub(crate) fn rim(&self, from: TomPos) -> Option<TomPos> {
        self.rims.get(&from).copied()
    }

    /// Whether the target has the tom at `pos` and the source's tom there plays on another.
    pub(crate) fn moved(&self, pos: TomPos) -> bool {
        self.moved.contains(&pos)
    }

    /// The target tom the strokes of the source tom at `from` count as: the tom its hits play
    /// on when the spread moved it, else its own.
    pub(crate) fn drum(&self, from: TomPos) -> TomPos {
        match self.hits.get(&from) {
            Some(&to) if self.moved(from) => to,
            _ => from,
        }
    }
}

/// Where a source tom aims: near a target tom, or kept on it whenever the target has it.
#[derive(Copy, Clone)]
enum Aim {
    Near(TomPos),
    Kept(TomPos),
}

/// What a landing gives up, worst first: toms split from the tom they keep to, neighbours
/// merged onto one target tom, racks crossed to floors or back, and distance.
#[derive(Copy, Clone, Default, PartialEq, Eq, PartialOrd, Ord)]
struct Cost {
    splits: u8,
    merges: u8,
    crossings: u8,
    distance: TomDistance,
}

impl Add for Cost {
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

impl Aim {
    fn at(self) -> TomPos {
        match self {
            Self::Near(pos) | Self::Kept(pos) => pos,
        }
    }

    fn cost(self, to: TomPos) -> Cost {
        Cost {
            splits: u8::from(matches!(self, Self::Kept(pos) if pos != to)),
            merges: 0,
            crossings: u8::from(self.at().is_rack() != to.is_rack()),
            distance: self.at().distance(to),
        }
    }
}

const MERGE: Cost = Cost {
    splits: 0,
    merges: 1,
    crossings: 0,
    distance: TomDistance::ZERO,
};

/// The landing of each of `source`'s toms on `target`'s, in order, that costs least, the
/// higher target toms first on a tie.
fn spread(
    source: &BTreeSet<TomPos>,
    target: &BTreeSet<TomPos>,
    aim: impl Fn(TomPos) -> Aim,
) -> BTreeMap<TomPos, TomPos> {
    let from: Vec<TomPos> = source.iter().copied().collect();
    let to: Vec<TomPos> = target.iter().copied().collect();
    let Some(&last) = from.last() else {
        return BTreeMap::new();
    };
    if to.is_empty() {
        return BTreeMap::new();
    }
    let mut suffix: Vec<(Cost, Vec<usize>)> = (0..to.len())
        .map(|j| (aim(last).cost(to[j]), vec![j]))
        .collect();
    for &tom in from.iter().rev().skip(1) {
        suffix = (0..to.len())
            .map(|j| {
                let (rest_cost, rest) = (j..to.len())
                    .map(|next| {
                        let merge = if next == j { MERGE } else { Cost::default() };
                        (suffix[next].0 + merge, &suffix[next].1)
                    })
                    .min()
                    .expect("j is a target tom, so j.. holds one");
                let landings = std::iter::once(j).chain(rest.iter().copied()).collect();
                (aim(tom).cost(to[j]) + rest_cost, landings)
            })
            .collect();
    }
    let (_, landings) = suffix.into_iter().min().expect("the target has a tom");
    from.into_iter()
        .zip(landings.into_iter().map(|j| to[j]))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::{idx, TomPos::*};

    fn kit(hits: &[TomPos]) -> TomKit {
        TomKit {
            hits: hits.iter().copied().collect(),
            rims: BTreeSet::new(),
        }
    }

    #[test]
    fn a_tom_between_two_equally_near_toms_plays_the_higher() {
        let spread = TomSpread::new(&kit(&[Rack(idx(2))]), &kit(&[Rack(idx(1)), Rack(idx(3))]));
        assert_eq!(spread.hit(Rack(idx(2))), Some(Rack(idx(1))));
    }

    #[test]
    fn only_the_lowest_rack_crosses_to_the_floors() {
        let source = kit(&[
            Rack(idx(1)),
            Rack(idx(2)),
            Rack(idx(3)),
            Rack(idx(4)),
            Floor(idx(1)),
            Floor(idx(2)),
        ]);
        let target = kit(&[
            Rack(idx(1)),
            Rack(idx(2)),
            Floor(idx(1)),
            Floor(idx(2)),
            Floor(idx(3)),
        ]);
        let spread = TomSpread::new(&source, &target);
        let crossed: Vec<TomPos> = source
            .hits()
            .iter()
            .copied()
            .filter(|&p| spread.hit(p).is_some_and(|to| to.is_rack() != p.is_rack()))
            .collect();
        assert_eq!(crossed, vec![Rack(idx(4))]);
    }
}
