use std::collections::{BTreeMap, HashSet};

use midiremap_core::{
    Canon, CanonResolution, Catalog, Drum, EngineMap, Family, Mapping, MissingDrums, Note,
    OctaveBase, Overrides,
};

use crate::routes::{engine_href, pair_href, SitePath};

/// What stops the site's pages from being planned.
#[derive(thiserror::Error, Debug)]
pub enum BuildError {
    #[error("unknown engine id: {0}")]
    UnknownEngine(String),
    #[error("slug collision: {0}")]
    SlugCollision(String),
}

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

fn slug(id: &str) -> String {
    id.replace('_', "-")
}

fn pair_slug(src: &str, tgt: &str) -> String {
    format!("{}-to-{}", slug(src), slug(tgt))
}

pub struct EngineLink {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub vendor: Option<String>,
}

impl EngineLink {
    fn of(map: &EngineMap) -> Self {
        Self {
            id: map.id().to_owned(),
            slug: slug(map.id()),
            name: map.display_name().to_string(),
            vendor: map.vendor().map(str::to_owned),
        }
    }

    pub fn href(&self) -> SitePath {
        engine_href(&self.slug)
    }

    /// Lower-case text the index filter matches against.
    pub fn search(&self) -> String {
        match &self.vendor {
            Some(vendor) => format!("{} {vendor}", self.name),
            None => self.name.clone(),
        }
        .to_lowercase()
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
            slug: pair_slug(src.id(), tgt.id()),
            src_name: src.display_name().to_string(),
            tgt_name: tgt.display_name().to_string(),
        }
    }

    pub fn href(&self) -> SitePath {
        pair_href(&self.slug)
    }
}

/// A drum on a note, as a table cell shows it.
pub struct NoteCell {
    pub note: Note,
    pub drum: String,
}

impl NoteCell {
    pub fn name_c1(&self) -> String {
        self.note.name(OctaveBase::C1)
    }

    pub fn name_c2(&self) -> String {
        self.note.name(OctaveBase::C2)
    }

    /// Lower-case text the engine page filter matches against.
    pub fn search(&self) -> String {
        format!(
            "{} {} {} {}",
            self.note,
            self.name_c1(),
            self.name_c2(),
            self.drum
        )
        .to_lowercase()
    }
}

pub struct FamilyGroup {
    pub name: &'static str,
    pub rows: Vec<NoteCell>,
}

/// Where a source note lands on the target, as the core decides it.
pub enum Landing {
    Exact(NoteCell),
    Approximated(NoteCell),
    Dropped,
}

impl Landing {
    /// The word the page shows for the outcome.
    pub fn label(&self) -> &'static str {
        match self {
            Landing::Exact(_) => "exact",
            Landing::Approximated(_) => "approximated",
            Landing::Dropped => "dropped",
        }
    }

    /// Where the note lands; `None` when it is dropped.
    pub fn target(&self) -> Option<&NoteCell> {
        match self {
            Landing::Exact(cell) | Landing::Approximated(cell) => Some(cell),
            Landing::Dropped => None,
        }
    }
}

pub struct PairRow {
    pub source: NoteCell,
    pub landing: Landing,
}

impl PairRow {
    fn rank(&self) -> u8 {
        match self.landing {
            Landing::Dropped => 0,
            Landing::Approximated(_) => 1,
            Landing::Exact(_) => 2,
        }
    }
}

/// How many of a pair's notes land exactly, approximately, or nowhere.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Tally {
    pub exact: usize,
    pub approximated: usize,
    pub dropped: usize,
}

impl Tally {
    fn of(rows: &[PairRow]) -> Self {
        rows.iter().fold(Self::default(), |mut tally, row| {
            match row.landing {
                Landing::Exact(_) => tally.exact += 1,
                Landing::Approximated(_) => tally.approximated += 1,
                Landing::Dropped => tally.dropped += 1,
            }
            tally
        })
    }

    /// All the pair's notes.
    pub fn total(&self) -> usize {
        self.exact + self.approximated + self.dropped
    }

