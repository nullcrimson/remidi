use std::{
    cmp::Reverse,
    collections::{BTreeMap, HashMap},
    fmt::Write as _,
    sync::OnceLock,
};

use expect_test::expect_file;
use midiremap_core::{
    convert, note_hits, source_advice, Catalog, ChannelScope, EngineMap, Lacks, Loss, Mapping,
    MissingDrums, Note, NoteHits, Overrides, SourceAdvice,
};
use midiremap_testkit::{events, hit_keys, Ev};
use support::grooves::Corpus;

pub mod support;

/// The targets every run advises for: a dense major, and the standard.
const TARGETS: [&str; 2] = ["superior_drummer3", "general_midi"];

/// How many source ids a line of the golden lists.
const IDS_PER_LINE: usize = 8;

/// The file converted from `src` to `tgt` as the converter does before any edit, with the
/// hits it read and lost.
fn converted(file: &[u8], src: &EngineMap, tgt: &EngineMap) -> (Vec<u8>, Loss) {
    let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
    let done = convert(file, &mapping, ChannelScope::Auto)
        .expect("a groove parses")
        .done()
        .expect("a groove on the drum channel converts");
    (done.bytes, done.report.loss())
}

/// Whether `a` and `b` read every note in `notes` as the same family.
fn same_families(a: &EngineMap, b: &EngineMap, notes: &[Note]) -> bool {
    notes
        .iter()
        .all(|&note| a.decode(note).map(|c| c.family()) == b.decode(note).map(|c| c.family()))
}

/// How many suggestions of one engine converted to the true source's events, and how many
/// did not.
#[derive(Default)]
struct Verdicts {
    right: u32,
    wrong: u32,
}

impl Verdicts {
    fn record(&mut self, right: bool) {
        if right {
            self.right += 1;
        } else {
            self.wrong += 1;
        }
    }

    fn total(&self) -> u32 {
        self.right + self.wrong
    }
}

/// How a wrong suggestion went wrong, in the order the golden lists them.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum WrongClass {
    AnotherFamily,
    SameFamilies,
    TargetsOwn,
}

impl WrongClass {
    /// The class of the suggestion of `suggestion` for `truth`'s groove converted to `tgt`.
    fn of(truth: &Truth, suggestion: &EngineMap, tgt: &EngineMap) -> Self {
        if truth.engine.id() == tgt.id() {
            Self::TargetsOwn
        } else if same_families(suggestion, truth.engine, &truth.notes) {
            Self::SameFamilies
        } else {
            Self::AnotherFamily
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::AnotherFamily => "a note read as another family",
            Self::SameFamilies => "same family on every note, another drum or articulation",
            Self::TargetsOwn => "the file is the target's own layout",
        }
    }
}

/// One pair's advice, judged against the true source: whether converting as it says gives the
/// true source's events, and, for a wrong suggestion, how it went wrong.
enum Judged<'c> {
    Fits,
    Unknown,
    Target {
        right: bool,
        partial: bool,
        ask: Option<Lacks>,
    },
    Suggested {
        engine: &'c str,
        right: bool,
        wrong: Option<WrongClass>,
        ask: Option<Lacks>,
    },
}

impl Judged<'_> {
    /// The outcome the golden groups the pair under.
    fn outcome(&self) -> String {
        match *self {
            Self::Fits => "fits".to_owned(),
            Self::Unknown => "unknown".to_owned(),
            Self::Target { right, ask, .. } => verdict("target", ask.is_some(), right),
            Self::Suggested {
                engine, right, ask, ..
            } => verdict(engine, ask.is_some(), right),
        }
    }
}

fn verdict(named: &str, ask: bool, right: bool) -> String {
    let ask = if ask { " ask" } else { "" };
    let right = if right { "right" } else { "WRONG" };
    format!("{named}{ask} {right}")
}

#[derive(Default)]
struct Counts {
    pairs: u32,
    fits: u32,
    unknown: u32,
    target: u32,
    target_right: u32,
    target_partial: u32,
    suggested: u32,
    right: u32,
    wrong: u32,
    questions: u32,
    questions_right: u32,
    target_questions: u32,
    target_questions_right: u32,
    lacks: Lacking,
    own_heavy: u32,
    classes: BTreeMap<WrongClass, u32>,
    engines: BTreeMap<String, Verdicts>,
    broken: Vec<String>,
}

/// How many questions said the source lacks the kick and the snare, the kick, or the snare.
#[derive(Default)]
struct Lacking {
    kick_and_snare: u32,
    kick: u32,
    snare: u32,
}

impl Lacking {
    fn record(&mut self, lacks: Lacks) {
        let count = match lacks {
            Lacks::KickAndSnare => &mut self.kick_and_snare,
            Lacks::Kick => &mut self.kick,
            Lacks::Snare => &mut self.snare,
        };
        *count += 1;
    }
}

