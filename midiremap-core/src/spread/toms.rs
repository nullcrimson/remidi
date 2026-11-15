use super::{
    assign::{spread, Aim, Places},
    landings::{Landings, Moved},
};
use crate::canon::{Canon, TomArtic, TomPos};

/// The toms an engine plays: the positions it plays a hit on and those it plays a rim on.
#[derive(Debug)]
pub(crate) struct TomKit {
    hits: Places<TomPos>,
    rims: Places<TomPos>,
}

impl TomKit {
    /// The toms among `drums`.
    pub(crate) fn of(drums: &[Canon]) -> Self {
        let toms = |stroke: TomArtic| {
            Places::of(
                drums
                    .iter()
                    .filter_map(|c| c.tom())
                    .filter(|&(_, artic)| artic == stroke)
                    .map(|(pos, _)| pos),
            )
        };
        Self {
            hits: toms(TomArtic::Hit),
            rims: toms(TomArtic::Rim),
        }
    }

    #[cfg(test)]
    pub(crate) fn hits(&self) -> &[TomPos] {
        &self.hits
    }

    #[cfg(test)]
    pub(crate) fn rims(&self) -> &[TomPos] {
        &self.rims
    }
}

/// Where each tom of a source kit plays on a target kit, so a fill keeps as many pitches as
/// the target has toms: hits in pitch order onto as many target toms as possible, racks on
/// racks and floors on floors wherever that leaves no target tom idle, nearest first, the
/// higher tom on a tie; rims the same way over the target's rims, each on its hit's tom
/// whenever that tom has a rim.
#[derive(Default)]
pub(crate) struct TomSpread {
    hits: Moved<TomPos, TomPos>,
    rims: Landings<TomPos, TomPos>,
}

impl TomSpread {
    pub(crate) fn new(source: &TomKit, target: &TomKit) -> Self {
        let hits = spread(&source.hits, &target.hits, Aim::Near);
        let rims = spread(&source.rims, &target.rims, |rim| {
            let anchor = hits.get(rim).unwrap_or(rim);
            if target.rims.contains(&anchor) {
                Aim::Kept(anchor)
            } else {
                Aim::Near(anchor)
            }
        });
        Self {
            hits: Moved::new(hits, |from| target.hits.contains(&from)),
            rims,
        }
    }

    /// The target tom the stroke `artic` of the source tom at `from` plays on: hits and
    /// rimshots on its hit's tom, rims on its rim's.
    pub(crate) fn place(&self, from: TomPos, artic: TomArtic) -> Option<TomPos> {
        match artic {
            TomArtic::Hit | TomArtic::Rimshot => self.hits.get(from),
            TomArtic::Rim => self.rims.get(from),
        }
    }

    /// Whether the target has the tom at `pos` and the source's tom there plays on another.
    pub(crate) fn moved(&self, pos: TomPos) -> bool {
        self.hits.moved(pos)
    }

    /// The target tom the strokes of the source tom at `from` count as: the tom its hits play
    /// on when the spread moved it, else its own.
    pub(crate) fn drum(&self, from: TomPos) -> TomPos {
        self.hits.drum(from)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::{idx, TomPos::*};

    fn kit(hits: &[TomPos]) -> TomKit {
        TomKit {
            hits: Places::of(hits.iter().copied()),
            rims: Places::of([]),
        }
    }

    #[test]
    fn a_tom_between_two_equally_near_toms_plays_the_higher() {
        let spread = TomSpread::new(&kit(&[Rack(idx(2))]), &kit(&[Rack(idx(1)), Rack(idx(3))]));
        assert_eq!(
            spread.place(Rack(idx(2)), TomArtic::Hit),
            Some(Rack(idx(1)))
        );
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
            .filter(|&p| {
                spread
                    .place(p, TomArtic::Hit)
                    .is_some_and(|to| to.is_rack() != p.is_rack())
            })
            .collect();
        assert_eq!(crossed, vec![Rack(idx(4))]);
    }
}
