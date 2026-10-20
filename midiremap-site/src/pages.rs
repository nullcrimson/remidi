use std::{
    cmp::Reverse,
    collections::{BTreeMap, HashSet},
};

use midiremap_core::{
    Canon, CanonResolution, Catalog, Daw, Drum, EngineMap, Family, Mapping, MissingDrums, Note,
    OctaveBase, Overrides,
};

use crate::routes::{drum_map_href, engine_href, pair_href, SitePath, POPULAR, SITE_NAME};

/// What stops the site's pages from being planned.
#[derive(thiserror::Error, Debug)]
pub enum BuildError {
    #[error("unknown engine id: {0}")]
    UnknownEngine(String),
    #[error("slug collision: {0}")]
    SlugCollision(String),
    #[error("popular conversion without a pair page: {0}")]
    NoPairPage(String),
    #[error("unknown drum key: {0}")]
    UnknownCanon(String),
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

/// The engines every other engine gets a pair page to.
pub const TARGETS: [&str; 5] = [
    "ezdrummer",
    "superior_drummer3",
    "general_midi",
    "ggd_invasion",
    "guitar_pro",
];

pub const EXCLUDED_IDS: [&str; 1] = ["midiremap_standard"];

/// The drums an engine page shows first, in kit order: the ones a groove uses most.
const CORE_DRUMS: [&str; 16] = [
    "kick.main",
    "snare1.hit",
    "snare1.sidestick",
    "snare1.rimshot",
    "hat.closed",
    "hat.pedal",
    "hat.open1",
    "tom.rack1.hit",
    "tom.rack2.hit",
    "tom.rack3.hit",
    "tom.floor1.hit",
    "tom.floor2.hit",
    "crash.1.hit",
    "crash.2.hit",
    "ride.1",
    "ride.1.bell",
];

fn core_drums() -> Result<Vec<Canon>, BuildError> {
    CORE_DRUMS
        .iter()
        .map(|key| {
            key.parse()
                .map_err(|_| BuildError::UnknownCanon((*key).to_owned()))
        })
        .collect()
}

/// A conversion with its own pair page: source, then target.
type Route<'a> = (&'a EngineMap, &'a EngineMap);

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

    /// The engine's DAW drum maps, one per DAW.
    pub fn drum_maps(&self) -> Vec<DrumMapLink> {
        Daw::ALL
            .iter()
            .map(|&daw| DrumMapLink {
                daw,
                href: drum_map_href(&self.slug, daw),
                file_name: format!(
                    "{} ({SITE_NAME}).{}",
                    safe_file_name(&self.name),
                    daw.extension()
                ),
            })
            .collect()
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

/// A download of one engine's drum map for one DAW.
pub struct DrumMapLink {
    pub daw: Daw,
    pub href: SitePath,
    /// The name the browser saves the file under.
    pub file_name: String,
}

fn safe_file_name(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            c if c.is_control() => '-',
            c => c,
        })
        .collect()
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
#[derive(Clone)]
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

/// Rows of one drum family, a table of its own on the page.
pub struct FamilyGroup<R> {
    pub family: Family,
    pub rows: Vec<R>,
}

impl<R> FamilyGroup<R> {
    /// The id of the group's table, which the page's jump links name.
    pub fn anchor(&self) -> String {
        format!("g-{}", self.family.label().to_lowercase())
    }
}

/// Rows grouped by family, in `Family::ALL` order, with no empty group; rows keep their order.
fn by_family<R>(rows: impl IntoIterator<Item = (Family, R)>) -> Vec<FamilyGroup<R>> {
    let mut groups: Vec<FamilyGroup<R>> = Family::ALL
        .iter()
        .map(|&family| FamilyGroup {
            family,
            rows: Vec::new(),
        })
        .collect();
    for (family, row) in rows {
        if let Some(group) = groups.iter_mut().find(|g| g.family == family) {
            group.rows.push(row);
        }
    }
    groups.retain(|g| !g.rows.is_empty());
    groups
}

/// Whether a note is the one the engine plays its drum on, or another note for the same drum.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NoteRole {
    Main,
    Extra,
}

