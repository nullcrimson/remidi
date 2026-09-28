use std::collections::{BTreeMap, HashSet};

use midiremap_core::{
    Canon, Catalog, EngineMap, Family, Mapping, MissingDrums, Note, OctaveBase, Overrides,
    PlanStatus, Resolution,
};

use crate::{
    content::{ContentPage, CONTENT},
    SiteError,
};

pub const ORIGIN: &str = "https://drumverter.com";

/// The popular engines that get pair pages, with their column label in the index matrix.
pub const MAJORS: [(&str, &str); 8] = [
    ("general_midi", "GM"),
    ("ggd_invasion", "Invasion"),
    ("ezdrummer", "EZD3"),
    ("superior_drummer3", "SD3"),
    ("addictive_drums2", "AD2"),
    ("ssd5", "SSD5"),
    ("bfd3", "BFD3"),
    ("guitar_pro", "GP"),
];

pub const EXCLUDED_IDS: [&str; 1] = ["midiremap_standard"];

/// The index group for engines whose vendor makes no other engine.
pub const MORE_ENGINES: &str = "More engines";

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
    pub vendor: String,
}

impl EngineLink {
    fn of(map: &EngineMap) -> Self {
        Self {
            id: map.id.clone(),
            slug: slug(&map.id),
            name: map.display_name().to_string(),
            vendor: map.vendor().unwrap_or(MORE_ENGINES).to_string(),
        }
    }

    pub fn href(&self) -> String {
        format!("/engines/{}/", self.slug)
    }

    /// Lower-case text the index filter matches against.
    pub fn search(&self) -> String {
        format!("{} {}", self.name, self.vendor).to_lowercase()
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

impl EngineRow {
    /// Lower-case text the engine page filter matches against.
    pub fn search(&self) -> String {
        format!(
            "{} {} {} {}",
            self.note, self.name_c1, self.name_c2, self.drum
        )
        .to_lowercase()
    }
}

pub struct FamilyGroup {
    pub name: &'static str,
    pub rows: Vec<EngineRow>,
}

pub struct Target {
    pub note: u8,
    pub name_c1: String,
    pub name_c2: String,
    pub drum: String,
}

pub struct PairRow {
    pub note: u8,
    pub name_c1: String,
    pub name_c2: String,
    pub drum: String,
    /// How the note converts, as the core decides it.
    pub status: PlanStatus,
    /// Where the note lands; `None` when it is dropped.
    pub target: Option<Target>,
}

impl PairRow {
    /// The word the page shows for the status.
    pub fn label(&self) -> &'static str {
        match self.status {
            PlanStatus::Direct => "exact",
            PlanStatus::Fallback => "approximated",
            PlanStatus::Dropped => "dropped",
        }
    }

    /// Sort key that lists changes first: dropped, then approximated, then exact.
    pub fn rank(&self) -> u8 {
        match self.status {
            PlanStatus::Dropped => 0,
            PlanStatus::Fallback => 1,
            PlanStatus::Direct => 2,
        }
    }
}

pub struct EnginePage {
    pub engine: EngineLink,
    pub total: usize,
    pub groups: Vec<FamilyGroup>,
    pub pairs_from: Vec<PairLink>,
    pub pairs_to: Vec<PairLink>,
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

impl PairPage {
    /// Rows whose drum does not land on its exact equivalent.
    pub fn changes(&self) -> usize {
        self.approximated + self.dropped
    }
}

pub struct MatrixRow {
    pub engine: EngineLink,
    pub cells: Vec<Option<PairLink>>,
}

pub struct VendorGroup {
    pub name: String,
    pub engines: Vec<EngineLink>,
}

pub struct IndexPage {
    pub columns: Vec<&'static str>,
    pub matrix: Vec<MatrixRow>,
    pub vendors: Vec<VendorGroup>,
    pub all: Vec<EngineLink>,
}

pub struct Site {
    pub index: IndexPage,
    pub engines: Vec<EnginePage>,
    pub pairs: Vec<PairPage>,
    pub content: Vec<ContentPage>,
}

fn lookup<'a>(provider: &'a Catalog, id: &str) -> Result<&'a EngineMap, SiteError> {
    provider
        .get(id)
        .ok_or_else(|| SiteError::UnknownEngine(id.to_string()))
}

fn target(tgt: &EngineMap, note: Note, fallback: Canon) -> Target {
    Target {
        note: note.get(),
        name_c1: note.name(OctaveBase::C1),
        name_c2: note.name(OctaveBase::C2),
        drum: tgt.decode(note).unwrap_or(fallback).label(),
    }
}

