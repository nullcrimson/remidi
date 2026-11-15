use serde::Serialize;

use super::hits::NoteHits;
use crate::{
    canon::Canon,
    engine::EngineMap,
    midi::{self, CodecError},
    parts::{choose, ChannelScope, Choice, Part, PartIndex, Selection},
};

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

/// The parts of `midi`, as [`part_summaries`] gives them, when `Auto` would ask which are the
/// drums; `None` when it converts without asking.
pub fn auto_question(
    midi: &[u8],
    source: Option<&EngineMap>,
) -> Result<Option<Vec<PartSummary>>, CodecError> {
    let index = PartIndex::of(midi::parse(midi)?.smf());
    let auto = Selection::from(ChannelScope::Auto);
    Ok(match choose(&index, &auto) {
        Ok(Choice::Ask(_)) => Some(summaries(&index, source, |_| true)),
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
    use midiremap_testkit::{on, tracks, DRUMS};

    use super::*;
    use crate::engine::Catalog;

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
}