/// A row of an engine page's note table.
pub struct EngineRow {
    pub cell: NoteCell,
    pub role: NoteRole,
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

impl FamilyGroup<PairRow> {
    /// Whether every note of the group lands on its exact equivalent.
    pub fn all_exact(&self) -> bool {
        self.rows
            .iter()
            .all(|r| matches!(r.landing, Landing::Exact(_)))
    }
}

/// A target drum that plays source drums it has no exact equivalent for.
pub struct Merge {
    pub target: NoteCell,
    /// The source drums it plays, each once.
    pub sources: Vec<String>,
}

/// What a conversion does to the drums that do not land on their exact equivalent.
pub struct Changes {
    /// The approximated drums by the target note that plays them, the busiest note first.
    pub merges: Vec<Merge>,
    /// The source drums the target has no drum for, each once.
    pub dropped: Vec<String>,
}

fn push_new(list: &mut Vec<String>, drum: &str) {
    if !list.iter().any(|d| d == drum) {
        list.push(drum.to_owned());
    }
}

impl Changes {
    fn of<'a>(rows: impl IntoIterator<Item = &'a PairRow>) -> Self {
        let mut merges: Vec<Merge> = Vec::new();
        let mut dropped = Vec::new();
        for row in rows {
            match &row.landing {
                Landing::Approximated(target) => {
                    match merges.iter_mut().find(|m| m.target.note == target.note) {
                        Some(merge) => push_new(&mut merge.sources, &row.source.drum),
                        None => merges.push(Merge {
                            target: target.clone(),
                            sources: vec![row.source.drum.clone()],
                        }),
                    }
                }
                Landing::Dropped => push_new(&mut dropped, &row.source.drum),
                Landing::Exact(_) => {}
            }
        }
        merges.sort_by_key(|m| (Reverse(m.sources.len()), m.target.note));
        Self { merges, dropped }
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
    fn of<'a>(rows: impl IntoIterator<Item = &'a PairRow>) -> Self {
        rows.into_iter().fold(Self::default(), |mut tally, row| {
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
    /// The notes of the drums a groove uses most, as the converter writes them.
    pub core: Vec<NoteCell>,
    pub groups: Vec<FamilyGroup<EngineRow>>,
    pub pairs_from: Vec<PairLink>,
    pub pairs_to: Vec<PairLink>,
}

impl EnginePage {
    /// Whether any note plays a drum that already has its main note.
    pub fn has_extra(&self) -> bool {
        self.groups
            .iter()
            .flat_map(|g| &g.rows)
            .any(|r| r.role == NoteRole::Extra)
    }
}

pub struct PairPage {
    pub slug: String,
    pub src: EngineLink,
    pub tgt: EngineLink,
    /// The source notes by the family of their drum, each family in note order.
    pub groups: Vec<FamilyGroup<PairRow>>,
    pub changes: Changes,
    pub tally: Tally,
    /// The page for the other direction, when the site has one.
    pub reverse: Option<PairLink>,
    pub siblings: Vec<PairLink>,
}

impl PairPage {
    fn link(&self) -> PairLink {
        PairLink {
            slug: self.slug.clone(),
            src_name: self.src.name.clone(),
            tgt_name: self.tgt.name.clone(),
        }
    }

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
    /// The popular engines, in `MAJORS` order.
    pub majors: Vec<EngineLink>,
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
    /// The conversions the converter's page links, in `content/structure.json` order.
    pub popular: Vec<PopularPair>,
    /// Every engine's drum map in every DAW's format, by address.
    pub drum_map_files: Vec<(SitePath, String)>,
}

/// A conversion the converter's page links: the link to its pair page and that page's tally.
pub struct PopularPair {
    pub link: PairLink,
    pub tally: Tally,
}

fn popular_pairs(
    pairs: &[PairPage],
    wanted: &[(&str, &str)],
) -> Result<Vec<PopularPair>, BuildError> {
    wanted
        .iter()
        .map(|&(src, tgt)| {
            let slug = pair_slug(src, tgt);
            pairs
                .iter()
                .find(|p| p.slug == slug)
                .map(|p| PopularPair {
                    link: p.link(),
                    tally: p.tally,
                })
                .ok_or(BuildError::NoPairPage(slug))
        })
        .collect()
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

/// The conversion as the converter makes it before any edit or setting change.
fn default_mapping(src: &EngineMap, tgt: &EngineMap) -> Mapping {
    Mapping::new(src, tgt, &Overrides::default(), MissingDrums::default())
}

fn pair_rows(src: &EngineMap, tgt: &EngineMap) -> Vec<FamilyGroup<PairRow>> {
    let mapping = default_mapping(src, tgt);
    by_family(src.source_notes().into_iter().map(|d| {
        (
            d.family,
            PairRow {
                landing: landing(mapping.resolve_canon(d.canon)),
                source: NoteCell {
                    note: d.note,
                    drum: d.label,
                },
            },
        )
    }))
}

fn pair_page(src: &EngineMap, tgt: &EngineMap, routes: &[Route]) -> PairPage {
    let groups = pair_rows(src, tgt);
    let rows = || groups.iter().flat_map(|g| &g.rows);
    PairPage {
        slug: pair_slug(src.id(), tgt.id()),
        src: EngineLink::of(src),
        tgt: EngineLink::of(tgt),
        tally: Tally::of(rows()),
        changes: Changes::of(rows()),
        groups,
        reverse: routes
            .iter()
            .any(|(s, t)| s.id() == tgt.id() && t.id() == src.id())
            .then(|| PairLink::of(tgt, src)),
        siblings: routes
            .iter()
            .filter(|(s, t)| s.id() == src.id() && t.id() != tgt.id())
            .map(|(s, t)| PairLink::of(s, t))
            .collect(),
    }
}

fn engine_row(map: &EngineMap, d: Drum) -> (Family, EngineRow) {
    let role = if map.encode(d.canon) == Some(d.note) {
        NoteRole::Main
    } else {
        NoteRole::Extra
    };
    (
        d.family,
        EngineRow {
            cell: NoteCell {
                note: d.note,
                drum: d.label,
            },
            role,
        },
    )
}

fn family_groups(map: &EngineMap) -> Vec<FamilyGroup<EngineRow>> {
    by_family(map.source_notes().into_iter().map(|d| engine_row(map, d)))
}

/// The notes the converter writes for the core drums on this engine, each note once; a
/// drum the engine plays only on another drum is left out.
fn core_notes(map: &EngineMap, core: &[Canon]) -> Vec<NoteCell> {
    let mut shown = HashSet::new();
    core.iter()
        .map(|&canon| map.resolve(canon, MissingDrums::default()))
        .filter(|r| !r.moves_to_other_drum())
        .filter_map(|r| r.played())
        .filter(|&(_, note)| shown.insert(note))
        .map(|(drum, note)| NoteCell {
            note,
            drum: drum.label(),
        })
        .collect()
}

fn engine_page(map: &EngineMap, routes: &[Route], core: &[Canon]) -> EnginePage {
    let links = |touches: &dyn Fn(&Route) -> bool| -> Vec<PairLink> {
        routes
            .iter()
            .filter(|r| touches(r))
            .map(|(s, t)| PairLink::of(s, t))
            .collect()
    };
    EnginePage {
        engine: EngineLink::of(map),
        total: map.source_notes().len(),
        core: core_notes(map, core),
        groups: family_groups(map),
        pairs_from: links(&|(s, _)| s.id() == map.id()),
        pairs_to: links(&|(_, t)| t.id() == map.id()),
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
        let targets = TARGETS
            .iter()
            .map(|id| lookup(catalog, id))
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

        let hub_routes = majors.iter().flat_map(|&s| {
            majors
                .iter()
                .filter(move |t| t.id() != s.id())
                .map(move |&t| (s, t))
        });
        let wide_routes = maps
            .iter()
            .filter(|m| majors.iter().all(|h| h.id() != m.id()))
            .flat_map(|&s| targets.iter().map(move |&t| (s, t)));
        let routes: Vec<Route> = hub_routes.chain(wide_routes).collect();

        let core = core_drums()?;
        let engines = maps
            .iter()
            .map(|m| engine_page(m, &routes, &core))
            .collect();
        let drum_map_files = maps
            .iter()
            .flat_map(|m| {
                Daw::ALL
                    .iter()
                    .map(|&daw| (drum_map_href(&slug(m.id()), daw), daw.drum_map(m)))
            })
            .collect();
        let pairs: Vec<PairPage> = routes
            .iter()
            .map(|&(s, t)| pair_page(s, t, &routes))
            .collect();
        let (vendors, more) = vendor_groups(&maps);
        let index = IndexPage {
            majors: majors.iter().map(|m| EngineLink::of(m)).collect(),
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
            popular: popular_pairs(&pairs, POPULAR)?,
            pairs,
            drum_map_files,
        })
    }
}
#[cfg(test)]
mod tests {
    use std::collections::{HashMap, HashSet};

    use midiremap_core::{convert, ChannelScope};
    use midiremap_testkit::{drums, hit_keys, off, on};

    use super::*;
    use crate::fixtures::site;

    fn hub_engines() -> usize {
        MAJORS.len()
    }

    fn other_engines() -> usize {
        site().engines.len() - hub_engines()
    }

    fn engine(id: &str) -> &'static EnginePage {
        site().engines.iter().find(|p| p.engine.id == id).unwrap()
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
    fn every_engine_has_a_drum_map_file_per_daw() {
        let s = site();
        assert_eq!(s.drum_map_files.len(), s.engines.len() * Daw::ALL.len());
        let written: HashSet<String> = s
            .drum_map_files
            .iter()
            .map(|(p, _)| p.to_string())
            .collect();
        for p in &s.engines {
            for d in p.engine.drum_maps() {
                assert!(written.contains(&d.href.to_string()), "{}", d.href);
            }
        }
    }

    #[test]
    fn a_drum_map_file_name_has_no_character_windows_forbids() {
        assert_eq!(
            safe_file_name(r#"A/B\C:D*E?F"G<H>I|J"#),
            "A-B-C-D-E-F-G-H-I-J"
        );
    }

    #[test]
    fn every_popular_conversion_links_its_pair_page() {
        let s = site();
        let slugs: HashSet<_> = s.pairs.iter().map(|p| p.slug.as_str()).collect();
        assert_eq!(s.popular.len(), POPULAR.len());
        assert!(s
            .popular
            .iter()
            .all(|p| slugs.contains(p.link.slug.as_str())));
    }

    #[test]
    fn popular_conversions_link_the_recorded_addresses() {
        let recorded: Vec<String> =
            serde_json::from_str(include_str!("../tests/golden/popular-links.json")).unwrap();
        let hrefs: Vec<String> = site()
            .popular
            .iter()
            .map(|p| p.link.href().to_string())
            .collect();
        assert_eq!(hrefs, recorded);
    }

    #[test]
    fn popular_conversions_keep_their_listed_order() {
        let first = &site().popular[0].link;
        let (src, tgt) = POPULAR[0];
        assert_eq!(first.slug, pair_slug(src, tgt));
    }

    #[test]
    fn a_popular_conversion_without_a_pair_page_is_an_error() {
        let s = site();
        assert!(matches!(
            popular_pairs(&s.pairs, &[("ugritone", "bfd3")]),
            Err(BuildError::NoPairPage(_))
        ));
    }

    #[test]
    fn pairs_join_the_hub_engines_and_every_other_engine_to_each_target() {
        assert_eq!(
            site().pairs.len(),
            hub_engines() * (hub_engines() - 1) + other_engines() * TARGETS.len()
        );
    }

    #[test]
    fn every_target_is_a_hub_engine() {
        assert!(TARGETS.iter().all(|t| MAJORS.iter().any(|(id, _)| id == t)));
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
        assert_eq!(slugs.len(), s.pairs.len());
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
    fn a_target_engine_page_links_a_pair_to_it_from_every_other_engine() {
        let ezd = engine("ezdrummer");
        assert_eq!(ezd.pairs_to.len(), hub_engines() - 1 + other_engines());
        assert!(ezd.pairs_to.iter().all(|l| l.tgt_name == "EZdrummer 3"));
    }

    #[test]
    fn a_target_engine_page_lists_the_hub_sources_first() {
        let names: Vec<&str> = engine("ezdrummer").pairs_to[..hub_engines() - 1]
            .iter()
            .map(|l| l.src_name.as_str())
            .collect();
        assert!(names.contains(&"General MIDI") && names.contains(&"Guitar Pro"));
    }

    #[test]
    fn a_hub_engine_that_is_no_target_links_seven_pairs_to_it() {
        assert_eq!(engine("addictive_drums2").pairs_to.len(), 7);
    }

    #[test]
    fn other_engine_pages_link_a_pair_to_each_target() {
        let hertz = engine("hertz");
        let targets: Vec<String> = hertz
            .pairs_from
            .iter()
            .map(|l| l.slug.rsplit("-to-").next().unwrap().replace('-', "_"))
            .collect();
        assert_eq!(targets, TARGETS);
        assert!(hertz
            .pairs_from
            .iter()
            .all(|l| l.src_name == hertz.engine.name));
    }

    #[test]
    fn other_engine_pages_link_no_pair_to_them() {
        assert!(engine("hertz").pairs_to.is_empty());
    }

    #[test]
    fn a_reverse_link_names_a_pair_page_that_exists() {
        let s = site();
        let slugs: HashSet<&str> = s.pairs.iter().map(|p| p.slug.as_str()).collect();
        for p in &s.pairs {
            if let Some(reverse) = &p.reverse {
                assert!(slugs.contains(reverse.slug.as_str()), "{}", p.slug);
            }
        }
    }

    #[test]
    fn only_a_pair_whose_other_direction_has_a_page_links_a_reverse_page() {
        let s = site();
        let slugs: HashSet<&str> = s.pairs.iter().map(|p| p.slug.as_str()).collect();
        for p in &s.pairs {
            let other_way = pair_slug(&p.tgt.id, &p.src.id);
            assert_eq!(
                p.reverse.is_some(),
                slugs.contains(other_way.as_str()),
                "{}",
                p.slug
            );
        }
    }

    fn pair(slug: &str) -> &'static PairPage {
        site().pairs.iter().find(|p| p.slug == slug).unwrap()
    }

    fn rows(p: &PairPage) -> impl Iterator<Item = &PairRow> {
        p.groups.iter().flat_map(|g| &g.rows)
    }

    #[test]
    fn pair_groups_follow_family_order() {
        for p in &site().pairs {
            let families: Vec<Family> = p.groups.iter().map(|g| g.family).collect();
            let order: Vec<Family> = Family::ALL
                .iter()
                .copied()
                .filter(|f| families.contains(f))
                .collect();
            assert_eq!(families, order, "{}", p.slug);
            assert!(p.groups.iter().all(|g| !g.rows.is_empty()), "{}", p.slug);
        }
    }

    #[test]
    fn pair_rows_ascend_by_note_within_a_group() {
        for p in &site().pairs {
            for g in &p.groups {
                assert!(
                    g.rows.is_sorted_by_key(|r| r.source.note),
                    "{}: {}",
                    p.slug,
                    g.family
                );
            }
        }
    }

    #[test]
    fn merges_cover_every_approximated_row_once() {
        for p in &site().pairs {
            for row in rows(p) {
                let Landing::Approximated(target) = &row.landing else {
                    continue;
                };
                let holding: Vec<&Merge> = p
                    .changes
                    .merges
                    .iter()
                    .filter(|m| m.sources.contains(&row.source.drum))
                    .collect();
                assert_eq!(holding.len(), 1, "{}: {}", p.slug, row.source.drum);
                assert_eq!(holding[0].target.note, target.note, "{}", p.slug);
            }
            let approximated: HashSet<&str> = rows(p)
                .filter(|r| matches!(r.landing, Landing::Approximated(_)))
                .map(|r| r.source.drum.as_str())
                .collect();
            let merged: usize = p.changes.merges.iter().map(|m| m.sources.len()).sum();
            assert_eq!(merged, approximated.len(), "{}", p.slug);
        }
    }

    #[test]
    fn merges_put_the_busiest_target_first() {
        for p in &site().pairs {
            assert!(
                p.changes
                    .merges
                    .is_sorted_by_key(|m| (Reverse(m.sources.len()), m.target.note)),
                "{}",
                p.slug
            );
        }
    }

    #[test]
    fn ggd_invasion_to_ezdrummer_merges_five_cymbals_into_crash_1() {
        let busiest = &pair("ggd-invasion-to-ezdrummer").changes.merges[0];
        assert_eq!(busiest.target.drum, "Crash 1");
        assert_eq!(busiest.sources.len(), 5, "{:?}", busiest.sources);
    }

    #[test]
    fn dropped_lists_every_dropped_row() {
        for p in &site().pairs {
            let dropped: Vec<&str> = rows(p)
                .filter(|r| matches!(r.landing, Landing::Dropped))
                .map(|r| r.source.drum.as_str())
                .collect();
            assert!(
                dropped
                    .iter()
                    .all(|d| p.changes.dropped.iter().any(|c| c == d)),
                "{}",
                p.slug
            );
            assert_eq!(
                p.changes.dropped.len(),
                dropped.iter().collect::<HashSet<_>>().len(),
                "{}",
                p.slug
            );
        }
    }

    #[test]
    fn engine_rows_are_grouped_by_family_in_app_order() {
        for p in &site().engines {
            let families: Vec<Family> = p.groups.iter().map(|g| g.family).collect();
            let order: Vec<Family> = Family::ALL
                .iter()
                .copied()
                .filter(|f| families.contains(f))
                .collect();
            assert_eq!(families, order, "{}", p.engine.id);
        }
    }

    #[test]
    fn by_family_keeps_family_order_and_skips_empty_families() {
        let groups = by_family([
            (Family::Cymbals, 1),
            (Family::Kick, 2),
            (Family::Cymbals, 3),
            (Family::Kick, 4),
        ]);
        let shape: Vec<(Family, Vec<i32>)> =
            groups.into_iter().map(|g| (g.family, g.rows)).collect();
        assert_eq!(
            shape,
            [(Family::Kick, vec![2, 4]), (Family::Cymbals, vec![1, 3])]
        );
    }

    #[test]
    fn a_group_anchor_is_its_family_in_lower_case() {
        let group = FamilyGroup::<()> {
            family: Family::HiHat,
            rows: vec![],
        };
        assert_eq!(group.anchor(), "g-hi-hat");
    }

    #[test]
    fn engine_rows_mark_exactly_one_main_note_per_drum() {
        let maps = Catalog::builtin().unwrap();
        for p in &site().engines {
            let map = maps.get(&p.engine.id).unwrap();
            let mut mains: HashMap<Canon, usize> = HashMap::new();
            for r in p.groups.iter().flat_map(|g| &g.rows) {
                let canon = map.decode(r.cell.note).unwrap();
                *mains.entry(canon).or_default() += usize::from(r.role == NoteRole::Main);
            }
            assert!(mains.values().all(|&n| n == 1), "{}", p.engine.id);
        }
    }

    fn role_of(page: &EnginePage, note: u8) -> NoteRole {
        page.groups
            .iter()
            .flat_map(|g| &g.rows)
            .find(|r| r.cell.note.get() == note)
            .map(|r| r.role)
            .unwrap()
    }

    #[test]
    fn ezdrummer_marks_note_36_main_and_35_extra() {
        let ezd = engine("ezdrummer");
        assert_eq!(role_of(ezd, 36), NoteRole::Main);
        assert_eq!(role_of(ezd, 35), NoteRole::Extra);
        assert!(ezd.has_extra());
    }

    #[test]
    fn engine_page_groups_are_never_empty() {
        for p in &site().engines {
            assert!(p.groups.iter().all(|g| !g.rows.is_empty()));
        }
    }

    #[test]
    fn engine_page_rows_cover_every_source_note() {
        let maps = Catalog::builtin().unwrap();
        for p in &site().engines {
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
        let listed: HashSet<&str> = listed_engines(s).into_iter().collect();
        let all: HashSet<&str> = s.index.all.iter().map(|e| e.id.as_str()).collect();
        assert_eq!(listed, all);
    }

    #[test]
    fn vendor_groups_and_more_list_no_engine_twice() {
        let s = site();
        let listed = listed_engines(s);
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
    fn a_hub_pair_lists_six_siblings() {
        let s = site();
        let pair = s
            .pairs
            .iter()
            .find(|p| p.slug == "ggd-invasion-to-ezdrummer")
            .unwrap();
        assert_eq!(pair.siblings.len(), 6);
    }

    #[test]
    fn a_pair_from_another_engine_lists_the_other_targets() {
        let s = site();
        let pair = s
            .pairs
            .iter()
            .find(|p| p.slug == "hertz-to-ezdrummer")
            .unwrap();
        assert_eq!(pair.siblings.len(), TARGETS.len() - 1);
    }

    #[test]
    fn siblings_start_where_their_pair_starts() {
        for p in &site().pairs {
            assert!(
                p.siblings.iter().all(|l| l.src_name == p.src.name),
                "{}",
                p.slug
            );
        }
    }

    #[test]
    fn siblings_exclude_the_pair_itself() {
        for p in &site().pairs {
            assert!(p.siblings.iter().all(|l| l.slug != p.slug));
        }
    }

    #[test]
    fn pair_rows_agree_with_the_converter() {
        let maps = Catalog::builtin().unwrap();
        let by_id: HashMap<&str, &EngineMap> = maps.engines().map(|m| (m.id(), m)).collect();
        for p in &site().pairs {
            let (src, tgt) = (by_id[p.src.id.as_str()], by_id[p.tgt.id.as_str()]);
            let mapping = default_mapping(src, tgt);
            for row in rows(p) {
                assert_eq!(
                    written(row.source.note, &mapping),
                    row.landing.target().map(|t| t.note.get()),
                    "{} note {}",
                    p.slug,
                    row.source.note.get()
                );
            }
        }
    }

    fn written(note: Note, mapping: &Mapping) -> Option<u8> {
        let out = convert(
            &drums(&[(10, on(note.get())), (10, off(note.get()))]),
            mapping,
            ChannelScope::Auto,
        )
        .unwrap();
        hit_keys(&out.bytes).first().copied()
    }

    #[test]
    fn every_core_drum_key_parses() {
        assert_eq!(core_drums().unwrap().len(), CORE_DRUMS.len());
    }

    fn core_kit() -> EngineMap {
        let notes: Vec<String> = CORE_DRUMS
            .iter()
            .enumerate()
            .map(|(note, key)| format!(r#"{{"note":{note},"canon":"{key}","primary":true}}"#))
            .collect();
        EngineMap::from_json(&format!(
            r#"{{"id":"core","name":"Core","notes":[{}]}}"#,
            notes.join(",")
        ))
        .unwrap()
    }

    #[test]
    fn core_notes_agree_with_the_converter() {
        let maps = Catalog::builtin().unwrap();
        let kit = core_kit();
        let core = core_drums().unwrap();
        for p in &site().engines {
            let map = maps.get(&p.engine.id).unwrap();
            let mapping = default_mapping(&kit, map);
            let shown: HashSet<u8> = p.core.iter().map(|c| c.note.get()).collect();
            for &canon in &core {
                let resolved = map.resolve(canon, MissingDrums::default());
                let Some(note) = resolved.note().filter(|_| !resolved.moves_to_other_drum()) else {
                    continue;
                };
                let hit = kit.encode(canon).unwrap();
                assert_eq!(
                    written(hit, &mapping),
                    Some(note.get()),
                    "{}: {canon}",
                    p.engine.id
                );
                assert!(shown.contains(&note.get()), "{}: {canon}", p.engine.id);
            }
        }
    }

    #[test]
    fn core_notes_show_no_note_twice() {
        for p in &site().engines {
            let notes: HashSet<Note> = p.core.iter().map(|c| c.note).collect();
            assert_eq!(notes.len(), p.core.len(), "{}", p.engine.id);
        }
    }

    #[test]
    fn general_midi_core_starts_with_kick_36_snare_38() {
        let first: Vec<(u8, &str)> = engine("general_midi").core[..2]
            .iter()
            .map(|c| (c.note.get(), c.drum.as_str()))
            .collect();
        assert_eq!(first[0].0, 36);
        assert_eq!(first[1].0, 38);
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
