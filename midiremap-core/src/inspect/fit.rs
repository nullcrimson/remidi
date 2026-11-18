use std::cmp::Reverse;

use midiremap_kit::{
    canon::Family,
    engine::{Catalog, EngineId, EngineMap, Standing},
};
use midiremap_note::Note;
use serde::Serialize;

use super::hits::NoteHits;
use crate::share::Share;

/// What a source reads none of in a file whose question it asks.
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Lacks {
    Kick,
    Snare,
    KickAndSnare,
}

impl Lacks {
    /// What reading `kick` kick hits and `snare` snare hits lacks: `None` when it reads both.
    fn of(kick: u32, snare: u32) -> Option<Self> {
        match (kick > 0, snare > 0) {
            (true, true) => None,
            (false, true) => Some(Self::Kick),
            (true, false) => Some(Self::Snare),
            (false, false) => Some(Self::KickAndSnare),
        }
    }
}

/// How many of the hits one engine's layout recognizes, the share of them it misses, and
/// whether it reads no kick hit or no snare hit among them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct SourceFit {
    engine: EngineId,
    recognized: u32,
    missed: Option<Share>,
    lacks: Option<Lacks>,
}

impl SourceFit {
    /// The fit of `engine` to `hits`.
    pub(super) fn of(hits: &NoteHits, engine: &EngineMap) -> Self {
        Fitted::of(&hits.played(), engine).fit()
    }

    pub(super) fn engine(&self) -> &EngineId {
        &self.engine
    }

    /// The hits on notes the engine's map decodes: the ones converting from it keeps.
    pub(super) fn recognized(&self) -> u32 {
        self.recognized
    }

    /// The share of the hits on notes the engine's map does not decode: `None` without hits.
    pub(super) fn missed(&self) -> Option<Share> {
        self.missed
    }

    /// What of the kick and the snare the engine reads no hit of: `None` when it reads both.
    pub(super) fn lacks(&self) -> Option<Lacks> {
        self.lacks
    }
}

/// Where an engine ranks, lowest first: by recognized hits, standing, core hits, the target's
/// vendor, the target itself and id.
type Rank<'e> = (
    Reverse<u32>,
    Standing,
    Reverse<u32>,
    Reverse<bool>,
    Reverse<bool>,
    &'e str,
);

/// One engine's reading of the played notes: the hits it recognizes and those it misses,
/// those it reads as one of the core families, and those it reads as a kick and as a snare.
struct Fitted<'e> {
    engine: &'e EngineMap,
    recognized: u32,
    missed: u32,
    core: u32,
    kick: u32,
    snare: u32,
}

impl<'e> Fitted<'e> {
    fn of(played: &[(Note, u32)], engine: &'e EngineMap) -> Self {
        played
            .iter()
            .map(|&(note, hits)| (engine.decode(note).map(|canon| canon.family()), hits))
            .fold(Self::empty(engine), Self::counted)
    }

    /// The reading of no hits.
    fn empty(engine: &'e EngineMap) -> Self {
        Self {
            engine,
            recognized: 0,
            missed: 0,
            core: 0,
            kick: 0,
            snare: 0,
        }
    }

    /// The reading with `hits` more hits read as `family`, or missed without one.
    fn counted(mut self, (family, hits): (Option<Family>, u32)) -> Self {
        let Some(family) = family else {
            self.missed += hits;
            return self;
        };
        self.recognized += hits;
        if family.is_core() {
            self.core += hits;
        }
        match family {
            Family::Kick => self.kick += hits,
            Family::Snare => self.snare += hits,
            Family::HiHat | Family::Toms | Family::Cymbals | Family::Percussion | Family::Aux => {}
        }
        self
    }

    /// Where the engine ranks for `target`, lowest first: the most recognized hits, then the
    /// better standing, then the most kick, snare and hi-hat hits, then the target's vendor,
    /// then the target itself, then by id.
    fn rank(&self, target: Option<&EngineMap>) -> Rank<'e> {
        let vendor = target.and_then(EngineMap::vendor);
        (
            Reverse(self.recognized),
            self.engine.standing(),
            Reverse(self.core),
            Reverse(vendor.is_some_and(|v| self.engine.vendor() == Some(v))),
            Reverse(target.is_some_and(|t| t.id() == self.engine.id())),
            self.engine.id(),
        )
    }

    fn fit(&self) -> SourceFit {
        SourceFit {
            engine: self.engine.into(),
            recognized: self.recognized,
            missed: Share::split(self.missed, self.recognized),
            lacks: Lacks::of(self.kick, self.snare),
        }
    }
}

