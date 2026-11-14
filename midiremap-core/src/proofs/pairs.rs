use rayon::prelude::*;

use super::lands_by_match;
use crate::{
    canon::{
        rules::{rules, DrumKind},
        Canon,
    },
    catalog::Catalog,
    engine_map::EngineMap,
    note::Note,
    resolution::MissingDrums,
    translate::Mapping,
};

fn first_agreed(tgt: &EngineMap, canon: Canon) -> Option<Note> {
    rules(canon)
        .own_strokes
        .into_iter()
        .find_map(|s| tgt.encode(s))
}

/// A pair of engines, its mappings under both settings, and the drums the source plays that
/// the target lacks and that stand in: an open main hi-hat that lands on another opening of
/// the target's is a matched opening, which `main_open_hat.rs` and the conversion's own tests
/// judge.
struct Pair<'a> {
    tgt: &'a EngineMap,
    near: Mapping<'a>,
    drop: Mapping<'a>,
    label: String,
    missing: Vec<Canon>,
}

impl<'a> Pair<'a> {
    fn new(src: &'a EngineMap, tgt: &'a EngineMap) -> Self {
        let near = Mapping::new(src, tgt, &Default::default(), MissingDrums::Nearest);
        let drop = Mapping::new(src, tgt, &Default::default(), MissingDrums::Drop);
        let missing = Canon::all()
            .iter()
            .copied()
            .filter(|&c| src.encode(c).is_some() && tgt.encode(c).is_none())
            .filter(|&c| !lands_by_match(&near, tgt, c))
            .collect();
        let label = format!("{} -> {}", src.id(), tgt.id());
        Self {
            tgt,
            near,
            drop,
            label,
            missing,
        }
    }

    fn failures(&self) -> impl Iterator<Item = String> + '_ {
        self.missing.iter().flat_map(move |&canon| {
            let want = first_agreed(self.tgt, canon);
            let dropped = self.drop.resolve_canon(canon).note();
            let nearest = self.near.resolve_canon(canon);
            let pair = format!("{}: {canon}", self.label);
            let drop_failure = (dropped != want)
                .then(|| format!("{pair} (drop) played {dropped:?}, agreed {want:?}"));
            let nearest_failure = match (want, nearest.played()) {
                (Some(_), played) if played.map(|(_, n)| n) != want => Some(format!(
                    "{pair} (nearest) played {played:?}, agreed {want:?}"
                )),
                (None, Some((landed, _))) => {
                    let allowed = rules(canon).lands_on.contains(&DrumKind::from(landed));
                    (canon.same_drum(landed) || !allowed)
                        .then(|| format!("{pair} (nearest) crossed to {landed}"))
                }
                _ => None,
            };
            drop_failure.into_iter().chain(nearest_failure)
        })
    }
}

#[test]
fn every_builtin_pair_plays_the_agreed_stand_in_or_drops() {
    let catalog = Catalog::builtin();
    let engines: Vec<&EngineMap> = catalog.engines().collect();
    let pairs: Vec<Pair> = engines
        .par_iter()
        .flat_map_iter(|&src| engines.iter().map(move |&tgt| Pair::new(src, tgt)))
        .collect();
    let checked: usize = pairs.iter().map(|p| p.missing.len()).sum();
    let failures: Vec<String> = pairs.par_iter().flat_map_iter(Pair::failures).collect();
    assert!(checked > 10_000, "checked only {checked}");
    assert!(
        failures.is_empty(),
        "{} of {checked} break the agreed fallbacks, e.g.\n{}",
        failures.len(),
        failures[..failures.len().min(25)].join("\n")
    );
}
