use std::collections::{BTreeMap, BTreeSet};

use expect_test::expect_file;
use rayon::prelude::*;

use super::{all_pairs, assert_none};
use crate::{
    canon::{
        k,
        rules::{kind_rank, rules, stand_in_rank, Anchor, DrumKind},
        Canon,
    },
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    resolution::{MissingDrums, Outcome},
    translate::Mapping,
};

/// A way a pair breaks the agreed rules, short of a wrong chain (which L1 rejects outright).
enum Gap {
    /// Plays nothing although the target has one of its anchors.
    Silent,
    /// Lands on a drum another source drum plays while `idle`, a drum nothing plays, would do
    /// as well.
    Shared { landed: Canon, idle: Canon },
    /// Lands on a drum of a less preferred kind while `idle`, of a more preferred kind, is free.
    Worse { landed: Canon, idle: Canon },
}

/// The backlog row a gap belongs to: a doubling up by the kind of drum left idle, a less
/// preferred kind by the source drum whose preference it breaks.
fn backlog(c: Canon, gap: &Gap) -> &'static str {
    match gap {
        Gap::Silent => "silent",
        Gap::Shared { idle, .. } => match DrumKind::from(*idle) {
            DrumKind::Tom => "N61",
            DrumKind::Crash
            | DrumKind::China
            | DrumKind::Splash
            | DrumKind::Stack
            | DrumKind::Bell
            | DrumKind::Ride => "N70",
            DrumKind::Kick
            | DrumKind::Snare
            | DrumKind::Hat
            | DrumKind::Aux
            | DrumKind::Perc
            | DrumKind::Hand => "unfiled",
        },
        Gap::Worse { .. } => match DrumKind::from(c) {
            DrumKind::Stack => "N63",
            DrumKind::Ride => "N58",
            DrumKind::Kick
            | DrumKind::Snare
            | DrumKind::Tom
            | DrumKind::Hat
            | DrumKind::Aux
            | DrumKind::Perc
            | DrumKind::Hand
            | DrumKind::Crash
            | DrumKind::China
            | DrumKind::Splash
            | DrumKind::Bell => "unfiled",
        },
    }
}

fn line(label: &str, c: Canon, gap: &Gap) -> String {
    let what = match gap {
        Gap::Silent => "silent although the target plays an anchor".to_owned(),
        Gap::Shared { landed, idle } => format!("shares {landed} while {idle} is idle"),
        Gap::Worse { landed, idle } => format!("lands on {landed} while {idle} is idle"),
    };
    format!("{label} | {c} | {} | {what}", backlog(c, gap))
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
    let sounding: BTreeSet<Note> = played
        .iter()
        .filter_map(|(_, p)| p.map(|(_, n)| n))
        .collect();
    let targets = encoded(tgt);
    let drum_idle = |d: Canon| {
        targets
            .iter()
            .filter(|(e, _)| e.same_drum(d))
            .all(|(_, n)| !sounding.contains(n))
    };
    let best_idle = |c: Canon| {
        targets
            .iter()
            .filter_map(|&(d, _)| stand_in_rank(c, d).map(|rank| (rank, d)))
            .filter(|&(_, d)| drum_idle(d))
            .min_by_key(|&(rank, _)| rank)
    };
    let shared_by_another = |c: Canon, note: Note| {
        played
            .iter()
            .any(|&(o, p)| !c.same_drum(o) && p.is_some_and(|(_, n)| n == note))
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
                    let at = kind_rank(c, landed)?;
                    let (rank, idle) = best_idle(c)?;
                    if rank < at {
                        Some(Gap::Worse { landed, idle })
                    } else if rank == at && shared_by_another(c, note) {
                        Some(Gap::Shared { landed, idle })
                    } else {
                        None
                    }
                }
                Some(_) => None,
            }?;
            Some(line(&label, c, &gap))
        })
        .collect()
}

#[test]
fn every_gap_of_every_builtin_pair_is_a_known_gap() {
    let found: Vec<String> = all_pairs()
        .par_iter()
        .flat_map_iter(|&(src, tgt)| gaps(src, tgt))
        .collect();
    let text: String = found.iter().map(|l| format!("{l}\n")).collect();
    if std::env::var_os("UPDATE_EXPECT").is_some() {
        expect_file!["../../tests/golden/known_gaps.txt"].assert_eq(&text);
        return;
    }
    let known: BTreeSet<&str> = KNOWN_GAPS.lines().collect();
    let now: BTreeSet<&str> = found.iter().map(String::as_str).collect();
    let fixed: Vec<&str> = known.difference(&now).copied().collect();
    let new: Vec<&str> = now.difference(&known).copied().collect();
    let sample = |lines: &[&str]| lines[..lines.len().min(20)].join("\n");
    assert!(
        fixed.is_empty() && new.is_empty() && text == KNOWN_GAPS,
        "known_gaps.txt is out of date; review, then rerun with UPDATE_EXPECT=1.\n{} gone, e.g.\n{}\n{} new, e.g.\n{}",
        fixed.len(),
        sample(&fixed),
        new.len(),
        sample(&new)
    );
}

/// The gaps as last reviewed. The golden is compared line by line here, not with
/// expect-test's diff, which does not finish on a file of ten thousand lines.
const KNOWN_GAPS: &str = include_str!("../../tests/golden/known_gaps.txt");

/// The note `t` is edited to: half the keyboard away, so it is never its own.
fn edited_note(note: Note) -> Note {
    Note::new((note.get() + 64) % 128).expect("a note below 128")
}

/// Whether `landed` is a stroke of a tom the target has whose source tom the spread moved
/// onto another, so an edit of its row moves that row alone.
fn moved_off_its_name(near: &Mapping, landed: Canon) -> bool {
    landed.tom().is_some_and(|(pos, _)| {
        let hit = k("tom.rack1.hit").at_tom_pos(pos);
        matches!(near.resolve_canon(hit), Outcome::Direct(l) if l.plays() != hit)
    })
}

fn edits_not_followed(src: &EngineMap, tgt: &EngineMap) -> Vec<String> {
    let near = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let moved: Vec<(Canon, Canon, Note)> = encoded(src)
        .into_iter()
        .filter(|&(c, _)| !(c.is_open_main_hat() && near.matched_drum(c).is_some()))
        .filter_map(|(c, _)| {
            let (landed, note) = near.resolve_canon(c).played()?;
            (landed != c).then_some((c, landed, note))
        })
        .filter(|&(_, landed, _)| !moved_off_its_name(&near, landed))
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
    assert_none(&failures, "stand-ins ignore an edit");
}
