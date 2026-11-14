use std::{cmp::Reverse, iter::Sum, ops::AddAssign};

use serde::Serialize;

use crate::{
    canon::Canon,
    catalog::Catalog,
    channel::{auto_choice, part_hits, track_names, AutoChoice, ChannelScope, Part},
    engine_map::{EngineId, EngineMap},
    midi::{self, CodecError, Parsed},
    note::Note,
};

/// How many hits each note has among the note-ons a conversion reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoteHits([u32; Note::COUNT]);

impl Default for NoteHits {
    fn default() -> Self {
        Self([0; Note::COUNT])
    }
}

impl NoteHits {
    fn get(&self, note: Note) -> u32 {
        self.0[note.index()]
    }

    fn total(&self) -> u32 {
        self.0.iter().sum()
    }

    fn recognized_by(&self, engine: &EngineMap) -> u32 {
        engine.decodings().map(|(note, _)| self.get(note)).sum()
    }

    fn played_on(&self, engine: &EngineMap) -> Plays {
        let mut drums: Vec<PlayedDrum> = Vec::new();
        let mut unknown = 0;
        for note in Note::ALL.into_iter().filter(|&n| self.get(n) > 0) {
            let hits = self.get(note);
            match engine.decode(note) {
                Some(canon) => match drums.iter_mut().find(|d| d.canon == canon) {
                    Some(drum) => drum.hits += hits,
                    None => drums.push(PlayedDrum { canon, hits }),
                },
                None => unknown += hits,
            }
        }
        drums.sort_by_key(|d| Reverse(d.hits));
        Plays { drums, unknown }
    }
}

impl AddAssign<&Self> for NoteHits {
    fn add_assign(&mut self, other: &Self) {
        for (mine, theirs) in self.0.iter_mut().zip(other.0) {
            *mine += theirs;
        }
    }
}

impl Sum for NoteHits {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::default(), |mut total, hits| {
            total += &hits;
            total
        })
    }
}

/// The hits on each note among the note-ons a conversion with `scope` rewrites in `midi`.
pub fn note_hits(midi: &[u8], scope: ChannelScope) -> Result<NoteHits, CodecError> {
    let smf = midi::parse(midi)?.smf;
    let mut hits = NoteHits::default();
    for note in scope.hit_notes(&smf) {
        hits.0[note.index()] += 1;
    }
    Ok(hits)
}

/// One drum a part plays as a source layout, and how many hits it gets.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub struct PlayedDrum {
    pub canon: Canon,
    pub hits: u32,
}

/// What a part's hits play as a source layout.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub struct Plays {
    /// The drums its notes decode to, most hits first.
    pub drums: Vec<PlayedDrum>,
    /// Hits on notes the layout does not know.
    pub unknown: u32,
}

/// One part of a file as a user picks drum parts by: its track's name, its hits, and what
/// they play as the source once a source is known.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub struct PartSummary {
    pub part: Part,
    pub track_name: Option<String>,
    pub hits: u32,
    pub plays: Option<Plays>,
}

/// Every part of `midi` with hits, in track and channel order, each played as `source` when
/// one is given.
pub fn part_summaries(
    midi: &[u8],
    source: Option<&EngineMap>,
) -> Result<Vec<PartSummary>, CodecError> {
    Ok(summaries(&midi::parse(midi)?, source))
}

/// The parts of `midi`, as [`part_summaries`] gives them, when `Auto` would ask which are the
/// drums; `None` when it converts without asking.
pub fn auto_question(
    midi: &[u8],
    source: Option<&EngineMap>,
) -> Result<Option<Vec<PartSummary>>, CodecError> {
    let parsed = midi::parse(midi)?;
    Ok(match auto_choice(&parsed.smf) {
        AutoChoice::Ask(_) => Some(summaries(&parsed, source)),
        AutoChoice::Picked { .. } => None,
    })
}

fn summaries(parsed: &Parsed, source: Option<&EngineMap>) -> Vec<PartSummary> {
    let names = track_names(&parsed.smf);
    part_hits(&parsed.smf)
        .into_iter()
        .map(|(part, notes)| {
            let mut hits = NoteHits::default();
            for note in notes {
                hits.0[note.index()] += 1;
            }
            PartSummary {
                part,
                track_name: names[part.track.index()].clone(),
                hits: hits.total(),
                plays: source.map(|engine| hits.played_on(engine)),
            }
        })
        .collect()
}

