use std::collections::HashSet;

use midiremap_core::{
    Canon, CanonResolution, Decoder, DefaultFallbacks, EngineMap, MapProvider, Note, Resolution,
    Translator,
};

use crate::{
    notes::{note_name, OctaveBase},
    SiteError,
};

pub const ORIGIN: &str = "https://drumverter.com";

pub const MAJOR_IDS: [&str; 8] = [
    "general_midi",
    "ggd_invasion",
    "ezdrummer",
    "superior_drummer3",
    "addictive_drums2",
    "ssd5",
    "bfd3",
    "guitar_pro",
];

pub const EXCLUDED_IDS: [&str; 1] = ["midiremap_standard"];

pub fn slug(id: &str) -> String {
    id.replace('_', "-")
}

fn pair_slug(src: &str, tgt: &str) -> String {
    format!("{}-to-{}", slug(src), slug(tgt))
}

pub struct EngineLink {
    pub id: String,
    pub slug: String,
    pub name: String,
}

impl EngineLink {
    fn of(map: &EngineMap) -> Self {
        Self {
            id: map.id.clone(),
            slug: slug(&map.id),
            name: map.display_name().to_string(),
        }
    }

    pub fn href(&self) -> String {
        format!("/engines/{}/", self.slug)
    }
}

pub struct PairLink {
    pub slug: String,
    pub src_name: String,
    pub tgt_name: String,
}

impl PairLink {
    fn of(src: &EngineMap, tgt: &EngineMap) -> Self {
        Self {
            slug: pair_slug(&src.id, &tgt.id),
            src_name: src.display_name().to_string(),
            tgt_name: tgt.display_name().to_string(),
        }
    }

    pub fn href(&self) -> String {
        format!("/convert/{}/", self.slug)
    }
}

pub struct EngineRow {
    pub note: u8,
    pub name_c1: String,
    pub name_c2: String,
    pub drum: String,
}

pub struct Target {
    pub note: u8,
    pub name_c1: String,
    pub name_c2: String,
    pub drum: String,
}

pub enum Outcome {
    Exact(Target),
    Approximated(Target),
    Dropped,
}

impl Outcome {
    pub fn label(&self) -> &'static str {
        match self {
            Outcome::Exact(_) => "exact",
            Outcome::Approximated(_) => "approximated",
            Outcome::Dropped => "dropped",
        }
    }

    pub fn target(&self) -> Option<&Target> {
        match self {
            Outcome::Exact(t) | Outcome::Approximated(t) => Some(t),
            Outcome::Dropped => None,
        }
    }
}

pub struct PairRow {
    pub note: u8,
    pub name_c1: String,
    pub name_c2: String,
    pub drum: String,
    pub outcome: Outcome,
}

pub struct EnginePage {
    pub engine: EngineLink,
    pub rows: Vec<EngineRow>,
    pub pair_links: Vec<PairLink>,
}

pub struct PairPage {
    pub slug: String,
    pub src: EngineLink,
    pub tgt: EngineLink,
    pub rows: Vec<PairRow>,
    pub exact: usize,
    pub approximated: usize,
    pub dropped: usize,
    pub reverse: PairLink,
    pub siblings: Vec<PairLink>,
}

pub struct MajorEntry {
    pub engine: EngineLink,
    pub pairs: Vec<PairLink>,
}

pub struct IndexPage {
    pub majors: Vec<MajorEntry>,
    pub all: Vec<EngineLink>,
}

pub struct Site {
    pub index: IndexPage,
    pub engines: Vec<EnginePage>,
    pub pairs: Vec<PairPage>,
}

fn lookup<'a>(provider: &'a dyn MapProvider, id: &str) -> Result<&'a EngineMap, SiteError> {
    provider
        .get(id)
        .ok_or_else(|| SiteError::UnknownEngine(id.to_string()))
}

fn target(tgt: &EngineMap, note: Note, fallback: Canon) -> Target {
    Target {
        note: note.get(),
        name_c1: note_name(note.get(), OctaveBase::C1),
        name_c2: note_name(note.get(), OctaveBase::C2),
        drum: tgt.decode(note).unwrap_or(fallback).label(),
    }
}

fn pair_rows(src: &EngineMap, tgt: &EngineMap) -> Vec<PairRow> {
    let translator = Translator::new(src, tgt, &DefaultFallbacks);
    src.source_notes()
        .into_iter()
        .map(|d| {
            let outcome = match translator.translate(d.note) {
                Resolution::Resolved(CanonResolution::Direct { note, .. }) => {
                    Outcome::Exact(target(tgt, note, d.canon))
                }
                Resolution::Resolved(CanonResolution::Fallback { note, .. }) => {
                    Outcome::Approximated(target(tgt, note, d.canon))
                }
                Resolution::Resolved(CanonResolution::Dropped { .. }) | Resolution::Unmapped => {
                    Outcome::Dropped
                }
            };
            PairRow {
                note: d.note.get(),
                name_c1: note_name(d.note.get(), OctaveBase::C1),
                name_c2: note_name(d.note.get(), OctaveBase::C2),
                drum: d.label,
                outcome,
            }
        })
        .collect()
}

