use midiremap_core::{Canon, Catalog, EngineMap, Mapping, MissingDrums, Note};

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

#[test]
fn every_builtin_pair_plays_the_agreed_stand_in_or_drops() {
    let catalog = Catalog::builtin().unwrap();
    let engines: Vec<&EngineMap> = catalog.engines().collect();
    let mut checked = 0u32;
    let mut failures = Vec::new();
    for src in &engines {
        let sources: Vec<Canon> = Canon::all()
            .iter()
            .copied()
            .filter(|&c| src.encode(c).is_some())
            .collect();
        for tgt in &engines {
            let near = Mapping::new(src, tgt, &Default::default(), MissingDrums::Nearest);
            let drop = Mapping::new(src, tgt, &Default::default(), MissingDrums::Drop);
            for &canon in &sources {
                if tgt.encode(canon).is_some() {
                    continue;
                }
                checked += 1;
                let want = first_agreed(tgt, canon);
                let dropped = drop.resolve_canon(canon).note();
                let nearest = near.resolve_canon(canon).note();
                let pair = format!("{} -> {}: {canon}", src.id(), tgt.id());
                if dropped != want {
                    failures.push(format!("{pair} (drop) played {dropped:?}, agreed {want:?}"));
                }
                match (want, nearest) {
                    (Some(_), n) if n != want => {
                        failures.push(format!("{pair} (nearest) played {n:?}, agreed {want:?}"))
                    }
                    (None, Some(n)) => {
                        let landed = tgt.decode(n).unwrap();
                        if canon.same_drum(landed) || !may_cross(canon, landed) {
                            failures.push(format!("{pair} (nearest) crossed to {landed}"));
                        }
                    }
                    _ => {}
                }
            }
        }
    }
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
fn guitar_pro_hats_play_on_benny_greb_hats_of_the_same_opening() {
    let catalog = Catalog::builtin().unwrap();
    let mapping = Mapping::new(
        catalog.get("guitar_pro").unwrap(),
        catalog.get("ggd_bennygreb").unwrap(),
        &Default::default(),
        MissingDrums::Drop,
    );
    let played = |src| mapping.resolve_canon(k(src)).note().map(Note::get);
    assert_eq!(played("hat.closed"), Some(43));
    assert_eq!(played("hat.open1"), Some(46));
    assert_eq!(played("hat.open2"), Some(48));
    assert_eq!(played("hat.pedal"), Some(53));
}
