use midiremap_kit::{
    canon::Canon,
    engine::{EngineId, EngineMap},
};
use midiremap_mapping::{Mapping, Outcome};
use midiremap_note::Note;
use midiremap_smf::{
    midi::{self, CodecError},
    parts::{choose, AskReason, ChannelScope, Choice, HitFate, Part, PartIndex, Selection},
};
use serde::Serialize;

use super::hits::NoteHits;

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
    Ok(summaries(
        &PartIndex::of(midi::parse(midi)?.smf()),
        source,
        |_| true,
    ))
}

/// What a caller knows of the conversion it asks about: nothing, the source layout, or the
/// whole mapping, whose source it reads.
#[derive(Clone, Copy)]
pub enum Known<'m, 'a> {
    Nothing,
    Source(&'a EngineMap),
    Mapping(&'m Mapping<'a>),
}

impl<'a> Known<'_, 'a> {
    fn source(self) -> Option<&'a EngineMap> {
        match self {
            Self::Nothing => None,
            Self::Source(source) => Some(source),
            Self::Mapping(mapping) => Some(mapping.source()),
        }
    }

    /// What a conversion does with a hit on `note`, as far as this tells: played, unless a
    /// mapping says otherwise.
    fn judge(self, note: Note) -> HitFate {
        match self {
            Self::Nothing | Self::Source(_) => HitFate::Played,
            Self::Mapping(mapping) => hit_fate(mapping, note),
        }
    }

    /// Why a question asks, which a choice judged by [`Self::judge`] gave as `why`.
    fn reason(self, why: AskReason) -> QuestionReason {
        match (why, self) {
            (AskReason::NoChannelTen, _) => QuestionReason::NoChannelTen,
            (AskReason::ChannelTenUnplayed { dropped }, Self::Mapping(mapping)) => {
                QuestionReason::ChannelTenUnplayed {
                    dropped,
                    target: EngineId::from(mapping.target()),
                }
            }
            (AskReason::ChannelTenUnplayed { .. }, Self::Nothing | Self::Source(_)) => {
                unreachable!("only a mapping judges a hit dropped")
            }
        }
    }
}

/// What a conversion through `mapping` does with a hit on `note`.
pub(crate) fn hit_fate(mapping: &Mapping, note: Note) -> HitFate {
    match mapping.get(note) {
        None => HitFate::Unknown,
        Some(Outcome::Dropped { .. }) => HitFate::Dropped,
        Some(Outcome::Direct(_) | Outcome::Fallback(_)) => HitFate::Played,
    }
}

/// Why `Auto` asks of a file, as its question tells it: several parts have hits, none on
/// channel 10; or channel 10's `dropped` hits on notes the source knows are all on drums
/// `target` has none for, and other parts have hits.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum QuestionReason {
    NoChannelTen,
    ChannelTenUnplayed { dropped: u32, target: EngineId },
}

/// What `Auto` asks of a file: which of `parts`, each as [`part_summaries`] gives it, are the
/// drums, and why it asks.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(missing_as_null))]
pub struct AutoQuestion {
    pub parts: Vec<PartSummary>,
    pub why: QuestionReason,
}

/// The question `Auto` asks of `midi`, its parts played as the source `known` gives, the same
/// question converting asks when `known` is that conversion's mapping; `None` when it converts
/// without asking.
pub fn auto_question(midi: &[u8], known: Known) -> Result<Option<AutoQuestion>, CodecError> {
    let index = PartIndex::of(midi::parse(midi)?.smf());
    let auto = Selection::from(ChannelScope::Auto);
    Ok(match choose(&index, &auto, |note| known.judge(note)) {
        Ok(Choice::Ask { why, .. }) => Some(AutoQuestion {
            parts: summaries(&index, known.source(), |_| true),
            why: known.reason(why),
        }),
        Ok(Choice::Convert { .. }) | Err(_) => None,
    })
}

/// The parts of `index`'s file with hits that `keep` keeps, in track and channel order, each
/// played as `source` when one is given.
pub(crate) fn summaries(
    index: &PartIndex,
    source: Option<&EngineMap>,
    keep: impl Fn(Part) -> bool,
) -> Vec<PartSummary> {
    index
        .hits()
        .filter(|&(part, _)| keep(part))
        .map(|(part, notes)| {
            let hits: NoteHits = notes.iter().copied().collect();
            PartSummary {
                part,
                track_name: index.track_name(part).map(str::to_owned),
                hits: hits.total(),
                plays: source.map(|engine| hits.played_on(engine)),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use midiremap_kit::engine::Catalog;
    use midiremap_mapping::{MissingDrums, Overrides};
    use midiremap_testkit::{on, tracks, DRUMS};

    use super::*;

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
    }

    #[test]
    fn a_part_summary_without_a_source_plays_nothing() {
        let bytes = tracks(&[&[(0, 1, on(36))]]);
        assert!(part_summaries(&bytes, None).unwrap()[0].plays.is_none());
    }

    #[test]
    fn auto_question_lists_the_parts_only_of_a_file_auto_asks_about() {
        let asked = tracks(&[&[(0, 1, on(36))], &[(0, 2, on(38))]]);
        let question = auto_question(&asked, Known::Nothing).unwrap().unwrap();
        let parts: Vec<String> = question.parts.iter().map(|s| s.part.to_string()).collect();
        assert_eq!(parts, ["1:1", "2:2"]);
        assert_eq!(question.why, QuestionReason::NoChannelTen);
        let drums = tracks(&[&[(0, DRUMS, on(36)), (0, 1, on(38))]]);
        assert!(auto_question(&drums, Known::Nothing).unwrap().is_none());
    }

    #[test]
    fn auto_question_asks_as_converting_does_only_when_it_knows_the_mapping() {
        let midi = tracks(&[&[(0, 1, on(36)), (0, 1, on(38))], &[(0, DRUMS, on(54))]]);
        let catalog = Catalog::builtin();
        let (gm, invasion) = (
            catalog.get("general_midi").unwrap(),
            catalog.get("ggd_invasion").unwrap(),
        );
        let mapping = Mapping::new(gm, invasion, &Overrides::default(), MissingDrums::Nearest);
        let asked = auto_question(&midi, Known::Mapping(&mapping)).unwrap();
        assert_eq!(
            asked.map(|q| (q.parts.len(), q.why)),
            Some((
                2,
                QuestionReason::ChannelTenUnplayed {
                    dropped: 1,
                    target: EngineId::from(invasion)
                }
            ))
        );
        assert!(auto_question(&midi, Known::Source(gm)).unwrap().is_none());
    }
}