/// The best engine of `catalog` for `target` among those that recognize more of `hits` than
/// `recognized`: the most recognized hits, then the better [`Standing`], then the most kick,
/// snare and hi-hat hits, then the engines of `target`'s vendor (no preference without a target
/// or a vendor), then the target itself, then by id. The target is ranked like any engine.
pub(super) fn first_above(
    catalog: &Catalog,
    hits: &NoteHits,
    recognized: u32,
    target: Option<&EngineMap>,
) -> Option<SourceFit> {
    let played = hits.played();
    catalog
        .engines()
        .map(|engine| Fitted::of(&played, engine))
        .filter(|fitted| fitted.recognized > recognized)
        .min_by_key(|fitted| fitted.rank(target))
        .as_ref()
        .map(Fitted::fit)
}

#[cfg(test)]
mod tests {
    use midiremap_mapping::{Mapping, MissingDrums, Overrides};
    use midiremap_smf::parts::ChannelScope;
    use midiremap_testkit::{engine_json, on, played, tracks, DRUMS};

    use super::*;
    use crate::{convert::convert, inspect::note_hits};

    const KICK: &str = "kick.main";
    const SNARE: &str = "snare1.hit";
    const HAT: &str = "hat.closed";
    const TOM: &str = "tom.rack1.hit";

    fn engine(id: &str, vendor: Option<&str>, notes: &[(u8, &str)]) -> EngineMap {
        let mut json = engine_json(id, notes);
        if let Some(vendor) = vendor {
            json["vendor"] = vendor.into();
        }
        EngineMap::from_json(&json.to_string()).unwrap()
    }

    fn plain(id: &str, notes: &[(u8, &str)]) -> EngineMap {
        engine(id, None, notes)
    }

    fn groove() -> NoteHits {
        note_hits(
            &played(&[(36, 2), (38, 1), (42, 1), (50, 1)]),
            ChannelScope::Auto,
        )
        .unwrap()
    }

    fn first_over(
        engines: Vec<EngineMap>,
        recognized: u32,
        target: Option<&EngineMap>,
    ) -> Option<String> {
        let catalog = Catalog::from_maps(engines).unwrap();
        first_above(&catalog, &groove(), recognized, target)
            .map(|fit| fit.engine().as_str().to_owned())
    }

    fn first(engines: Vec<EngineMap>, target: Option<&EngineMap>) -> String {
        first_over(engines, 0, target).expect("an engine recognizes a hit")
    }

    #[test]
    fn the_engine_that_recognizes_more_hits_ranks_first() {
        let first = first(
            vec![
                plain("a", &[(36, KICK), (38, SNARE), (42, HAT), (61, TOM)]),
                plain("z", &[(36, KICK), (38, SNARE), (42, HAT), (50, TOM)]),
            ],
            None,
        );
        assert_eq!(first, "z");
    }

    #[test]
    fn among_equal_recognized_the_engine_with_more_core_hits_ranks_first() {
        let first = first(
            vec![
                plain(
                    "a",
                    &[(36, "tom.rack2.hit"), (38, SNARE), (42, HAT), (50, TOM)],
                ),
                plain("z", &[(36, KICK), (38, SNARE), (42, HAT), (50, TOM)]),
            ],
            None,
        );
        assert_eq!(first, "z");
    }

    fn hub(id: &str, standing: &str, notes: &[(u8, &str)]) -> EngineMap {
        let mut json = engine_json(id, notes);
        json["hub"] = serde_json::json!({ "standing": standing, "column": id, "order": 1 });
        EngineMap::from_json(&json.to_string()).unwrap()
    }