    /// Notes that do not land on their exact equivalent.
    pub fn changes(&self) -> usize {
        self.approximated + self.dropped
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
    pub tally: Tally,
    pub reverse: PairLink,
    pub siblings: Vec<PairLink>,
}

impl PairPage {
    pub fn href(&self) -> SitePath {
        pair_href(&self.slug)
    }
}

pub struct MatrixRow {
    pub engine: EngineLink,
    pub cells: Vec<Option<PairLink>>,
}

/// Engines of a vendor that makes at least two of them.
pub struct VendorGroup {
    pub name: String,
    pub engines: Vec<EngineLink>,
}

pub struct IndexPage {
    pub columns: Vec<&'static str>,
    pub matrix: Vec<MatrixRow>,
    pub vendors: Vec<VendorGroup>,
    /// The engines without a vendor group: no vendor, or a vendor that makes no other engine.
    pub more: Vec<EngineLink>,
    pub all: Vec<EngineLink>,
}

pub struct Site {
    pub index: IndexPage,
    pub engines: Vec<EnginePage>,
    pub pairs: Vec<PairPage>,
}

fn lookup<'a>(catalog: &'a Catalog, id: &str) -> Result<&'a EngineMap, BuildError> {
    catalog
        .get(id)
        .ok_or_else(|| BuildError::UnknownEngine(id.to_string()))
}

fn landing(resolution: CanonResolution) -> Landing {
    let cell = |drum: Canon, note| NoteCell {
        note,
        drum: drum.label(),
    };
    match resolution {
        CanonResolution::Direct { canon, note } => Landing::Exact(cell(canon, note)),
        CanonResolution::Fallback { stand_in, note, .. } => {
            Landing::Approximated(cell(stand_in, note))
        }
        CanonResolution::Dropped { .. } => Landing::Dropped,
    }
}

fn pair_rows(src: &EngineMap, tgt: &EngineMap) -> Vec<PairRow> {
    let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let mut rows: Vec<PairRow> = src
        .source_notes()
        .into_iter()
        .map(|d| PairRow {
            landing: landing(mapping.resolve_canon(d.canon)),
            source: NoteCell {
                note: d.note,
                drum: d.label,
            },
        })
        .collect();
    rows.sort_by_key(|r| (r.rank(), r.source.note));
    rows
}

fn pair_page(src: &EngineMap, tgt: &EngineMap, majors: &[&EngineMap]) -> PairPage {
    let rows = pair_rows(src, tgt);
    PairPage {
        slug: pair_slug(src.id(), tgt.id()),
        src: EngineLink::of(src),
        tgt: EngineLink::of(tgt),
        tally: Tally::of(&rows),
        rows,
        reverse: PairLink::of(tgt, src),
        siblings: majors
            .iter()
            .filter(|m| m.id() != src.id() && m.id() != tgt.id())
            .map(|m| PairLink::of(src, m))
            .collect(),
    }
}

