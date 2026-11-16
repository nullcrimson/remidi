use std::collections::BTreeMap;

use midiremap_kit::canon::Canon;
use midiremap_mapping::Outcome;
use midiremap_note::Note;
use serde::Serialize;

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

/// What became of the hits on a note the source does not recognize: removed, or kept on its
/// number, where the target plays no drum or the drum it names.
#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum UnmappedFate {
    Removed,
    KeptFree,
    KeptOnto(Canon),
}

/// The hits on a note the source does not recognize, and what became of them.
#[derive(Serialize, Debug, PartialEq, Eq, Clone, Copy)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub struct Unmapped {
    pub hits: u32,
    pub fate: UnmappedFate,
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
    #[cfg_attr(feature = "ts", tsify(type = "Record<Note, Unmapped>"))]
    unmapped_source: BTreeMap<Note, Unmapped>,
    fallback_used: BTreeMap<Canon, FallbackTally>,
    dropped: BTreeMap<Canon, u32>,
    untouched: u32,
    converted: u32,
}

impl Report {
    /// Hits on source notes the source engine does not map, with what became of them, by
    /// note, ascending.
    pub fn unmapped_source(&self) -> impl Iterator<Item = (Note, &Unmapped)> {
        self.unmapped_source
            .iter()
            .map(|(&note, unmapped)| (note, unmapped))
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
            + self.unmapped_source.values().map(|u| u.hits).sum::<u32>()
            + self.untouched
    }

    pub(crate) fn record_untouched(&mut self) {
        self.untouched += 1;
    }

    /// Tallies one hit on `note`, which the source does not recognize and whose hits all
    /// meet `fate`.
    pub(crate) fn record_unmapped(&mut self, note: Note, fate: UnmappedFate) {
        self.unmapped_source
            .entry(note)
            .or_insert(Unmapped { hits: 0, fate })
            .hits += 1;
    }

    /// Tallies one hit on a source note the source recognizes, by where its drum lands.
    pub(crate) fn record(&mut self, outcome: Outcome) {
        match outcome {
            fallback @ Outcome::Fallback(s) => {
                let (canon, stand_in, note) = (fallback.canon(), s.stand_in(), s.note());
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
            Outcome::Dropped { canon, .. } => *self.dropped.entry(canon).or_default() += 1,
            Outcome::Direct(_) => self.converted += 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use midiremap_kit::canon::k;
    use midiremap_mapping::{Landing, StandIn};
    use midiremap_note::n;

    use super::*;

    fn open3() -> Canon {
        k("hat.open3")
    }

    fn snare() -> Canon {
        k("snare1.hit")
    }

    fn tallied_report() -> Report {
        let (open3, snare) = (open3(), snare());
        let mut r = Report::default();
        r.record_unmapped(n(99), UnmappedFate::Removed);
        r.record(Outcome::Fallback(StandIn::new(
            open3,
            open3,
            k("hat.closed"),
            n(60),
        )));
        r.record(Outcome::Dropped {
            canon: snare,
            other_drum: false,
        });
        r.record(Outcome::Direct(Landing::itself(k("kick.main"), n(50))));
        r
    }

    #[test]
    fn report_tallies_an_unmapped_note() {
        let r = tallied_report();
        assert_eq!(
            r.unmapped_source().collect::<Vec<_>>(),
            [(
                n(99),
                &Unmapped {
                    hits: 1,
                    fate: UnmappedFate::Removed
                }
            )]
        );
    }

    #[test]
    fn report_tallies_a_fallback() {
        let r = tallied_report();
        assert_eq!(
            r.fallback_used().collect::<Vec<_>>(),
            [(
                open3(),
                &FallbackTally {
                    stand_in: k("hat.closed"),
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
        let kick = UnmappedFate::KeptOnto(k("kick.main"));
        for (note, fate) in [
            (99, UnmappedFate::Removed),
            (5, kick),
            (12, UnmappedFate::KeptFree),
            (5, kick),
        ] {
            r.record_unmapped(n(note), fate);
        }
        for key in ["splash.1.hit", "china.1.hit"] {
            r.record(Outcome::Dropped {
                canon: key.parse().unwrap(),
                other_drum: false,
            });
        }
        assert_eq!(
            serde_json::to_string(&r).unwrap(),
            r#"{"unmappedSource":{"5":{"hits":2,"fate":{"keptOnto":"kick.main"}},"12":{"hits":1,"fate":"keptFree"},"99":{"hits":1,"fate":"removed"}},"fallbackUsed":{},"dropped":{"china.1.hit":1,"splash.1.hit":1},"untouched":0,"converted":0}"#
        );
    }
}
