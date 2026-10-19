use midiremap_core::{Canon, Catalog, EngineMap, Mapping, MissingDrums, Note};
use rayon::prelude::*;

fn k(s: &str) -> Canon {
    s.parse().unwrap()
}

fn keys(base: &str, strokes: &[&str]) -> Vec<String> {
    strokes
        .iter()
        .map(|s| {
            if s.is_empty() {
                base.to_owned()
            } else {
                format!("{base}.{s}")
            }
        })
        .collect()
}

const CLOSED: [&str; 3] = ["tight", "closed", "cc"];

fn open_level(o: &str) -> Option<u8> {
    match o {
        "loose" => Some(0),
        _ => o.strip_prefix("open").and_then(|n| n.parse().ok()),
    }
}

fn openings_after(o: &str) -> Vec<String> {
    match o {
        "tight" => vec!["closed".into(), "cc".into()],
        "closed" => vec!["tight".into(), "cc".into()],
        "cc" => vec!["closed".into(), "tight".into()],
        "pedal" => vec![],
        "pedalsplash" => vec!["pedal".into()],
        _ => {
            let at = open_level(o).unwrap();
            let mut others: Vec<u8> = (0..=6).filter(|&l| l != at).collect();
            others.sort_by_key(|&l| (l.abs_diff(at), l));
            others
                .into_iter()
                .map(|l| {
                    if l == 0 {
                        "loose".to_owned()
                    } else {
                        format!("open{l}")
                    }
                })
                .collect()
        }
    }
}

fn zones_for(zone: &str, opening: &str) -> Vec<&'static str> {
    let sounds_open = open_level(opening).is_some() || opening == "pedalsplash";
    match zone {
        "" if sounds_open => vec!["", "edge", "tip"],
        "" => vec!["", "tip", "edge"],
        "tip" => vec!["tip", "", "edge"],
        "edge" => vec!["edge", "", "tip"],
        "bell" => vec!["bell", "edge", "tip", ""],
        other => panic!("zone {other}"),
    }
}

fn hat_allowed(drum: &str, opening: &str, zone: &str) -> Vec<String> {
    assert!(
        CLOSED.contains(&opening) || open_level(opening).is_some() || opening.starts_with("pedal")
    );
    let at = |o: &str| format!("{drum}.{o}");
    let mut out: Vec<String> = keys(&at(opening), &zones_for(zone, opening)[1..]);
    for o in openings_after(opening) {
        out.extend(keys(&at(&o), &zones_for(zone, &o)));
    }
    out
}

fn agreed(c: Canon) -> Vec<String> {
    let key = c.to_string();
    let parts: Vec<&str> = key.split('.').collect();
    match parts.as_slice() {
        ["kick", kind] => {
            let order: &[&str] = match *kind {
                "main" => &["alt", "left"],
                "alt" => &["main", "left"],
                _ => &["main", "alt"],
            };
            keys("kick", order)
        }
        [snare, stroke] if snare.starts_with("snare") => {
            let order: &[&str] = match *stroke {
                "hit" => &["side"],
                "side" | "rimshot" | "flam" | "off" => &["hit"],
                "rim" => &["sidestick"],
                "sidestick" => &["rim"],
                "ruff" => &["flam", "hit"],
                other => panic!("snare stroke {other}"),
            };
            keys(snare, order)
        }
        ["tom", pos, stroke] => keys(
            &format!("tom.{pos}"),
            if *stroke == "rimshot" { &["hit"] } else { &[] },
        ),
        ["ride", n] => keys(&format!("ride.{n}"), &["bowtip"]),
        ["ride", n, stroke] => {
            let order: &[&str] = match *stroke {
                "bowtip" => &[""],
                "bell" => &["belltip"],
                "belltip" => &["bell"],
                "mute" => &["", "bowtip"],
                "edge" => &[],
                other => panic!("ride stroke {other}"),
            };
            keys(&format!("ride.{n}"), order)
        }
        [kind @ ("crash" | "china" | "splash" | "stack" | "bell"), n, stroke] => {
            let order: &[&str] = match *stroke {
                "hit" => &["edge"],
                "edge" => &["hit"],
                "bow" => &["bowtip"],
                "bowtip" => &["bow"],
                "bell" => &["belltip"],
                "belltip" => &["bell"],
                "mute" => &["hit", "edge"],
                other => panic!("cymbal stroke {other}"),
            };
            keys(&format!("{kind}.{n}"), order)
        }
        [drum @ ("hat" | "aux1" | "aux2"), opening] => hat_allowed(drum, opening, ""),
        [drum @ ("hat" | "aux1" | "aux2"), opening, zone] => hat_allowed(drum, opening, zone),
        ["perc", _] => vec![],
        other => panic!("unknown slot {other:?}"),
    }
}

