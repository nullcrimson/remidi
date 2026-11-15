use crate::{
    canon::{Canon, SpreadTo, TomArtic},
    engine_map::EngineMap,
    resolution::{Match, MissingDrums},
    tom_spread::TomSpread,
};

/// Where an engine pair's spreads move the source's drums on the target, so drums of a kind
/// keep their own places instead of doubling up: the toms under [`MissingDrums::Nearest`],
/// nothing under [`MissingDrums::Drop`].
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct Spreads {
    toms: TomSpread,
}

impl Spreads {
    pub(crate) fn new(src: &EngineMap, tgt: &EngineMap, missing: MissingDrums) -> Self {
        match missing {
            MissingDrums::Nearest => Self {
                toms: TomSpread::new(src.toms(), tgt.toms()),
            },
            MissingDrums::Drop => Self::default(),
        }
    }

    /// How `canon` lands when a spread moves it off its own drum on `tgt`.
    pub(crate) fn matched(&self, tgt: &EngineMap, canon: Canon) -> Option<Match> {
        let (pos, artic) = canon.tom()?;
        let to = match artic {
            TomArtic::Hit | TomArtic::Rimshot => self.toms.hit(pos),
            TomArtic::Rim => self.toms.rim(pos),
        }?;
        (to != pos).then(|| Match::Spread {
            to: SpreadTo::Tom(to),
            drum: SpreadTo::Tom(self.toms.drum(pos)),
            named: tgt.encode(canon).is_some(),
        })
    }

    /// Whether the target has the drum `canon` is a stroke of, and a spread plays the source's
    /// drum of that name on another.
    pub(crate) fn moved(&self, canon: Canon) -> bool {
        canon.tom().is_some_and(|(pos, _)| self.toms.moved(pos))
    }
}
