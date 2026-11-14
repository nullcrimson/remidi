mod audit;
mod open_hats;
mod pairs;
mod toms;

use expect_test::expect_file;

use crate::{
    canon::{
        rules::{rules, snapshot, Anchor, DrumKind},
        Canon,
    },
    engine_map::EngineMap,
    resolution::MissingDrums,
    translate::Mapping,
};

/// Whether `c` lands by match on another note than its chain would give it, which the proofs
/// of that match judge (`main_open_hat.rs` for an open main hi-hat), not the stand-in table.
fn lands_by_match(near: &Mapping, tgt: &EngineMap, c: Canon) -> bool {
    near.matched_drum(c).is_some()
        && near.resolve_canon(c).note() != tgt.resolve(c, MissingDrums::Nearest).note()
}

#[test]
fn the_rule_table_matches_its_reviewed_snapshot() {
    expect_file!["../../tests/golden/rules.txt"].assert_eq(&snapshot());
}

#[test]
fn every_chain_lists_the_agreed_strokes_of_its_own_drum_first() {
    for &c in Canon::all() {
        let chain = c.fallback_chain();
        let own: Vec<Canon> = chain
            .iter()
            .copied()
            .take_while(|&o| c.same_drum(o))
            .collect();
        assert_eq!(own, rules(c).own_strokes, "{c}");
        assert!(
            chain[own.len()..].iter().all(|&o| !c.same_drum(o)),
            "{c} comes back to its own drum: {chain:?}"
        );
    }
}

#[test]
fn every_chain_reaches_other_drums_only_of_the_kinds_its_rules_allow_in_their_order() {
    for &c in Canon::all() {
        let allowed = rules(c).lands_on;
        let mut seen: Vec<DrumKind> = Vec::new();
        for &o in c.fallback_chain().iter().filter(|&&o| !c.same_drum(o)) {
            let kind = DrumKind::from(o);
            assert!(allowed.contains(&kind), "{c} stands in with {o} ({kind})");
            if !seen.contains(&kind) {
                seen.push(kind);
            }
        }
        let rank = |k: &DrumKind| allowed.iter().position(|a| a == k);
        assert!(
            seen.windows(2).all(|w| rank(&w[0]) < rank(&w[1])),
            "{c} reaches {seen:?}, rules prefer {allowed:?}"
        );
    }
}

#[test]
fn every_drum_plays_on_any_kit_with_one_of_its_anchors() {
    for &c in Canon::all() {
        if let Anchor::Any(anchors) = rules(c).anchor {
            let chain = c.fallback_chain();
            for a in anchors {
                assert!(
                    a == c || chain.contains(&a),
                    "{c} never reaches its anchor {a}"
                );
            }
        }
    }
}
