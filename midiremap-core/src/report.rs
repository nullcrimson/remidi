use std::collections::BTreeMap;

use serde::Serialize;

use crate::{canon::Canon, note::Note, resolution::Outcome};

/// How a drum the target lacks was played: on which stand-in drum, on which note, how often.
#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct FallbackTally {
    pub stand_in: Canon,
    pub note: Note,
    pub count: u32,
}

/// What a conversion did with each note hit; only the converter tallies it.
#[derive(Default, Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Report {
    #[serde(serialize_with = "Note::text_keys")]
    #[cfg_attr(feature = "ts", tsify(type = "Record<Note, number>"))]
    unmapped_source: BTreeMap<Note, u32>,
    fallback_used: BTreeMap<Canon, FallbackTally>,
    dropped: BTreeMap<Canon, u32>,
    untouched: u32,
    converted: u32,
}

impl Report {
    /// Hits on source notes the source engine does not map, by note, ascending.
    pub fn unmapped_source(&self) -> impl Iterator<Item = (Note, u32)> + '_ {
        self.unmapped_source
            .iter()
            .map(|(&note, &count)| (note, count))
    }

    /// Hits played on a stand-in because the target lacks the drum, by drum, in drum order.
    pub fn fallback_used(&self) -> impl Iterator<Item = (Canon, &FallbackTally)> {
        self.fallback_used
            .iter()
            .map(|(&canon, tally)| (canon, tally))
    }

    /// Hits left out because nothing on the target may play them, by drum, in drum order.
    pub fn dropped(&self) -> impl Iterator<Item = (Canon, u32)> + '_ {
        self.dropped.iter().map(|(&canon, &count)| (canon, count))
    }

    /// Note hits left as they were because the channel scope did not select them.
    pub fn untouched(&self) -> u32 {
        self.untouched
    }

    /// Note hits written to the output, directly or on a substitute.
    pub fn converted(&self) -> u32 {
        self.converted
    }

    /// Every note hit the conversion saw: converted, dropped, unmapped or untouched.
    pub fn hits(&self) -> u32 {
        self.converted
            + self.dropped.values().sum::<u32>()
            + self.unmapped_source.values().sum::<u32>()
            + self.untouched
    }

    pub(crate) fn record_untouched(&mut self) {
        self.untouched += 1;
    }

    /// Tallies one source hit; direct hits only count as converted.
    pub(crate) fn record(&mut self, source_note: Note, outcome: Option<Outcome>) {
        match outcome {
            None => *self.unmapped_source.entry(source_note).or_default() += 1,
            Some(Outcome::Fallback {
                canon,
                stand_in,
                note,
                ..
            }) => {
                self.converted += 1;
                self.fallback_used
                    .entry(canon)
                    .or_insert(FallbackTally {
                        stand_in,
                        note,
                        count: 0,
                    })
                    .count += 1
            }
            Some(Outcome::Dropped { canon, .. }) => *self.dropped.entry(canon).or_default() += 1,
            Some(Outcome::Direct { .. }) => self.converted += 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, HatOpen, HatZone, KickKind, SnareArtic},
        note::n,
    };

    fn open3() -> Canon {
        Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain)
    }

    fn snare() -> Canon {
        Canon::Snare(idx(1), SnareArtic::Hit)
    }

    fn tallied_report() -> Report {
        let (open3, snare) = (open3(), snare());
        let mut r = Report::default();
        r.record(n(99), None);
        r.record(
            n(11),
            Some(Outcome::Fallback {
                canon: open3,
                stand_in: Canon::Hat(HatOpen::Closed, HatZone::Plain),
                note: n(60),
                other_drum: false,
            }),
        );
        r.record(
            n(10),
            Some(Outcome::Dropped {
                canon: snare,
                other_drum: false,
            }),
        );
        r.record(
            n(12),
            Some(Outcome::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50),
            }),
        );
        r
    }

    #[test]
    fn report_tallies_an_unmapped_note() {
        let r = tallied_report();
        assert_eq!(r.unmapped_source().collect::<Vec<_>>(), [(n(99), 1)]);
    }

    #[test]
    fn report_tallies_a_fallback() {
        let r = tallied_report();
        assert_eq!(
            r.fallback_used().collect::<Vec<_>>(),
            [(
                open3(),
                &FallbackTally {
                    stand_in: Canon::Hat(HatOpen::Closed, HatZone::Plain),
                    note: n(60),
                    count: 1
                }
            )]
        );
    }

    #[test]
    fn a_fallback_tally_serializes_its_stand_in_in_camel_case() {
        let r = tallied_report();
        let json = serde_json::to_value(&r).unwrap();
        assert_eq!(
            json["fallbackUsed"]["hat.open3"],
            serde_json::json!({ "standIn": "hat.closed", "note": 60, "count": 1 })
        );
    }

    #[test]
    fn report_tallies_a_dropped_drum() {
        let r = tallied_report();
        assert_eq!(r.dropped().collect::<Vec<_>>(), [(snare(), 1)]);
    }

    #[test]
    fn report_counts_direct_and_fallback_hits_as_converted() {
        let r = tallied_report();
        assert_eq!(r.converted(), 2);
    }

    #[test]
    fn recorded_hits_are_not_untouched() {
        let r = tallied_report();
        assert_eq!(r.untouched(), 0);
    }

    #[test]
    fn report_counts_an_untouched_event() {
        let mut r = tallied_report();
        r.record_untouched();
        assert_eq!(r.untouched(), 1);
    }

    #[test]
    fn report_hits_count_every_recorded_event() {
        let mut r = tallied_report();
        r.record_untouched();
        assert_eq!(r.hits(), 5);
    }

    #[test]
    fn report_serializes_sorted_with_string_note_keys() {
        let mut r = Report::default();
        for note in [99, 5, 12, 5] {
            r.record(n(note), None);
        }
        for key in ["splash.1.hit", "china.1.hit"] {
            r.record(
                n(1),
                Some(Outcome::Dropped {
                    canon: key.parse().unwrap(),
                    other_drum: false,
                }),
            );
        }
        assert_eq!(
            serde_json::to_string(&r).unwrap(),
            r#"{"unmappedSource":{"5":2,"12":1,"99":1},"fallbackUsed":{},"dropped":{"china.1.hit":1,"splash.1.hit":1},"untouched":0,"converted":0}"#
        );
    }
}
