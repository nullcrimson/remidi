use crate::{
    canon::{Canon, SpreadTo, TomArtic},
    cymbal_spread::CymbalSpread,
    engine_map::EngineMap,
    resolution::{Match, MissingDrums},
    tom_spread::TomSpread,
};

/// Where an engine pair's spreads move the source's drums on the target, so drums of a kind
/// keep their own places instead of doubling up: the toms and the cymbals under
/// [`MissingDrums::Nearest`], nothing under [`MissingDrums::Drop`].
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct Spreads {
    toms: TomSpread,
    cymbals: CymbalSpread,
}

impl Spreads {
    pub(crate) fn new(src: &EngineMap, tgt: &EngineMap, missing: MissingDrums) -> Self {
        match missing {
            MissingDrums::Nearest => Self {
                toms: TomSpread::new(src.toms(), tgt.toms()),
                cymbals: CymbalSpread::new(src.cymbals(), tgt.cymbals()),
            },
            MissingDrums::Drop => Self::default(),
        }
    }

    /// How `canon` lands when a spread moves it off its own drum on `tgt`.
    pub(crate) fn matched(&self, tgt: &EngineMap, canon: Canon) -> Option<Match> {
        let (to, drum) = self.spread(canon)?;
        (to.plays(canon) != canon).then(|| Match::Spread {
            to,
            drum,
            named: tgt.encode(canon).is_some(),
        })
    }

    /// Where a spread plays `canon`, and the target drum its strokes count as.
    fn spread(&self, canon: Canon) -> Option<(SpreadTo, SpreadTo)> {
        if let Some((pos, artic)) = canon.tom() {
            let to = match artic {
                TomArtic::Hit | TomArtic::Rimshot => self.toms.hit(pos),
                TomArtic::Rim => self.toms.rim(pos),
            }?;
            return Some((SpreadTo::Tom(to), SpreadTo::Tom(self.toms.drum(pos))));
        }
        let (slot, artic) = canon.cymbal()?;
        Some((self.cymbals.landing(slot, artic)?, self.cymbals.drum(slot)))
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
