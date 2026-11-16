use std::collections::BTreeSet;

use midiremap_note::Note;
use serde::Serialize;

use super::{
    part::{Part, PartSet, Parts},
    scan::PartIndex,
    selection::{ChannelScope, Selection},
};
use crate::midi::{Channel, ChannelFilter, TrackNo};

/// One filter per track of the file it was made for, in track order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrackFilters(Vec<ChannelFilter>);

impl TrackFilters {
    fn uniform(index: &PartIndex, filter: ChannelFilter) -> Self {
        Self(vec![filter; index.tracks()])
    }

    /// Accepting in each track of `index`'s file the channels `parts` names in it, every one of
    /// which has hits in the file.
    fn of<'p>(index: &PartIndex, parts: impl IntoIterator<Item = &'p Part>) -> Self {
        let mut filters = vec![ChannelFilter::NONE; index.tracks()];
        for part in parts {
            let filter = &mut filters[part.track.index()];
            *filter = filter.with(part.channel);
        }
        Self(filters)
    }

    /// Whether it accepts `part`, a part with hits in its file.
    fn accepts(&self, part: Part) -> bool {
        self.0[part.track.index()].accepts(part.channel)
    }
}

impl IntoIterator for TrackFilters {
    type Item = ChannelFilter;
    type IntoIter = std::vec::IntoIter<ChannelFilter>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

/// What a conversion does with a hit on a note, as its caller knows it: plays it, drops it
/// since the target has no drum for it, or meets a note the source does not know.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitFate {
    Played,
    Dropped,
    Unknown,
}

/// Why `Auto` asks which parts of a file are the drums.
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum AskReason {
    /// Several parts have hits, none on channel 10.
    NoChannelTen,
    /// Channel 10 has hits on notes the source knows, the conversion drops every one of them
    /// (`dropped` hits), and other parts have hits.
    ChannelTenUnplayed { dropped: u32 },
}

/// What a selection comes to for one file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Choice {
    /// Rewrites what `filters` accept, which are the parts with hits in `picked`; leaves
    /// `offers` as they are: parts beside channel-10 hits in their track that nothing says
    /// are drums.
    Convert {
        filters: TrackFilters,
        picked: PartSet,
        offers: PartSet,
    },
    /// Rewrites nothing: these parts have hits, and for the reason `why` only the user can
    /// tell which are the drums.
    Ask { parts: Parts, why: AskReason },
}

/// How many hits of `parts` are on notes `judge` knows, when there is one and the conversion
/// plays none of them: every hit on a known note is dropped.
fn all_dropped(index: &PartIndex, parts: &PartSet, judge: impl Fn(Note) -> HitFate) -> Option<u32> {
    let mut dropped = 0;
    for fate in index.notes_in(parts).map(judge) {
        match fate {
            HitFate::Played => return None,
            HitFate::Dropped => dropped += 1,
            HitFate::Unknown => {}
        }
    }
    (dropped > 0).then_some(dropped)
}

/// What `selection` rewrites in `index`'s file, or the picked part the file has no hit in.
/// `Auto` takes every channel-10 part when the file has one, offering the other parts of their
/// tracks; else its one part with hits; else it asks. It also asks, listing every part, when
/// channel 10 has hits on notes the source knows, the conversion plays none of them, and other
/// parts have hits: the drums are likely elsewhere. `judge` tells what the conversion does
/// with a hit on each note.
pub fn choose(
    index: &PartIndex,
    selection: &Selection,
    judge: impl Fn(Note) -> HitFate,
) -> Result<Choice, Part> {
    let present = index.parts();
    let (filters, offers) = match selection {
        Selection::Parts(parts) => match parts.iter().find(|p| !present.contains(p)) {
            Some(&missing) => return Err(missing),
            None => (TrackFilters::of(index, parts.iter()), PartSet::new()),
        },
        Selection::Scope(ChannelScope::All) => (
            TrackFilters::uniform(index, ChannelFilter::ALL),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Only(channel)) => (
            TrackFilters::uniform(index, ChannelFilter::NONE.with(*channel)),
            PartSet::new(),
        ),
        Selection::Scope(ChannelScope::Auto) => {
            let (drums, others): (PartSet, PartSet) =
                present.iter().partition(|p| p.channel == Channel::DRUMS);
            if drums.is_empty() && others.len() > 1 {
                return Ok(Choice::Ask {
                    parts: Parts::from_set(others),
                    why: AskReason::NoChannelTen,
                });
            }
            let unplayed = all_dropped(index, &drums, &judge).filter(|_| !others.is_empty());
            if let Some(dropped) = unplayed {
                return Ok(Choice::Ask {
                    parts: Parts::from_set(present),
                    why: AskReason::ChannelTenUnplayed { dropped },
                });
            }
            let drum_tracks: BTreeSet<TrackNo> = drums.iter().map(|p| p.track).collect();
            let (offers, alone): (PartSet, PartSet) = others
                .into_iter()
                .partition(|p| drum_tracks.contains(&p.track));
            let picked = if drums.is_empty() { alone } else { drums };
            (TrackFilters::of(index, &picked), offers)
        }
    };
    let picked = present
        .into_iter()
        .filter(|&p| filters.accepts(p))
        .collect();
    Ok(Choice::Convert {
        filters,
        picked,
        offers,
    })
}

