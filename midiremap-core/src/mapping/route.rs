use std::collections::HashMap;

use super::{chain::resolve_on, settings::MissingDrums};
use crate::{
    canon::{Canon, OpenLevel},
    engine::EngineMap,
    spread::{SpreadStroke, Spreads},
};

/// How a drum finds the target drum that plays it.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub(crate) enum Route {
    /// By its own name: the target's drum of that name, else the first drum of its fallback
    /// chain the target has.
    Chain,
    /// An open main hi-hat, on the target's opening at the level that matches the source's.
    Opening(OpenLevel),
    /// A stroke a spread moves, `named` when the target has the stroke itself.
    Spread { stroke: SpreadStroke, named: bool },
}

impl Route {
    /// The target drum `canon` plays as, when it lands by matching the source's rather than
    /// by walking its chain.
    pub(crate) fn matched_drum(self, canon: Canon) -> Option<Canon> {
        match self {
            Self::Chain => None,
            Self::Opening(level) => Some(canon.at_open_level(level)),
            Self::Spread { stroke, .. } => Some(stroke.plays()),
        }
    }
}

/// The route of every drum for one engine pair, decided from the two engines as they ship:
/// no edit changes a route.
pub(crate) struct Routes {
    routes: HashMap<Canon, Route>,
    spreads: Spreads,
}

impl Routes {
    pub(crate) fn new(src: &EngineMap, tgt: &EngineMap, missing: MissingDrums) -> Self {
        let spreads = match missing {
            MissingDrums::Nearest => Spreads::new(src.kit(), tgt.kit(), |c| {
                resolve_on(tgt, c, MissingDrums::Nearest)
                    .played()
                    .map(|(c, _)| c)
            }),
            MissingDrums::Drop => Spreads::default(),
        };
        let routes = Canon::all()
            .iter()
            .map(|&canon| (canon, route(src, tgt, &spreads, canon)))
            .collect();
        Self { routes, spreads }
    }

    pub(crate) fn of(&self, canon: Canon) -> Route {
        self.routes[&canon]
    }

    /// Whether the target has the drum `canon` is a stroke of, and a spread plays the source's
    /// drum of that name on another.
    pub(crate) fn moved(&self, canon: Canon) -> bool {
        self.spreads.moved(canon)
    }
}

fn route(src: &EngineMap, tgt: &EngineMap, spreads: &Spreads, canon: Canon) -> Route {
    if let (Some((level, zone)), Some(from), Some(to)) =
        (canon.opening(), src.open_levels(), tgt.open_levels())
    {
        return Route::Opening(from.toward(to, level, zone));
    }
    spreads
        .stroke(canon)
        .map_or(Route::Chain, |stroke| Route::Spread {
            stroke,
            named: tgt.encode(canon).is_some(),
        })
}