fn pair_page(src: &EngineMap, tgt: &EngineMap, majors: &[&EngineMap]) -> PairPage {
    let rows = pair_rows(src, tgt);
    PairPage {
        slug: pair_slug(&src.id, &tgt.id),
        src: EngineLink::of(src),
        tgt: EngineLink::of(tgt),
        exact: rows
            .iter()
            .filter(|r| matches!(r.outcome, Outcome::Exact(_)))
            .count(),
        approximated: rows
            .iter()
            .filter(|r| matches!(r.outcome, Outcome::Approximated(_)))
            .count(),
        dropped: rows
            .iter()
            .filter(|r| matches!(r.outcome, Outcome::Dropped))
            .count(),
        rows,
        reverse: PairLink::of(tgt, src),
        siblings: majors
            .iter()
            .filter(|m| m.id != src.id && m.id != tgt.id)
            .map(|m| PairLink::of(src, m))
            .collect(),
    }
}

fn engine_page(map: &EngineMap, majors: &[&EngineMap]) -> EnginePage {
    let pair_links = if majors.iter().any(|m| m.id == map.id) {
        majors
            .iter()
            .filter(|m| m.id != map.id)
            .flat_map(|m| [PairLink::of(map, m), PairLink::of(m, map)])
            .collect()
    } else {
        Vec::new()
    };
    EnginePage {
        engine: EngineLink::of(map),
        rows: map
            .source_notes()
            .into_iter()
            .map(|d| EngineRow {
                note: d.note.get(),
                name_c1: note_name(d.note.get(), OctaveBase::C1),
                name_c2: note_name(d.note.get(), OctaveBase::C2),
                drum: d.label,
            })
            .collect(),
        pair_links,
    }
}

pub fn sort_by_name(maps: &mut [&EngineMap]) {
    maps.sort_by_cached_key(|m| (m.display_name().to_lowercase(), m.id.clone()));
}

impl Site {
    pub fn build(provider: &dyn MapProvider) -> Result<Site, SiteError> {
        let majors = MAJOR_IDS
            .iter()
            .map(|id| lookup(provider, id))
            .collect::<Result<Vec<_>, _>>()?;
        for id in EXCLUDED_IDS {
            lookup(provider, id)?;
        }
        let mut maps: Vec<&EngineMap> = provider
            .ids()
            .into_iter()
            .filter(|id| !EXCLUDED_IDS.contains(id))
            .map(|id| lookup(provider, id))
            .collect::<Result<_, _>>()?;
        sort_by_name(&mut maps);

        let mut seen = HashSet::new();
        for m in &maps {
            let s = slug(&m.id);
            if !seen.insert(s.clone()) {
                return Err(SiteError::SlugCollision(s));
            }
        }

        let engines = maps.iter().map(|m| engine_page(m, &majors)).collect();
        let pairs = majors
            .iter()
            .flat_map(|s| {
                majors
                    .iter()
                    .filter(move |t| t.id != s.id)
                    .map(move |t| (*s, *t))
            })
            .map(|(s, t)| pair_page(s, t, &majors))
            .collect();
        let index = IndexPage {
            majors: majors
                .iter()
                .map(|m| MajorEntry {
                    engine: EngineLink::of(m),
                    pairs: majors
                        .iter()
                        .filter(|t| t.id != m.id)
                        .map(|t| PairLink::of(m, t))
                        .collect(),
                })
                .collect(),
            all: maps.iter().map(|m| EngineLink::of(m)).collect(),
        };
        Ok(Site {
            index,
            engines,
            pairs,
        })
    }
}
#[cfg(test)]
mod tests {
    use std::collections::{HashMap, HashSet};

    use midiremap_core::{remap, BuiltinMaps, EngineMap};
    use midly::{
        num::{u15, u28, u4, u7},
        Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
    };

    use super::*;

    fn site() -> Site {
        Site::build(&BuiltinMaps::new()).unwrap()
    }

    #[test]
    fn one_page_per_engine_except_excluded() {
        let maps = BuiltinMaps::new();
        let s = site();
        assert_eq!(s.engines.len(), maps.ids().len() - EXCLUDED_IDS.len());
        assert!(s
            .engines
            .iter()
            .all(|p| !EXCLUDED_IDS.contains(&p.engine.id.as_str())));
        let slugs: HashSet<_> = s.engines.iter().map(|p| p.engine.slug.clone()).collect();
        assert_eq!(slugs.len(), s.engines.len());
        assert!(slugs.iter().all(|s| !s.contains('_')));
    }