impl Counts {
    /// Counts one pair's judged advice.
    fn record(&mut self, judged: &Judged) {
        self.pairs += 1;
        match *judged {
            Judged::Fits => self.fits += 1,
            Judged::Unknown => self.unknown += 1,
            Judged::Target {
                right,
                partial,
                ask,
            } => {
                self.target += 1;
                self.target_right += u32::from(right);
                self.target_partial += u32::from(partial);
                if let Some(lacks) = ask {
                    self.target_questions += 1;
                    self.target_questions_right += u32::from(right);
                    self.lacks.record(lacks);
                }
            }
            Judged::Suggested {
                engine,
                right,
                wrong,
                ask,
            } => {
                self.suggested += 1;
                self.engines
                    .entry(engine.to_owned())
                    .or_default()
                    .record(right);
                if right {
                    self.right += 1;
                } else {
                    self.wrong += 1;
                }
                if let Some(class) = wrong {
                    *self.classes.entry(class).or_default() += 1;
                }
                if let Some(lacks) = ask {
                    self.questions += 1;
                    self.questions_right += u32::from(right);
                    self.lacks.record(lacks);
                }
            }
        }
    }

    fn head(&self, corpus: Corpus, target: &str, out: &mut String) {
        let line = format!(
            "{} grooves, target {target}: pairs {}, source fits {}, unknown {}, target named {} \
             (right {}, knows only some {}), engines suggested {} (right {}, wrong {}), questions \
             naming an engine {} (right {}), questions naming the target {} (right {}), the source \
             lacks kick and snare {}, kick {}, snare {}, own source heavy loss {}",
            corpus.name(),
            self.pairs,
            self.fits,
            self.unknown,
            self.target,
            self.target_right,
            self.target_partial,
            self.suggested,
            self.right,
            self.wrong,
            self.questions,
            self.questions_right,
            self.target_questions,
            self.target_questions_right,
            self.lacks.kick_and_snare,
            self.lacks.kick,
            self.lacks.snare,
            self.own_heavy,
        );
        writeln!(out, "{line}").unwrap();
        for (class, count) in &self.classes {
            writeln!(out, "  wrong: {}: {count}", class.label()).unwrap();
        }
        let mut engines: Vec<_> = self.engines.iter().collect();
        engines.sort_by_key(|(id, verdicts)| (Reverse(verdicts.total()), id.as_str()));
        for (id, verdicts) in engines {
            writeln!(
                out,
                "  suggested {id}: right {}, wrong {}",
                verdicts.right, verdicts.wrong
            )
            .unwrap();
        }
    }
}

/// One true source's groove: the file and its events, its hits, how many note-ons it plays,
/// and the notes it plays on, each once, ascending.
struct Truth<'c> {
    engine: &'c EngineMap,
    file: Vec<u8>,
    kept: Vec<Ev>,
    hits: NoteHits,
    played: usize,
    notes: Vec<Note>,
}

impl<'c> Truth<'c> {
    fn of(corpus: Corpus, engine: &'c EngineMap) -> Self {
        let file = corpus.groove(engine);
        let hits = note_hits(&file, ChannelScope::Auto).expect("a groove parses");
        let mut notes: Vec<Note> = hit_keys(&file).into_iter().filter_map(Note::new).collect();
        let played = notes.len();
        notes.sort_unstable();
        notes.dedup();
        Self {
            engine,
            kept: events(&file, 0),
            file,
            hits,
            played,
            notes,
        }
    }

    /// The events converting the groove from its own source to `tgt` gives, the groove itself
    /// when it is the target's own, and whether that conversion lost heavily; a broken proof
    /// is written to `broken`. P1: the true source fits its own groove; P1b: a kit groove
    /// converts from it without a heavy loss.
    fn own(
        &self,
        catalog: &Catalog,
        corpus: Corpus,
        tgt: &EngineMap,
        broken: &mut Vec<String>,
    ) -> (Vec<Ev>, bool) {
        if self.engine.id() == tgt.id() {
            return (self.kept.clone(), false);
        }
        let advised = source_advice(catalog, &self.hits, self.engine, Some(tgt));
        if advised.advice() != &SourceAdvice::Fits {
            broken.push(format!("P1: {} read as its own source", self.engine.id()));
        }
        let (bytes, loss) = converted(&self.file, self.engine, tgt);
        if corpus == Corpus::Kit && loss.is_heavy() {
            broken.push(format!(
                "P1b: {} converted from its own source to {} loses {} of {}",
                self.engine.id(),
                tgt.id(),
                loss.lost(),
                loss.read()
            ));
        }
        (events(&bytes, 0), loss.is_heavy())
    }
}