fn kind(c: Canon) -> String {
    let key = c.to_string();
    let (head, _) = key.split_once('.').expect("every drum key has a dot");
    head.trim_end_matches(char::is_numeric).to_owned()
}

fn may_cross(from: Canon, to: Canon) -> bool {
    let (a, b) = (kind(from), kind(to));
    let edge_ride = from.to_string().ends_with(".edge") && a == "ride";
    a == b
        || matches!(
            (a.as_str(), b.as_str()),
            ("china" | "splash" | "stack", "crash") | ("bell", "ride") | ("aux", "hat")
        )
        || (edge_ride && b == "crash")
}

#[test]
fn every_slot_stands_in_only_with_the_agreed_strokes_of_its_own_drum() {
    for &c in Canon::all() {
        let chain = c.fallback_chain();
        let own: Vec<String> = chain
            .iter()
            .take_while(|&&o| c.same_drum(o))
            .map(Canon::to_string)
            .collect();
        assert_eq!(own, agreed(c), "{c}");
        assert!(
            chain[own.len()..].iter().all(|&o| !c.same_drum(o)),
            "{c} comes back to its own drum: {chain:?}"
        );
    }
}

fn first_agreed(tgt: &EngineMap, canon: Canon) -> Option<Note> {
    agreed(canon).iter().find_map(|s| tgt.encode(k(s)))
}

/// A pair of engines and the drums the source plays that the target lacks.
struct Pair<'a> {
    src: &'a EngineMap,
    tgt: &'a EngineMap,
    missing: Vec<Canon>,
}

impl<'a> Pair<'a> {
    fn new(src: &'a EngineMap, tgt: &'a EngineMap) -> Self {
        let missing = Canon::all()
            .iter()
            .copied()
            .filter(|&c| src.encode(c).is_some() && tgt.encode(c).is_none())
            .collect();
        Self { src, tgt, missing }
    }

    fn failures(&self) -> impl Iterator<Item = String> + '_ {
        let Self { src, tgt, .. } = *self;
        let near = Mapping::new(src, tgt, &Default::default(), MissingDrums::Nearest);
        let drop = Mapping::new(src, tgt, &Default::default(), MissingDrums::Drop);
        self.missing.iter().flat_map(move |&canon| {
            let want = first_agreed(tgt, canon);
            let dropped = drop.resolve_canon(canon).note();
            let nearest = near.resolve_canon(canon).note();
            let pair = format!("{} -> {}: {canon}", src.id(), tgt.id());
            let drop_failure = (dropped != want)
                .then(|| format!("{pair} (drop) played {dropped:?}, agreed {want:?}"));
            let nearest_failure = match (want, nearest) {
                (Some(_), n) if n != want => {
                    Some(format!("{pair} (nearest) played {n:?}, agreed {want:?}"))
                }
                (None, Some(n)) => {
                    let landed = tgt.decode(n).unwrap();
                    (canon.same_drum(landed) || !may_cross(canon, landed))
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
    let catalog = Catalog::builtin().unwrap();
    let engines: Vec<&EngineMap> = catalog.engines().collect();
    let pairs: Vec<Pair> = engines
        .iter()
        .flat_map(|&src| engines.iter().map(move |&tgt| Pair::new(src, tgt)))
        .collect();
    let checked: usize = pairs.iter().map(|p| p.missing.len()).sum();
    let failures: Vec<String> = pairs.par_iter().flat_map_iter(Pair::failures).collect();
    assert!(checked > 10_000, "checked only {checked}");
    assert!(
        failures.is_empty(),
        "{} of {checked} break the agreed fallbacks, e.g.\n{}",
        failures.len(),
        failures
            .iter()
            .take(25)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}

#[test]
fn guitar_pro_closed_hat_plays_on_the_benny_greb_closed_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.closed"), Some(43));
}

#[test]
fn guitar_pro_first_open_hat_plays_on_the_benny_greb_first_open_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.open1"), Some(46));
}

#[test]
fn guitar_pro_second_open_hat_plays_on_the_benny_greb_second_open_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.open2"), Some(48));
}

#[test]
fn guitar_pro_pedal_hat_plays_on_the_benny_greb_pedal_hat() {
    let played = guitar_pro_to_benny_greb();
    assert_eq!(played("hat.pedal"), Some(53));
}

fn guitar_pro_to_benny_greb() -> impl Fn(&'static str) -> Option<u8> {
    let catalog = Catalog::builtin().unwrap();
    let mapping = Mapping::new(
        catalog.get("guitar_pro").unwrap(),
        catalog.get("ggd_bennygreb").unwrap(),
        &Default::default(),
        MissingDrums::Drop,
    );
    move |src| mapping.resolve_canon(k(src)).note().map(Note::get)
}