    #[test]
    fn among_equal_recognized_the_standard_ranks_first_then_a_major() {
        let full = [(36, KICK), (38, SNARE), (42, HAT), (50, TOM)];
        let fewer_core = [(36, "tom.rack2.hit"), (38, SNARE), (42, HAT), (50, TOM)];
        let standard = first(
            vec![
                plain("a", &full),
                hub("m", "major", &fewer_core),
                hub("s", "standard", &fewer_core),
            ],
            None,
        );
        let major = first(
            vec![plain("a", &full), hub("m", "major", &fewer_core)],
            None,
        );
        assert_eq!([standard, major], ["s", "m"]);
    }

    #[test]
    fn among_equal_core_hits_the_targets_vendor_ranks_first() {
        let target = engine("t", Some("Toontrack"), &[(36, KICK)]);
        let first = first(
            vec![
                engine("a", Some("BFD"), &[(36, KICK), (38, SNARE)]),
                engine("z", Some("Toontrack"), &[(36, KICK), (38, SNARE)]),
            ],
            Some(&target),
        );
        assert_eq!(first, "z");
    }

    #[test]
    fn the_target_ranks_first_among_equals() {
        let same = [(36, KICK), (38, SNARE)];
        let target = plain("z", &same);
        assert_eq!(
            first(vec![plain("a", &same), plain("z", &same)], Some(&target)),
            "z"
        );
    }

    #[test]
    fn engines_with_equal_keys_rank_by_id() {
        let same = [(36, KICK), (38, SNARE)];
        assert_eq!(first(vec![plain("z", &same), plain("a", &same)], None), "a");
    }

    #[test]
    fn the_target_is_ranked_like_any_engine() {
        let target = plain("t", &[(36, KICK), (38, SNARE)]);
        let first = first(
            vec![
                plain("u", &[(36, KICK)]),
                plain("t", &[(36, KICK), (38, SNARE)]),
            ],
            Some(&target),
        );
        assert_eq!(first, "t");
    }

    #[test]
    fn no_target_gives_no_vendor_preference() {
        let first = first(
            vec![
                engine("c", Some("Toontrack"), &[(36, KICK)]),
                engine("b", None, &[(36, KICK)]),
                engine("a", Some("BFD"), &[(36, KICK)]),
            ],
            None,
        );
        assert_eq!(first, "a");
    }

    #[test]
    fn only_an_engine_that_recognizes_more_hits_is_first_above() {
        let engines = || {
            vec![
                plain("a", &[(36, KICK), (38, SNARE)]),
                plain("b", &[(36, KICK)]),
            ]
        };
        assert_eq!(
            [
                first_over(engines(), 2, None),
                first_over(engines(), 3, None)
            ],
            [Some("a".to_owned()), None]
        );
    }

    #[test]
    fn a_fit_says_what_of_the_kick_and_the_snare_it_reads_none_of() {
        let lacks = |notes: &[(u8, &str)]| SourceFit::of(&groove(), &plain("e", notes)).lacks();
        assert_eq!(
            [
                lacks(&[(36, KICK), (38, SNARE)]),
                lacks(&[(36, KICK), (42, HAT), (50, TOM)]),
                lacks(&[(38, SNARE), (42, HAT), (50, TOM)]),
                lacks(&[(42, HAT), (50, TOM)]),
            ],
            [
                None,
                Some(Lacks::Snare),
                Some(Lacks::Kick),
                Some(Lacks::KickAndSnare)
            ]
        );
    }

    #[test]
    fn a_fit_agrees_with_what_converting_removes_as_unrecognized() {
        let midi = tracks(&[
            &[(0, DRUMS, on(24)), (0, DRUMS, on(99)), (0, DRUMS, on(99))],
            &[(0, 1, on(26))],
        ]);
        let catalog = Catalog::builtin();
        let hits = note_hits(&midi, ChannelScope::Auto).unwrap();
        let src = catalog.get("ggd_invasion").unwrap();
        let tgt = catalog.get("ezdrummer").unwrap();
        let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
        let report = convert(&midi, &mapping, ChannelScope::Auto)
            .map(|c| c.done().expect("converted"))
            .unwrap()
            .report;
        let missed = SourceFit::of(&hits, src)
            .missed()
            .expect("the file has hits");
        let unmapped: u32 = report.unmapped_source().map(|(_, u)| u.hits).sum();
        assert_eq!(
            (missed.whole(), missed.part()),
            (report.loss().read(), unmapped)
        );
    }
}