fn family_groups(map: &EngineMap) -> Vec<FamilyGroup> {
    let notes = map.source_notes();
    let row = |d: &Drum| NoteCell {
        note: d.note,
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
    let others: Vec<&&EngineMap> = if majors.iter().any(|m| m.id() == map.id()) {
        majors.iter().filter(|m| m.id() != map.id()).collect()
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

fn sort_by_name(maps: &mut [&EngineMap]) {
    maps.sort_by_cached_key(|m| (m.display_name().to_lowercase(), m.id().to_owned()));
}

fn vendor_groups(maps: &[&EngineMap]) -> (Vec<VendorGroup>, Vec<EngineLink>) {
    let mut by_vendor: BTreeMap<(String, String), Vec<EngineLink>> = BTreeMap::new();
    let mut more = Vec::new();
    for m in maps {
        let link = EngineLink::of(m);
        match link.vendor.clone() {
            Some(vendor) => by_vendor
                .entry((vendor.to_lowercase(), vendor))
                .or_default()
                .push(link),
            None => more.push(link),
        }
    }
    let mut groups = Vec::new();
    for ((_, name), engines) in by_vendor {
        if engines.len() >= 2 {
            groups.push(VendorGroup { name, engines });
        } else {
            more.extend(engines);
        }
    }
    more.sort_by_cached_key(|e| (e.name.to_lowercase(), e.id.clone()));
    (groups, more)
}

impl Site {
    pub fn build(catalog: &Catalog) -> Result<Site, BuildError> {
        let majors = MAJORS
            .iter()
            .map(|(id, _)| lookup(catalog, id))
            .collect::<Result<Vec<_>, _>>()?;
        for id in EXCLUDED_IDS {
            lookup(catalog, id)?;
        }
        let mut maps: Vec<&EngineMap> = catalog
            .engines()
            .filter(|m| !EXCLUDED_IDS.contains(&m.id()))
            .collect();
        sort_by_name(&mut maps);

        let mut seen = HashSet::new();
        for m in &maps {
            let s = slug(m.id());
            if !seen.insert(s.clone()) {
                return Err(BuildError::SlugCollision(s));
            }
        }

        let engines = maps.iter().map(|m| engine_page(m, &majors)).collect();
        let pairs = majors
            .iter()
            .flat_map(|s| {
                majors
                    .iter()
                    .filter(move |t| t.id() != s.id())
                    .map(move |t| (*s, *t))
            })
            .map(|(s, t)| pair_page(s, t, &majors))
            .collect();
        let (vendors, more) = vendor_groups(&maps);
        let index = IndexPage {
            columns: MAJORS.iter().map(|(_, abbr)| *abbr).collect(),
            matrix: majors
                .iter()
                .map(|s| MatrixRow {
                    engine: EngineLink::of(s),
                    cells: majors
                        .iter()
                        .map(|t| (t.id() != s.id()).then(|| PairLink::of(s, t)))
                        .collect(),
                })
                .collect(),
            vendors,
            more,
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

    use midiremap_core::{convert, ChannelScope};
    use midiremap_testkit::{drums, hit_keys, off, on};

    use super::*;

    fn site() -> Site {
        Site::build(&Catalog::builtin().unwrap()).unwrap()
    }

    #[test]
    fn one_page_per_engine_except_excluded() {
        let maps = Catalog::builtin().unwrap();
        let s = site();
        assert_eq!(s.engines.len(), maps.ids().count() - EXCLUDED_IDS.len());
    }

    #[test]
    fn no_excluded_engine_gets_a_page() {
        let s = site();
        assert!(s
            .engines
            .iter()
            .all(|p| !EXCLUDED_IDS.contains(&p.engine.id.as_str())));
    }

    #[test]
    fn engine_page_slugs_are_distinct() {
        let s = site();
        let slugs: HashSet<_> = s.engines.iter().map(|p| p.engine.slug.clone()).collect();
        assert_eq!(slugs.len(), s.engines.len());
    }

    #[test]
    fn engine_page_slugs_have_no_underscore() {
        let s = site();
        let slugs: HashSet<_> = s.engines.iter().map(|p| p.engine.slug.clone()).collect();
        assert!(slugs.iter().all(|s| !s.contains('_')));
    }

    #[test]
    fn fifty_six_pairs() {
        let s = site();
        assert_eq!(s.pairs.len(), 56);
    }

    #[test]
    fn no_pair_converts_an_engine_to_itself() {
        let s = site();
        assert!(s.pairs.iter().all(|p| p.src.id != p.tgt.id));
    }

    #[test]
    fn pair_slugs_are_distinct() {
        let s = site();
        let slugs: HashSet<_> = s.pairs.iter().map(|p| p.slug.clone()).collect();
        assert_eq!(slugs.len(), 56);
    }

    #[test]
    fn a_pair_names_its_source_engine_by_display_name() {
        let s = site();
        assert_eq!(
            s.pairs
                .iter()
                .find(|p| p.slug == "ggd-invasion-to-ezdrummer")
                .map(|p| p.src.name.as_str()),
            Some("GetGood Drums Invasion")
        );
    }

    #[test]
    fn major_engine_pages_link_seven_pairs_from_the_engine() {
        let s = site();
        let ezd = s
            .engines
            .iter()
            .find(|p| p.engine.id == "ezdrummer")
            .unwrap();
        assert_eq!(ezd.pairs_from.len(), 7);
        assert!(ezd.pairs_from.iter().all(|l| l.src_name == "EZdrummer 3"));
    }

    #[test]
    fn major_engine_pages_link_seven_pairs_to_the_engine() {
        let s = site();
        let ezd = s
            .engines
            .iter()
            .find(|p| p.engine.id == "ezdrummer")
            .unwrap();
        assert_eq!(ezd.pairs_to.len(), 7);
        assert!(ezd.pairs_to.iter().all(|l| l.tgt_name == "EZdrummer 3"));
    }

    #[test]
    fn minor_engine_pages_link_no_pairs() {
        let s = site();
        let minor = s.engines.iter().find(|p| p.engine.id == "hertz").unwrap();
        assert!(minor.pairs_from.is_empty() && minor.pairs_to.is_empty());
    }

    #[test]
    fn pair_rows_put_changes_first() {
        for p in site().pairs {
            let keys: Vec<(u8, u8)> = p
                .rows
                .iter()
                .map(|r| (r.rank(), r.source.note.get()))
                .collect();
            let mut sorted = keys.clone();
            sorted.sort_unstable();
            assert_eq!(keys, sorted, "{}", p.slug);
        }
    }

    #[test]
    fn engine_rows_are_grouped_by_family_in_app_order() {
        for p in site().engines {
            let names: Vec<&str> = p.groups.iter().map(|g| g.name).collect();
            let order: Vec<&str> = Family::ALL
                .iter()
                .map(|f| f.label())
                .filter(|f| names.contains(f))
                .collect();
            assert_eq!(names, order, "{}", p.engine.id);
        }
    }

    #[test]
    fn engine_page_groups_are_never_empty() {
        for p in site().engines {
            assert!(p.groups.iter().all(|g| !g.rows.is_empty()));
        }
    }

    #[test]
    fn engine_page_rows_cover_every_source_note() {
        let maps = Catalog::builtin().unwrap();
        for p in site().engines {
            let total: usize = p.groups.iter().map(|g| g.rows.len()).sum();
            let map = maps.get(&p.engine.id).unwrap();
            assert_eq!(total, map.source_notes().len(), "{}", p.engine.id);
        }
    }

    #[test]
    fn index_matrix_has_eight_columns() {
        let s = site();
        assert_eq!(s.index.columns.len(), 8);
    }

    #[test]
    fn index_matrix_has_eight_rows() {
        let s = site();
        assert_eq!(s.index.matrix.len(), 8);
    }

    #[test]
    fn index_matrix_rows_have_eight_cells() {
        let s = site();
        for row in s.index.matrix.iter() {
            assert_eq!(row.cells.len(), 8);
        }
    }

    #[test]
    fn index_matrix_leaves_its_diagonal_empty() {
        let s = site();
        for (i, row) in s.index.matrix.iter().enumerate() {
            assert!(row.cells[i].is_none());
        }
    }

    #[test]
    fn index_matrix_cells_carry_their_rows_source_name() {
        let s = site();
        for row in s.index.matrix.iter() {
            for cell in row.cells.iter().flatten() {
                assert_eq!(cell.src_name, row.engine.name);
            }
        }
    }

    #[test]
    fn index_matrix_links_no_pair_twice() {
        let s = site();
        let mut slugs = HashSet::new();
        for row in s.index.matrix.iter() {
            for cell in row.cells.iter().flatten() {
                assert!(slugs.insert(cell.slug.clone()));
            }
        }
    }

    #[test]
    fn index_matrix_links_every_major_pair() {
        let s = site();
        let mut slugs = HashSet::new();
        for row in s.index.matrix.iter() {
            for cell in row.cells.iter().flatten() {
                slugs.insert(cell.slug.clone());
            }
        }
        assert_eq!(slugs.len(), 56);
    }

    fn listed_engines(s: &Site) -> Vec<&str> {
        s.index
            .vendors
            .iter()
            .flat_map(|g| g.engines.iter())
            .chain(&s.index.more)
            .map(|e| e.id.as_str())
            .collect()
    }

    #[test]
    fn vendor_groups_and_more_list_every_engine() {
        let s = site();
        let listed: HashSet<&str> = listed_engines(&s).into_iter().collect();
        let all: HashSet<&str> = s.index.all.iter().map(|e| e.id.as_str()).collect();
        assert_eq!(listed, all);
    }

    #[test]
    fn vendor_groups_and_more_list_no_engine_twice() {
        let s = site();
        let listed = listed_engines(&s);
        assert_eq!(listed.iter().collect::<HashSet<_>>().len(), listed.len());
    }

    #[test]
    fn every_vendor_group_has_two_or_more_engines() {
        assert!(site().index.vendors.iter().all(|g| g.engines.len() >= 2));
    }

    #[test]
    fn more_holds_no_engine_of_a_grouped_vendor() {
        let s = site();
        assert!(s
            .index
            .more
            .iter()
            .all(|e| e.vendor.as_ref().is_none_or(|v| s
                .index
                .vendors
                .iter()
                .all(|g| &g.name != v))));
    }

    #[test]
    fn toontrack_is_a_vendor_group_of_three_engines() {
        let s = site();
        let toontrack = s
            .index
            .vendors
            .iter()
            .find(|g| g.name == "Toontrack")
            .unwrap();
        assert_eq!(toontrack.engines.len(), 3);
    }

    #[test]
    fn vendor_groups_are_sorted_by_vendor_name() {
        let vendors: Vec<String> = site()
            .index
            .vendors
            .iter()
            .map(|g| g.name.to_lowercase())
            .collect();
        let mut sorted = vendors.clone();
        sorted.sort();
        assert_eq!(vendors, sorted);
    }

    fn cell(note: u8) -> NoteCell {
        NoteCell {
            note: Note::new(note).unwrap(),
            drum: String::new(),
        }
    }

    #[test]
    fn a_tally_counts_each_landing_in_its_own_field() {
        let rows = [
            Landing::Exact(cell(36)),
            Landing::Approximated(cell(38)),
            Landing::Dropped,
            Landing::Dropped,
        ]
        .map(|landing| PairRow {
            source: cell(40),
            landing,
        });
        assert_eq!(
            Tally::of(&rows),
            Tally {
                exact: 1,
                approximated: 1,
                dropped: 2
            }
        );
    }

    #[test]
    fn a_tallys_total_is_the_sum_of_its_counts() {
        let tally = Tally {
            exact: 1,
            approximated: 2,
            dropped: 4,
        };
        assert_eq!(tally.total(), 7);
    }

    #[test]
    fn a_pair_lists_six_siblings() {
        for p in site().pairs {
            assert_eq!(p.siblings.len(), 6);
        }
    }

    #[test]
    fn siblings_exclude_the_pair_itself() {
        for p in site().pairs {
            assert!(p.siblings.iter().all(|l| l.slug != p.slug));
        }
    }

    #[test]
    fn pair_rows_agree_with_the_converter() {
        let maps = Catalog::builtin().unwrap();
        let by_id: HashMap<&str, &EngineMap> = maps.engines().map(|m| (m.id(), m)).collect();
        for p in site().pairs {
            let (src, tgt) = (by_id[p.src.id.as_str()], by_id[p.tgt.id.as_str()]);
            for row in &p.rows {
                let out = convert(
                    &drums(&[
                        (10, on(row.source.note.get())),
                        (10, off(row.source.note.get())),
                    ]),
                    &Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
                    ChannelScope::Auto,
                )
                .unwrap();
                assert_eq!(
                    hit_keys(&out.bytes).first().copied(),
                    row.landing.target().map(|t| t.note.get()),
                    "{} note {}",
                    p.slug,
                    row.source.note.get()
                );
            }
        }
    }

    #[test]
    fn engines_with_equal_names_sort_by_id() {
        let map = |id: &str| {
            EngineMap::from_json(&format!(
                r#"{{"id":"{id}","name":"Same","notes":[{{"note":36,"canon":"kick.main","primary":true}}]}}"#
            ))
            .unwrap()
        };
        let (b, a) = (map("b"), map("a"));
        let mut maps = vec![&b, &a];
        sort_by_name(&mut maps);
        assert_eq!(maps.iter().map(|m| m.id()).collect::<Vec<_>>(), ["a", "b"]);
    }

    #[test]
    fn missing_major_engine_is_an_error() {
        let empty = Catalog::from_maps([]).unwrap();
        assert!(
            matches!(Site::build(&empty), Err(BuildError::UnknownEngine(id)) if id == "general_midi")
        );
    }
}