/// The note of every hit of `index`'s file that a conversion with `selection` rewrites; none
/// when it would ask, for any reason, judging every note played: no mapping is known while a
/// source is being fitted. The notes come part by part, in part order, not in file order: the
/// only reader, `note_hits`, counts them per note, which no order changes.
pub fn hit_notes(index: &PartIndex, selection: &Selection) -> Result<Vec<Note>, Part> {
    let Choice::Convert { picked, .. } = choose(index, selection, |_| HitFate::Played)? else {
        return Ok(Vec::new());
    };
    Ok(index.notes_in(&picked).collect())
}

#[cfg(test)]
mod tests {
    use midiremap_note::n;
    use midiremap_testkit::{on, tracks, DRUMS};

    use super::*;
    use crate::midi;

    const BASS: u8 = 1;
    const KICK: u8 = 36;
    const TAMBOURINE: u8 = 54;
    const STRANGER: u8 = 99;

    /// Plays the kick, drops the tambourine, and knows no other note.
    fn judge(note: Note) -> HitFate {
        if note == n(KICK) {
            HitFate::Played
        } else if note == n(TAMBOURINE) {
            HitFate::Dropped
        } else {
            HitFate::Unknown
        }
    }

    fn chosen(midi: &[u8], selection: &Selection, judge: impl Fn(Note) -> HitFate) -> Choice {
        let index = PartIndex::of(midi::parse(midi).unwrap().smf());
        choose(&index, selection, judge).unwrap()
    }

    fn auto(midi: &[u8], judge: impl Fn(Note) -> HitFate) -> Choice {
        chosen(midi, &ChannelScope::Auto.into(), judge)
    }

    fn names<'p>(parts: impl IntoIterator<Item = &'p Part>) -> Vec<String> {
        parts.into_iter().map(ToString::to_string).collect()
    }

    fn picked(choice: &Choice) -> Option<Vec<String>> {
        match choice {
            Choice::Convert { picked, .. } => Some(names(picked)),
            Choice::Ask { .. } => None,
        }
    }

    fn kit_beside(drums: &[u8]) -> Vec<u8> {
        let channel_ten: Vec<_> = drums.iter().map(|&key| (0, DRUMS, on(key))).collect();
        tracks(&[&[(0, BASS, on(KICK)), (0, BASS, on(KICK))], &channel_ten])
    }

    #[test]
    fn auto_asks_with_every_part_when_channel_10_plays_none_of_its_known_hits() {
        let choice = auto(&kit_beside(&[TAMBOURINE, STRANGER]), judge);
        let Choice::Ask { parts, why } = choice else {
            panic!("converted: {choice:?}");
        };
        assert_eq!(
            (names(parts.iter()), why),
            (
                vec!["1:1".to_owned(), "2:10".to_owned()],
                AskReason::ChannelTenUnplayed { dropped: 1 }
            )
        );
    }

    #[test]
    fn auto_converts_channel_10_when_it_plays_one_hit() {
        let choice = auto(&kit_beside(&[TAMBOURINE, KICK]), judge);
        assert_eq!(picked(&choice), Some(vec!["2:10".to_owned()]));
    }

    #[test]
    fn auto_converts_channel_10_when_its_hits_are_all_on_notes_the_source_does_not_know() {
        let choice = auto(&kit_beside(&[STRANGER, STRANGER]), judge);
        assert_eq!(picked(&choice), Some(vec!["2:10".to_owned()]));
    }

    #[test]
    fn auto_never_asks_of_a_file_whose_only_parts_are_on_channel_10() {
        let midi = tracks(&[&[(0, DRUMS, on(TAMBOURINE))], &[(0, DRUMS, on(TAMBOURINE))]]);
        let choice = auto(&midi, judge);
        assert_eq!(
            picked(&choice),
            Some(vec!["1:10".to_owned(), "2:10".to_owned()])
        );
    }

    #[test]
    fn auto_with_every_note_played_converts_channel_10_beside_other_parts() {
        let choice = auto(&kit_beside(&[TAMBOURINE]), |_| HitFate::Played);
        assert_eq!(picked(&choice), Some(vec!["2:10".to_owned()]));
    }

    #[test]
    fn auto_with_every_note_played_asks_of_several_parts_without_channel_10() {
        let midi = tracks(&[&[(0, BASS, on(KICK))], &[(0, 2, on(KICK))]]);
        let choice = auto(&midi, |_| HitFate::Played);
        assert!(
            matches!(
                choice,
                Choice::Ask {
                    why: AskReason::NoChannelTen,
                    ..
                }
            ),
            "{choice:?}"
        );
    }

    /// What `selection` picks of a kit beside a tambourine when the judge drops every hit.
    fn picked_dropping_all(selection: impl Into<Selection>) -> Option<Vec<String>> {
        let choice = chosen(&kit_beside(&[TAMBOURINE]), &selection.into(), |_| {
            HitFate::Dropped
        });
        picked(&choice)
    }

    #[test]
    fn all_converts_every_part_whatever_the_judge_says() {
        assert_eq!(
            picked_dropping_all(ChannelScope::All),
            Some(vec!["1:1".to_owned(), "2:10".to_owned()])
        );
    }

    #[test]
    fn one_channel_converts_its_parts_whatever_the_judge_says() {
        assert_eq!(
            picked_dropping_all("10".parse::<ChannelScope>().unwrap()),
            Some(vec!["2:10".to_owned()])
        );
    }

    #[test]
    fn picked_parts_convert_whatever_the_judge_says() {
        let parts = Parts::try_from(vec!["1:1".parse::<Part>().unwrap()]).unwrap();
        assert_eq!(picked_dropping_all(parts), Some(vec!["1:1".to_owned()]));
    }
}