fn pair_rows(src: &EngineMap, tgt: &EngineMap) -> Vec<PairRow> {
    let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let mut rows: Vec<PairRow> = src
        .source_notes()
        .into_iter()
        .map(|d| {
            let (status, landed) = match mapping.translate(d.note) {
                Resolution::Resolved(r) => (PlanStatus::from(&r), r.note()),
                Resolution::Unmapped => (PlanStatus::Dropped, None),
            };
            PairRow {
                note: d.note.get(),
                name_c1: d.note.name(OctaveBase::C1),
                name_c2: d.note.name(OctaveBase::C2),
                drum: d.label,
                status,
                target: landed.map(|note| target(tgt, note, d.canon)),
            }
        })
        .collect();
    rows.sort_by_key(|r| (r.rank(), r.note));
    rows
}

fn pair_page(src: &EngineMap, tgt: &EngineMap, majors: &[&EngineMap]) -> PairPage {
    let rows = pair_rows(src, tgt);
    let count = |rank: u8| rows.iter().filter(|r| r.rank() == rank).count();
    PairPage {
        slug: pair_slug(&src.id, &tgt.id),
        src: EngineLink::of(src),
        tgt: EngineLink::of(tgt),
        dropped: count(0),
        approximated: count(1),
        exact: count(2),
        rows,
        reverse: PairLink::of(tgt, src),
        siblings: majors
            .iter()
            .filter(|m| m.id != src.id && m.id != tgt.id)
            .map(|m| PairLink::of(src, m))
            .collect(),
    }
}

fn family_groups(map: &EngineMap) -> Vec<FamilyGroup> {
    let notes = map.source_notes();
    let row = |d: &midiremap_core::engine_map::Drum| EngineRow {
        note: d.note.get(),
        name_c1: d.note.name(OctaveBase::C1),
        name_c2: d.note.name(OctaveBase::C2),
        drum: d.label.clone(),
    };
    Family::ALL
        .iter()
        .map(|&family| FamilyGroup {
            name: family.label(),
            rows: notes
                .iter()
                .filter(|d| d.family == family)
                .map(row)
                .collect(),
        })
        .filter(|g| !g.rows.is_empty())
        .collect()
}

fn engine_page(map: &EngineMap, majors: &[&EngineMap]) -> EnginePage {
    let others: Vec<&&EngineMap> = if majors.iter().any(|m| m.id == map.id) {
        majors.iter().filter(|m| m.id != map.id).collect()
    } else {
        Vec::new()
    };
    EnginePage {
        engine: EngineLink::of(map),
        total: map.source_notes().len(),
        groups: family_groups(map),
        pairs_from: others.iter().map(|m| PairLink::of(map, m)).collect(),
        pairs_to: others.iter().map(|m| PairLink::of(m, map)).collect(),
    }
}

pub fn sort_by_name(maps: &mut [&EngineMap]) {
    maps.sort_by_cached_key(|m| (m.display_name().to_lowercase(), m.id.clone()));
}

fn vendor_groups(maps: &[&EngineMap]) -> Vec<VendorGroup> {
    let mut by_vendor: BTreeMap<(String, String), Vec<EngineLink>> = BTreeMap::new();
    for m in maps {
        let link = EngineLink::of(m);
        by_vendor
            .entry((link.vendor.to_lowercase(), link.vendor.clone()))
            .or_default()
            .push(link);
    }
    let mut groups = Vec::new();
    let mut more = Vec::new();
    for ((_, name), engines) in by_vendor {
        if engines.len() >= 2 && name != MORE_ENGINES {
            groups.push(VendorGroup { name, engines });
        } else {
            more.extend(engines);
        }
    }
    more.sort_by_cached_key(|e| (e.name.to_lowercase(), e.id.clone()));
    groups.push(VendorGroup {
        name: MORE_ENGINES.to_string(),
        engines: more,
    });
    groups
}

impl Site {
    pub fn build(provider: &Catalog) -> Result<Site, SiteError> {
        let majors = MAJORS
            .iter()
            .map(|(id, _)| lookup(provider, id))
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
            columns: MAJORS.iter().map(|(_, abbr)| *abbr).collect(),
            matrix: majors
                .iter()
                .map(|s| MatrixRow {
                    engine: EngineLink::of(s),
                    cells: majors
                        .iter()
                        .map(|t| (t.id != s.id).then(|| PairLink::of(s, t)))
                        .collect(),
                })
                .collect(),
            vendors: vendor_groups(&maps),
            all: maps.iter().map(|m| EngineLink::of(m)).collect(),
        };
        Ok(Site {
            index,
            engines,
            pairs,
            content: CONTENT.pages(),
        })
    }
}
#[cfg(test)]
mod tests {
    use std::collections::{HashMap, HashSet};

