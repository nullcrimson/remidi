mod assign;
mod cymbals;
mod landings;
mod toms;

#[cfg(test)]
pub(crate) use self::cymbals::CymbalPlace;
pub(crate) use self::toms::TomKit;
use self::{
    cymbals::{CymbalKit, CymbalSpread},
    toms::TomSpread,
};
use crate::canon::Canon;

/// The drums of an engine a spread places: its toms and its cymbals.
#[derive(Debug)]
pub(crate) struct Kit {
    toms: TomKit,
    cymbals: CymbalKit,
}

impl Kit {
    /// The toms and cymbals among `drums`.
    pub(crate) fn of(drums: impl IntoIterator<Item = Canon>) -> Self {
        let drums: Vec<Canon> = drums.into_iter().collect();
        Self {
            toms: TomKit::of(&drums),
            cymbals: CymbalKit::of(&drums),
        }
    }

    #[cfg(test)]
    pub(crate) fn toms(&self) -> &TomKit {
        &self.toms
    }

    #[cfg(test)]
    pub(crate) fn cymbals(&self) -> &CymbalKit {
        &self.cymbals
    }
}

/// A stroke a spread moves off its own drum.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub(crate) struct SpreadStroke {
    plays: Canon,
    drum: Canon,
}

impl SpreadStroke {
    /// The target stroke it plays as.
    pub(crate) fn plays(self) -> Canon {
        self.plays
    }

    /// The stroke of the target drum its strokes count as.
    pub(crate) fn drum(self) -> Canon {
        self.drum
    }
}

/// Where an engine pair's spreads move the source's toms and cymbals on the target.
#[derive(Default)]
pub(crate) struct Spreads {
    toms: TomSpread,
    cymbals: CymbalSpread,
}

impl Spreads {
    /// The spreads of `source`'s toms and cymbals over `target`'s, where `stand_in` gives the
    /// target stroke a stroke plays as when nothing spreads it.
    pub(crate) fn new(
        source: &Kit,
        target: &Kit,
        stand_in: impl Fn(Canon) -> Option<Canon>,
    ) -> Self {
        Self {
            toms: TomSpread::new(&source.toms, &target.toms),
            cymbals: CymbalSpread::new(&source.cymbals, &target.cymbals, stand_in),
        }
    }

    /// Where a spread plays `canon`, when it moves it off its own drum.
    pub(crate) fn stroke(&self, canon: Canon) -> Option<SpreadStroke> {
        let (plays, drum) = if let Some((pos, artic)) = canon.tom() {
            let to = self.toms.place(pos, artic)?;
            (canon.at_tom_pos(to), canon.at_tom_pos(self.toms.drum(pos)))
        } else {
            let (slot, artic) = canon.cymbal()?;
            let to = self.cymbals.place(slot, artic)?;
            (to.plays(artic), self.cymbals.drum(slot).plays(artic))
        };
        (plays != canon).then_some(SpreadStroke { plays, drum })
    }

    /// Whether the target has the drum `canon` is a stroke of, and a spread plays the source's
    /// drum of that name on another.
    pub(crate) fn moved(&self, canon: Canon) -> bool {
        canon.tom().is_some_and(|(pos, _)| self.toms.moved(pos))
            || canon
                .cymbal()
                .is_some_and(|(slot, _)| self.cymbals.moved(slot))
    }
}
