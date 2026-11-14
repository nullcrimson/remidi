use std::collections::BTreeMap;

use expect_test::expect_file;
use rayon::prelude::*;

use crate::{
    canon::{
        rules::{kind_rank, rules, stand_in_rank, Anchor, DrumKind},
        Canon,
    },
    catalog::Catalog,
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    resolution::MissingDrums,
    translate::Mapping,
};

/// A way a pair breaks the agreed rules, short of a wrong chain (which L1 rejects outright).
enum Gap {
    /// Plays nothing although the target has one of its anchors.
    Silent,
    /// Lands on another drum, sharing it or of a less preferred kind, while `idle` is free.
    Crowded {
        landed: Canon,
        shared: bool,
        idle: Canon,
    },
}

/// The backlog row a gap belongs to, by the kind of the source drum.
fn backlog(c: Canon) -> &'static str {
    match DrumKind::from(c) {
        DrumKind::Tom => "N61",
        DrumKind::Stack => "N63",
        DrumKind::Crash | DrumKind::China | DrumKind::Splash | DrumKind::Bell => "N70",
        DrumKind::Ride => "N58",
        DrumKind::Aux => "N72",
        DrumKind::Kick | DrumKind::Snare | DrumKind::Hat | DrumKind::Perc | DrumKind::Hand => {
            "unfiled"
        }
    }
}

fn line(label: &str, c: Canon, gap: &Gap) -> String {
    let what = match gap {
        Gap::Silent => "silent although the target plays an anchor".to_owned(),
        Gap::Crowded {
            landed,
            shared: true,
            idle,
        } => format!("shares {landed} while {idle} is idle"),
        Gap::Crowded {
            landed,
            shared: false,
            idle,
        } => format!("lands on {landed} while {idle} is idle"),
    };
    format!("{label} | {c} | {} | {what}", backlog(c))
}

fn encoded(map: &EngineMap) -> Vec<(Canon, Note)> {
    Canon::all()
        .iter()
        .filter_map(|&c| map.encode(c).map(|n| (c, n)))
        .collect()
}

fn gaps(src: &EngineMap, tgt: &EngineMap) -> Vec<String> {
    let near = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let label = format!("{} -> {}", src.id(), tgt.id());
    let played: Vec<(Canon, Option<(Canon, Note)>)> = encoded(src)
        .into_iter()
        .map(|(c, _)| (c, near.resolve_canon(c).played()))
        .collect();
    let mut players: BTreeMap<Note, usize> = BTreeMap::new();
    for (_, p) in &played {
        if let Some((_, note)) = p {
            *players.entry(*note).or_default() += 1;
        }
    }
    let targets = encoded(tgt);
    let idle = |c: Canon, best: usize, shared: bool| {
        targets.iter().find_map(|&(d, note)| {
            let rank = stand_in_rank(c, d)?;
            let better = rank < best || (shared && rank == best);
            (better && !players.contains_key(&note)).then_some(d)
        })
    };
    played
        .iter()
        .filter_map(|&(c, p)| {
            let gap = match p {
                None => match rules(c).anchor {
                    Anchor::Any(anchors) if anchors.iter().any(|&a| tgt.encode(a).is_some()) => {
                        Some(Gap::Silent)
                    }
                    Anchor::Any(_) | Anchor::MayDrop(_) => None,
                },
                Some((landed, note)) if !c.same_drum(landed) => {
                    let shared = players[&note] > 1;
                    let best = kind_rank(c, landed)?;
                    idle(c, best, shared).map(|idle| Gap::Crowded {
                        landed,
                        shared,
                        idle,
                    })
                }
                Some(_) => None,
            }?;
            Some(line(&label, c, &gap))
        })
        .collect()
}

fn all_pairs() -> Vec<(&'static EngineMap, &'static EngineMap)> {
    let catalog = Catalog::shared();
    let engines: Vec<&EngineMap> = catalog.engines().collect();
    engines
        .iter()
        .flat_map(|&src| engines.iter().map(move |&tgt| (src, tgt)))
        .collect()
}

#[test]
fn every_gap_of_every_builtin_pair_is_a_known_gap() {
    let found: Vec<String> = all_pairs()
        .par_iter()
        .flat_map_iter(|&(src, tgt)| gaps(src, tgt))
        .collect();
    let text: String = found.iter().map(|l| format!("{l}\n")).collect();
    expect_file!["../../tests/golden/known_gaps.txt"].assert_eq(&text);
}

/// The note `t` is edited to: half the keyboard away, so it is never its own.
fn edited_note(note: Note) -> Note {
    Note::new((note.get() + 64) % 128).expect("a note below 128")
}

fn edits_not_followed(src: &EngineMap, tgt: &EngineMap) -> Vec<String> {
    let near = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let moved: Vec<(Canon, Canon, Note)> = encoded(src)
        .into_iter()
        .filter(|&(c, _)| !c.is_open_main_hat())
        .filter_map(|(c, _)| {
            let (landed, note) = near.resolve_canon(c).played()?;
            (landed != c).then_some((c, landed, note))
        })
        .collect();
    let edits: BTreeMap<Canon, Note> = moved
        .iter()
        .map(|&(_, landed, note)| (landed, edited_note(note)))
        .collect();
    let edited = Mapping::new(
        src,
        tgt,
        &Overrides::new(edits.clone(), BTreeMap::new()),
        MissingDrums::Nearest,
    );
    moved
        .iter()
        .filter_map(|&(c, landed, _)| {
            let want = Some((landed, edits[&landed]));
            let got = edited.resolve_canon(c).played();
            (got != want).then(|| {
                format!(
                    "{} -> {}: {c} played {got:?}, {landed} edited to {:?}",
                    src.id(),
                    tgt.id(),
                    edits[&landed]
                )
            })
        })
        .collect()
}

#[test]
fn a_stand_in_follows_an_edit_of_the_drum_it_lands_on() {
    let pairs = all_pairs();
    let failures: Vec<String> = pairs
        .par_iter()
        .flat_map_iter(|&(src, tgt)| edits_not_followed(src, tgt))
        .collect();
    assert!(
        failures.is_empty(),
        "{} stand-ins ignore an edit, e.g.\n{}",
        failures.len(),
        failures[..failures.len().min(25)].join("\n")
    );
}