/// The advice for one pair, judged: whether converting as it says gives `own`, the true
/// source's events, each suggested engine converted once and remembered in `right_from`; a
/// broken proof is written to `broken`. P2: every engine named recognizes more hits than the
/// source.
fn judge<'c>(
    catalog: &'c Catalog,
    truth: &Truth,
    src: &EngineMap,
    tgt: &EngineMap,
    own: &[Ev],
    right_from: &mut HashMap<&'c str, bool>,
    broken: &mut Vec<String>,
) -> Judged<'c> {
    let advised = source_advice(catalog, &truth.hits, src, Some(tgt));
    let named = advised.advice().named();
    if named.is_some_and(|named| named.recognized + named.missing <= named.hits) {
        broken.push(format!("P2: {} for {}", src.id(), truth.engine.id()));
    }
    match advised.advice() {
        SourceAdvice::Fits => Judged::Fits,
        SourceAdvice::Unknown => Judged::Unknown,
        SourceAdvice::LooksLikeTarget(named) => Judged::Target {
            right: own == truth.kept,
            partial: named.recognized < named.hits,
            ask: named.ask,
        },
        SourceAdvice::Suggest { engine, named } => {
            let suggestion = catalog.get(engine.as_str()).expect("a catalog engine");
            let right = suggestion.id() == truth.engine.id()
                || *right_from.entry(suggestion.id()).or_insert_with(|| {
                    events(&converted(&truth.file, suggestion, tgt).0, 0) == own
                });
            Judged::Suggested {
                engine: suggestion.id(),
                right,
                wrong: (!right).then(|| WrongClass::of(truth, suggestion, tgt)),
                ask: named.ask,
            }
        }
    }
}

/// The sources of one outcome, eight ids to a line, or the count alone for a true source's
/// largest group.
fn group(outcome: &str, sources: &[&str], other: bool, out: &mut String) {
    if other {
        writeln!(out, "  {outcome} <- the other {}", sources.len()).unwrap();
        return;
    }
    writeln!(out, "  {outcome} <-").unwrap();
    for line in sources.chunks(IDS_PER_LINE) {
        writeln!(out, "    {}", line.join(" ")).unwrap();
    }
}

/// One true source's pairs, grouped by outcome, its largest group past a line counted only.
fn write_groups(truth: &Truth, groups: &BTreeMap<String, Vec<&str>>, out: &mut String) {
    writeln!(
        out,
        "{} ({} hits on {} notes)",
        truth.engine.id(),
        truth.played,
        truth.notes.len()
    )
    .unwrap();
    let widest = groups.values().map(Vec::len).max().unwrap_or(0);
    let mut other = false;
    for (outcome, sources) in groups {
        let largest = !other && sources.len() == widest && sources.len() > IDS_PER_LINE;
        other |= largest;
        group(outcome, sources, largest, out);
    }
}

/// Every pair of one corpus for one target: each true source's groove read under every engine
/// that is neither it nor the target, checked against the properties that hold by construction,
/// counted, and, with `body`, each pair's verdict written grouped per true source.
fn run(
    catalog: &Catalog,
    corpus: Corpus,
    tgt: &EngineMap,
    mut body: Option<&mut String>,
) -> Counts {
    let mut counts = Counts::default();
    for engine in catalog.engines() {
        let truth = Truth::of(corpus, engine);
        let (own, heavy) = truth.own(catalog, corpus, tgt, &mut counts.broken);
        counts.own_heavy += u32::from(heavy);
        let mut right_from = HashMap::new();
        let mut groups: BTreeMap<String, Vec<&str>> = BTreeMap::new();
        let sources = catalog
            .engines()
            .filter(|src| src.id() != engine.id() && src.id() != tgt.id());
        for src in sources {
            let judged = judge(
                catalog,
                &truth,
                src,
                tgt,
                &own,
                &mut right_from,
                &mut counts.broken,
            );
            counts.record(&judged);
            groups.entry(judged.outcome()).or_default().push(src.id());
        }
        if let Some(out) = body.as_deref_mut() {
            write_groups(&truth, &groups, out);
        }
    }
    counts
}

/// One sweep of every pair: the proofs it found broken, and the record of every pair against
/// its true source.
struct Sweep {
    broken: Vec<String>,
    recorded: String,
}

/// The advice for every pair of true source and source read, over the kit, full and sample
/// corpora and two targets, swept once for both tests, since each needs the advice of every
/// pair and one sweep is what they cost.
fn sweep() -> &'static Sweep {
    static SWEEP: OnceLock<Sweep> = OnceLock::new();
    SWEEP.get_or_init(|| {
        let catalog = Catalog::builtin();
        let mut broken = Vec::new();
        let mut head = String::new();
        let mut body = String::new();
        for corpus in Corpus::ALL {
            for target in TARGETS {
                let tgt = catalog.get(target).expect("a target of the catalog");
                let lines = corpus == Corpus::Kit;
                if lines {
                    writeln!(body, "== {} grooves, target {target}", corpus.name()).unwrap();
                }
                let mut counts = run(&catalog, corpus, tgt, lines.then_some(&mut body));
                counts.head(corpus, target, &mut head);
                broken.append(&mut counts.broken);
            }
        }
        Sweep {
            broken,
            recorded: format!("{head}\n{body}"),
        }
    })
}

/// The proofs that hold by construction hold for every pair: no source is told it misses its
/// own file (P1), its own kit groove converts without a heavy loss (P1b), and every engine
/// named recognizes more than the source (P2).
#[test]
fn every_pair_holds_the_proofs() {
    assert_eq!(sweep().broken, Vec::<String>::new());
}

/// What can only be measured, whether converting as the advice says gives the true source's
/// events, is written to the golden pair by pair for the kit corpus, and counted for all.
#[test]
fn every_pair_is_recorded_against_the_true_source() {
    expect_file!["golden/suggestions.txt"].assert_eq(&sweep().recorded);
}
