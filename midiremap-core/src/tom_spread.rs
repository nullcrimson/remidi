use std::collections::{BTreeMap, BTreeSet};

use crate::{
    canon::{Canon, TomArtic, TomPos},
    spread::{spread, Aim},
};

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