    use midiremap_core::{convert, ChannelScope};
    use midly::{
        num::{u15, u28, u4, u7},
        Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
    };

    use super::*;

    fn site() -> Site {
        Site::build(&Catalog::builtin()).unwrap()
    }

    #[test]
    fn one_page_per_engine_except_excluded() {
        let maps = Catalog::builtin();
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
        assert_eq!(ezd.pairs_from.len(), 7);
        assert_eq!(ezd.pairs_to.len(), 7);
        assert!(ezd.pairs_from.iter().all(|l| l.src_name == "EZdrummer 3"));
        assert!(ezd.pairs_to.iter().all(|l| l.tgt_name == "EZdrummer 3"));
        let minor = s.engines.iter().find(|p| p.engine.id == "hertz").unwrap();
        assert!(minor.pairs_from.is_empty() && minor.pairs_to.is_empty());
    }

    #[test]
    fn pair_rows_put_changes_first() {
        for p in site().pairs {
            let keys: Vec<(u8, u8)> = p.rows.iter().map(|r| (r.rank(), r.note)).collect();
            let mut sorted = keys.clone();
            sorted.sort_unstable();
            assert_eq!(keys, sorted, "{}", p.slug);
            assert_eq!(p.changes(), p.approximated + p.dropped);
        }
    }

    #[test]
    fn engine_rows_are_grouped_by_family_in_app_order() {
        let maps = Catalog::builtin();
        for p in site().engines {
            let names: Vec<&str> = p.groups.iter().map(|g| g.name).collect();
            let order: Vec<&str> = Family::ALL
                .iter()
                .map(|f| f.label())
                .filter(|f| names.contains(f))
                .collect();
            assert_eq!(names, order, "{}", p.engine.id);
            assert!(p.groups.iter().all(|g| !g.rows.is_empty()));
            let total: usize = p.groups.iter().map(|g| g.rows.len()).sum();
            let map = maps.get(&p.engine.id).unwrap();
            assert_eq!(total, map.source_notes().len(), "{}", p.engine.id);
        }
    }

    #[test]
    fn index_matrix_links_every_major_pair_once() {
        let s = site();
        assert_eq!(s.index.columns.len(), 8);
        assert_eq!(s.index.matrix.len(), 8);
        let mut slugs = HashSet::new();
        for (i, row) in s.index.matrix.iter().enumerate() {
            assert_eq!(row.cells.len(), 8);
            assert!(row.cells[i].is_none());
            for cell in row.cells.iter().flatten() {
                assert_eq!(cell.src_name, row.engine.name);
                assert!(slugs.insert(cell.slug.clone()));
            }
        }
        assert_eq!(slugs.len(), 56);
    }

    #[test]
    fn vendor_groups_list_every_engine_once_with_singletons_last() {
        let s = site();
        let listed: Vec<&str> = s
            .index
            .vendors
            .iter()
            .flat_map(|g| g.engines.iter().map(|e| e.id.as_str()))
            .collect();
        assert_eq!(listed.len(), s.index.all.len());
        assert_eq!(listed.iter().collect::<HashSet<_>>().len(), listed.len());
        let (last, named) = s.index.vendors.split_last().unwrap();
        assert_eq!(last.name, MORE_ENGINES);
        assert!(named
            .iter()
            .all(|g| g.engines.len() >= 2 && g.name != MORE_ENGINES));
        let toontrack = named.iter().find(|g| g.name == "Toontrack").unwrap();
        assert_eq!(toontrack.engines.len(), 3);
        let vendors: Vec<String> = named.iter().map(|g| g.name.to_lowercase()).collect();
        let mut sorted = vendors.clone();
        sorted.sort();
        assert_eq!(vendors, sorted);
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
        let maps = Catalog::builtin();
        let by_id: HashMap<&str, &EngineMap> = maps
            .ids()
            .into_iter()
            .filter_map(|id| maps.get(id).map(|m| (id, m)))
            .collect();
        for p in site().pairs {
            let (src, tgt) = (by_id[p.src.id.as_str()], by_id[p.tgt.id.as_str()]);
            for row in &p.rows {
                let out = convert(
                    &one_note(row.note),
                    &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
                    ChannelScope::Auto,
                )
                .unwrap();
                assert_eq!(
                    converted_note(&out.bytes),
                    row.target.as_ref().map(|t| t.note),
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

    #[test]
    fn missing_major_engine_is_an_error() {
        let empty = Catalog::from_maps([]);
        assert!(
            matches!(Site::build(&empty), Err(SiteError::UnknownEngine(id)) if id == "general_midi")
        );
    }
}