/// How many of the hits one engine's layout recognizes.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct SourceFit {
    engine: EngineId,
    recognized: u32,
}

impl SourceFit {
    pub fn engine(&self) -> &EngineId {
        &self.engine
    }

    /// The hits on notes the engine's map decodes: the ones converting from it keeps.
    pub fn recognized(&self) -> u32 {
        self.recognized
    }
}

/// Every engine of a catalog fitted to the same hits, best first; no engine recognizes more
/// than `hits`.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct SourceFits {
    hits: u32,
    ranked: Vec<SourceFit>,
}

impl SourceFits {
    /// Every hit, on any note.
    pub fn hits(&self) -> u32 {
        self.hits
    }

    /// The fits, best first: the most recognized hits, ties in catalog order.
    pub fn ranked(&self) -> &[SourceFit] {
        &self.ranked
    }
}

/// Every engine of `catalog` fitted to `hits`, best first: the most recognized hits, ties in
/// catalog order.
pub fn source_fits(catalog: &Catalog, hits: &NoteHits) -> SourceFits {
    let mut ranked: Vec<SourceFit> = catalog
        .engines()
        .map(|engine| SourceFit {
            engine: engine.into(),
            recognized: hits.recognized_by(engine),
        })
        .collect();
    ranked.sort_by_key(|fit| Reverse(fit.recognized));
    SourceFits {
        hits: hits.total(),
        ranked,
    }
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, engine_json, off, on, silent_on, tracks, DRUMS};

    use super::*;
    use crate::{
        channel::Channel, conversion::convert, note::n, overrides::Overrides,
        resolution::MissingDrums, translate::Mapping,
    };

    fn hits_of(midi: &[u8], scope: ChannelScope) -> Vec<(u8, u32)> {
        let hits = note_hits(midi, scope).unwrap();
        Note::ALL
            .into_iter()
            .filter(|&note| hits.get(note) > 0)
            .map(|note| (note.get(), hits.get(note)))
            .collect()
    }

    #[test]
    fn note_hits_counts_each_note_on_with_a_velocity() {
        let midi = drums(&[
            (0, on(36)),
            (10, off(36)),
            (0, on(36)),
            (10, silent_on(36)),
            (0, on(38)),
        ]);
        assert_eq!(hits_of(&midi, ChannelScope::Auto), [(36, 2), (38, 1)]);
    }

    fn drum_track_and_bass_track() -> Vec<u8> {
        tracks(&[&[(0, DRUMS, on(36)), (10, 1, on(38))], &[(0, 1, on(40))]])
    }

    #[test]
    fn note_hits_reads_only_the_parts_auto_converts() {
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), ChannelScope::Auto),
            [(36, 1)]
        );
    }

    #[test]
    fn a_part_summary_names_its_track_and_what_its_hits_play_as_the_source() {
        let mut bytes = tracks(&[&[
            (0, 1, on(36)),
            (0, 1, on(36)),
            (0, 1, on(38)),
            (0, 1, on(3)),
        ]]);
        let named = midly::Smf::parse(&bytes).unwrap();
        let mut named = named.to_static();
        named.tracks[0].insert(
            0,
            midly::TrackEvent {
                delta: midly::num::u28::new(0),
                kind: midly::TrackEventKind::Meta(midly::MetaMessage::TrackName(b" Kit ")),
            },
        );
        bytes.clear();
        named.write_std(&mut bytes).unwrap();
        let gm = Catalog::builtin();
        let summaries = part_summaries(&bytes, gm.get("general_midi")).unwrap();
        assert_eq!(summaries.len(), 1);
        let kit = &summaries[0];
        assert_eq!(
            (kit.part.to_string(), kit.track_name.as_deref(), kit.hits),
            ("1:1".to_owned(), Some("Kit"), 4)
        );
        let plays = kit.plays.as_ref().unwrap();
        let drums: Vec<(String, u32)> = plays
            .drums
            .iter()
            .map(|d| (d.canon.to_string(), d.hits))
            .collect();
        assert_eq!(
            drums,
            [("kick.main".to_owned(), 2), ("snare1.hit".to_owned(), 1)]
        );
        assert_eq!(plays.unknown, 1);
        assert!(part_summaries(&bytes, None).unwrap()[0].plays.is_none());
    }

    #[test]
    fn auto_question_lists_the_parts_only_of_a_file_auto_asks_about() {
        let asked = tracks(&[&[(0, 1, on(36))], &[(0, 2, on(38))]]);
        let parts: Vec<String> = auto_question(&asked, None)
            .unwrap()
            .unwrap()
            .iter()
            .map(|s| s.part.to_string())
            .collect();
        assert_eq!(parts, ["1:1", "2:2"]);
        let drums = tracks(&[&[(0, DRUMS, on(36)), (0, 1, on(38))]]);
        assert!(auto_question(&drums, None).unwrap().is_none());
    }

    #[test]
    fn note_hits_leaves_out_a_file_auto_must_ask_about() {
        let midi = tracks(&[&[(0, 1, on(36))], &[(0, 2, on(38))]]);
        assert_eq!(hits_of(&midi, ChannelScope::Auto), []);
    }

    #[test]
    fn note_hits_reads_only_the_channel_a_scope_names() {
        let one = ChannelScope::Only(Channel::new(1).unwrap());
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), one),
            [(38, 1), (40, 1)]
        );
    }

    #[test]
    fn note_hits_of_a_file_that_does_not_parse_is_an_error() {
        assert!(note_hits(b"garbage", ChannelScope::Auto).is_err());
    }

    #[test]
    fn note_hits_add_up_note_by_note() {
        let a = note_hits(&drums(&[(0, on(36)), (0, on(38))]), ChannelScope::Auto).unwrap();
        let b = note_hits(&drums(&[(0, on(36))]), ChannelScope::Auto).unwrap();
        let sum: NoteHits = [a, b].into_iter().sum();
        assert_eq!((sum.get(n(36)), sum.get(n(38)), sum.total()), (2, 1, 3));
    }

    fn engine(id: &str, notes: &[u8]) -> EngineMap {
        let canons = ["kick.main", "snare1.hit", "hat.closed"];
        let notes: Vec<(u8, &str)> = notes.iter().copied().zip(canons).collect();
        EngineMap::from_json(&engine_json(id, &notes).to_string()).unwrap()
    }

    fn ranked(catalog: &Catalog, midi: &[u8]) -> (u32, Vec<(String, u32)>) {
        let fits = source_fits(catalog, &note_hits(midi, ChannelScope::Auto).unwrap());
        let ranked = fits
            .ranked()
            .iter()
            .map(|fit| (fit.engine().as_str().to_owned(), fit.recognized()))
            .collect();
        (fits.hits(), ranked)
    }

    fn three_engines() -> Catalog {
        Catalog::from_maps([
            engine("a_partial", &[36]),
            engine("b_none", &[60]),
            engine("c_full", &[36, 38, 42]),
            engine("d_partial", &[36, 61]),
        ])
        .unwrap()
    }

    #[test]
    fn source_fits_rank_engines_by_the_hits_they_recognize_ties_in_catalog_order() {
        let midi = drums(&[(0, on(36)), (0, on(36)), (0, on(38)), (0, on(42))]);
        assert_eq!(
            ranked(&three_engines(), &midi),
            (
                4,
                vec![
                    ("c_full".to_owned(), 4),
                    ("a_partial".to_owned(), 2),
                    ("d_partial".to_owned(), 2),
                    ("b_none".to_owned(), 0),
                ]
            )
        );
    }

    #[test]
    fn source_fits_agree_with_what_converting_removes_as_unrecognized() {
        let midi = tracks(&[
            &[(0, DRUMS, on(24)), (0, DRUMS, on(99)), (0, DRUMS, on(99))],
            &[(0, 1, on(26))],
        ]);
        let catalog = Catalog::builtin();
        let hits = note_hits(&midi, ChannelScope::Auto).unwrap();
        let src = catalog.get("ggd_invasion").unwrap();
        let tgt = catalog.get("ezdrummer").unwrap();
        let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
        let report = convert(&midi, &mapping, ChannelScope::Auto, None)
            .map(|c| c.done().expect("converted"))
            .unwrap()
            .report;
        let fits = source_fits(&catalog, &hits);
        let fit = fits
            .ranked()
            .iter()
            .find(|fit| fit.engine().as_str() == "ggd_invasion")
            .unwrap();
        let unmapped: u32 = report.unmapped_source().map(|(_, count)| count).sum();
        assert_eq!(
            (fits.hits(), fits.hits() - fit.recognized()),
            (report.hits() - report.untouched(), unmapped)
        );
    }
}
