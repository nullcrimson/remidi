use std::collections::{BTreeMap, HashMap};

use midiremap_kit::{
    canon::{Canon, OpenLevel, Rung},
    engine::EngineMap,
    spread::SpreadStroke,
};
use midiremap_note::Note;

use super::{
    chain::{resolve, resolve_on, Encoding},
    outcome::{Landing, Outcome, StandIn},
    route::{Route, Routes},
    settings::MissingDrums,
};

/// The notes a drum can land on, read three ways.
struct TargetNotes<'a> {
    /// The target as it ships.
    stock: &'a EngineMap,
    /// The target with every edit.
    edited: Encoding,
    /// The target with the edits a spread's landings follow: every edit but those of the
    /// drums a spread moved off their own name.
    following: Encoding,
    edits: &'a BTreeMap<Canon, Note>,
}

impl<'a> TargetNotes<'a> {
    fn new(tgt: &'a EngineMap, edits: &'a BTreeMap<Canon, Note>, routes: &Routes) -> Self {
        Self {
            stock: tgt,
            edited: encoding(tgt, edits.iter()),
            following: encoding(tgt, edits.iter().filter(|&(&c, _)| !routes.moved(c))),
            edits,
        }
    }
}

/// The target's notes with `edits` chained after them, so an edit wins over the stock note.
fn encoding<'e>(tgt: &EngineMap, edits: impl Iterator<Item = (&'e Canon, &'e Note)>) -> Encoding {
    tgt.encodings()
        .chain(edits.map(|(&canon, &note)| (canon, note)))
        .collect()
}

/// Where every drum of the vocabulary lands on one target.
pub(crate) struct DrumTable(HashMap<Canon, Outcome>);

impl DrumTable {
    /// Lands every drum along its route on `tgt` with `edits` applied.
    pub(crate) fn compile(
        routes: &Routes,
        tgt: &EngineMap,
        edits: &BTreeMap<Canon, Note>,
        missing: MissingDrums,
    ) -> Self {
        let notes = TargetNotes::new(tgt, edits, routes);
        Self(
            Canon::all()
                .iter()
                .map(|&canon| (canon, land(canon, routes.of(canon), &notes, missing)))
                .collect(),
        )
    }

    pub(crate) fn get(&self, canon: Canon) -> Outcome {
        self.0[&canon]
    }
}

/// Where `canon` lands along `route`. A drum with an edit of its own plays that edit,
/// whatever its route; a spread stroke follows the edits of the drum it lands on; a matched
/// opening follows no edit but its own.
fn land(canon: Canon, route: Route, notes: &TargetNotes, missing: MissingDrums) -> Outcome {
    let edited = |c: Canon| notes.edited.get(&c).copied();
    match route {
        Route::Chain => resolve(canon, edited, missing),
        Route::Opening(_) | Route::Spread { .. } if notes.edits.contains_key(&canon) => {
            resolve(canon, edited, missing)
        }
        Route::Opening(level) => opened(
            canon,
            level,
            resolve_on(notes.stock, canon.at_rung(Rung::Level(level)), missing),
        ),
        Route::Spread { stroke, named } => spread(
            canon,
            stroke,
            named,
            resolve(
                stroke.plays(),
                |c| notes.following.get(&c).copied(),
                missing,
            ),
        ),
    }
}

/// The landing of the opening at `level`, as the landing of the open main hi-hat `canon`.
fn opened(canon: Canon, level: OpenLevel, landed: Outcome) -> Outcome {
    match landed {
        Outcome::Direct(landing) => {
            Outcome::Direct(Landing::opened_to(canon, level, landing.note()))
        }
        Outcome::Fallback(s) => {
            Outcome::Fallback(StandIn::new(canon, canon, s.stand_in(), s.note()))
        }
        Outcome::Dropped { other_drum, .. } => Outcome::Dropped { canon, other_drum },
    }
}

/// The landing of the stroke a spread moves `canon` to, as the landing of `canon`: direct
/// when the target has `canon` by name, else a stand-in judged against the stroke of the drum
/// `canon`'s strokes count as.
fn spread(canon: Canon, stroke: SpreadStroke, named: bool, landed: Outcome) -> Outcome {
    match landed {
        Outcome::Direct(landing) if named => {
            Outcome::Direct(Landing::spread_to(canon, stroke.plays(), landing.note()))
        }
        Outcome::Direct(landing) => Outcome::Fallback(StandIn::new(
            canon,
            stroke.drum(),
            landing.plays(),
            landing.note(),
        )),
        Outcome::Fallback(s) => {
            Outcome::Fallback(StandIn::new(canon, stroke.drum(), s.stand_in(), s.note()))
        }
        Outcome::Dropped { other_drum, .. } => Outcome::Dropped { canon, other_drum },
    }
}
