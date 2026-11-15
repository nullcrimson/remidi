use std::collections::HashMap;

use midiremap_kit::{canon::Canon, engine::EngineMap};
use midiremap_note::Note;

use super::{
    outcome::{Landing, Outcome, StandIn},
    settings::MissingDrums,
};

pub(crate) type Encoding = HashMap<Canon, Note>;

fn substitute(
    canon: Canon,
    encode: impl Fn(Canon) -> Option<Note>,
    missing: MissingDrums,
) -> Option<(Canon, Note)> {
    canon
        .fallback_chain()
        .iter()
        .copied()
        .filter(|&alt| missing.allows(canon, alt))
        .find_map(|alt| encode(alt).map(|note| (alt, note)))
}

/// Where `canon` lands on a target whose note for each drum `encode` gives.
pub(crate) fn resolve(
    canon: Canon,
    encode: impl Fn(Canon) -> Option<Note>,
    missing: MissingDrums,
) -> Outcome {
    if let Some(note) = encode(canon) {
        return Outcome::Direct(Landing::itself(canon, note));
    }
    substitute(canon, &encode, missing).map_or_else(
        || Outcome::Dropped {
            canon,
            other_drum: substitute(canon, &encode, MissingDrums::Nearest).is_some(),
        },
        |(stand_in, note)| Outcome::Fallback(StandIn::new(canon, canon, stand_in, note)),
    )
}

/// Where a drum lands on `map` with no edits: what the converter writes for it.
pub fn resolve_on(map: &EngineMap, canon: Canon, missing: MissingDrums) -> Outcome {
    resolve(canon, |c| map.encode(c), missing)
}