    #[test]
    fn fifty_six_distinct_pairs() {
        let s = site();
        assert_eq!(s.pairs.len(), 56);
        assert!(s.pairs.iter().all(|p| p.src.id != p.tgt.id));
        let slugs: HashSet<_> = s.pairs.iter().map(|p| p.slug.clone()).collect();
        assert_eq!(slugs.len(), 56);
        assert_eq!(
            s.pairs
                .iter()
                .find(|p| p.slug == "ggd-invasion-to-ezdrummer")
                .map(|p| p.src.name.as_str()),
            Some("GetGood Drums Invasion")
        );
    }

    #[test]
    fn major_engine_pages_link_fourteen_pairs() {
        let s = site();
        let ezd = s
            .engines
            .iter()
            .find(|p| p.engine.id == "ezdrummer")
            .unwrap();
        assert_eq!(ezd.pair_links.len(), 14);
        let minor = s.engines.iter().find(|p| p.engine.id == "hertz").unwrap();
        assert!(minor.pair_links.is_empty());
    }

    #[test]
    fn counts_add_up_and_siblings_exclude_self() {
        for p in site().pairs {
            assert_eq!(p.exact + p.approximated + p.dropped, p.rows.len());
            assert_eq!(p.siblings.len(), 6);
            assert!(p.siblings.iter().all(|l| l.slug != p.slug));
        }
    }

    fn one_note(note: u8) -> Vec<u8> {
        let mut track = Track::new();
        for message in [
            MidiMessage::NoteOn {
                key: u7::from_int_lossy(note),
                vel: u7::from_int_lossy(100),
            },
            MidiMessage::NoteOff {
                key: u7::from_int_lossy(note),
                vel: u7::from_int_lossy(0),
            },
        ] {
            track.push(TrackEvent {
                delta: u28::from_int_lossy(10),
                kind: TrackEventKind::Midi {
                    channel: u4::from_int_lossy(9),
                    message,
                },
            });
        }
        let smf = Smf {
            header: Header {
                format: Format::SingleTrack,
                timing: Timing::Metrical(u15::from_int_lossy(480)),
            },
            tracks: vec![track],
        };
        let mut buf = Vec::new();
        smf.write_std(&mut buf).unwrap();
        buf
    }

    fn converted_note(bytes: &[u8]) -> Option<u8> {
        Smf::parse(bytes).unwrap().tracks[0]
            .iter()
            .find_map(|ev| match ev.kind {
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { key, vel },
                    ..
                } if vel.as_int() > 0 => Some(key.as_int()),
                _ => None,
            })
    }

    #[test]
    fn pair_rows_agree_with_the_converter() {
        let maps = BuiltinMaps::new();
        let by_id: HashMap<&str, &EngineMap> = maps
            .ids()
            .into_iter()
            .filter_map(|id| maps.get(id).map(|m| (id, m)))
            .collect();
        for p in site().pairs {
            let (src, tgt) = (by_id[p.src.id.as_str()], by_id[p.tgt.id.as_str()]);
            for row in &p.rows {
                let out = remap(&one_note(row.note), src, tgt).unwrap();
                assert_eq!(
                    converted_note(&out.bytes),
                    row.outcome.target().map(|t| t.note),
                    "{} note {}",
                    p.slug,
                    row.note
                );
            }
        }
    }

    #[test]
    fn engines_with_equal_names_sort_by_id() {
        let map = |id: &str| {
            midiremap_core::engine_map::from_json(&format!(
                r#"{{"id":"{id}","name":"Same","notes":[{{"note":36,"canon":"kick.main","primary":true}}]}}"#
            ))
            .unwrap()
        };
        let (b, a) = (map("b"), map("a"));
        let mut maps = vec![&b, &a];
        sort_by_name(&mut maps);
        assert_eq!(
            maps.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(),
            ["a", "b"]
        );
    }

    struct Only(HashMap<String, EngineMap>);

    impl MapProvider for Only {
        fn get(&self, id: &str) -> Option<&EngineMap> {
            self.0.get(id)
        }
        fn ids(&self) -> Vec<&str> {
            self.0.keys().map(String::as_str).collect()
        }
    }

    #[test]
    fn missing_major_engine_is_an_error() {
        let empty = Only(HashMap::new());
        assert!(
            matches!(Site::build(&empty), Err(SiteError::UnknownEngine(id)) if id == "general_midi")
        );
    }
}
