use std::collections::BTreeMap;

use serde::{Serialize, Serializer};

use crate::{
    canon::Canon,
    note::Note,
    translate::{CanonResolution, Resolution},
};

#[derive(Serialize, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct FallbackTally {
    pub note: Note,
    pub count: u32,
}

/// What a conversion did with each note hit; only the converter tallies it.
#[derive(Default, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Report {
    #[serde(serialize_with = "string_keys")]
    #[cfg_attr(feature = "ts", tsify(type = "Record<string, number>"))]
    unmapped_source: BTreeMap<Note, u32>,
    fallback_used: BTreeMap<Canon, FallbackTally>,
    dropped: BTreeMap<Canon, u32>,
    untouched: u32,
    converted: u32,
}

fn string_keys<S: Serializer>(map: &BTreeMap<Note, u32>, s: S) -> Result<S::Ok, S::Error> {
    s.collect_map(map.iter().map(|(note, count)| (note.to_string(), count)))
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
    pub(crate) fn record(&mut self, source_note: Note, resolution: &Resolution) {
        match resolution {
            Resolution::Unmapped => *self.unmapped_source.entry(source_note).or_default() += 1,
            Resolution::Resolved(CanonResolution::Fallback { canon, note }) => {
                self.converted += 1;
                self.fallback_used
                    .entry(*canon)
                    .or_insert(FallbackTally {
                        note: *note,
                        count: 0,
                    })
                    .count += 1
            }
            Resolution::Resolved(CanonResolution::Dropped { canon }) => {
                *self.dropped.entry(*canon).or_default() += 1
            }
            Resolution::Resolved(CanonResolution::Direct { .. }) => self.converted += 1,
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

    #[test]
    fn report_tallies_each_arm() {
        let open3 = Canon::Hat(HatOpen::Open(idx(3)), HatZone::Plain);
        let snare = Canon::Snare(idx(1), SnareArtic::Hit);
        let mut r = Report::default();
        r.record(n(99), &Resolution::Unmapped);
        r.record(
            n(11),
            &Resolution::Resolved(CanonResolution::Fallback {
                canon: open3,
                note: n(60),
            }),
        );
        r.record(
            n(10),
            &Resolution::Resolved(CanonResolution::Dropped { canon: snare }),
        );
        r.record(
            n(12),
            &Resolution::Resolved(CanonResolution::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(50),
            }),
        );
        assert_eq!(r.unmapped_source().collect::<Vec<_>>(), [(n(99), 1)]);
        assert_eq!(
            r.fallback_used().collect::<Vec<_>>(),
            [(
                open3,
                &FallbackTally {
                    note: n(60),
                    count: 1
                }
            )]
        );
        assert_eq!(r.dropped().collect::<Vec<_>>(), [(snare, 1)]);
        assert_eq!(r.converted(), 2);
        assert_eq!(r.untouched(), 0);
        r.record_untouched();
        assert_eq!(r.untouched(), 1);
        assert_eq!(r.hits(), 5);
    }

    #[test]
    fn report_serializes_sorted_with_string_note_keys() {
        let mut r = Report::default();
        for note in [99, 5, 12, 5] {
            r.record(n(note), &Resolution::Unmapped);
        }
        for key in ["splash.1.hit", "china.1.hit"] {
            r.record(
                n(1),
                &Resolution::Resolved(CanonResolution::Dropped {
                    canon: key.parse().unwrap(),
                }),
            );
        }
        assert_eq!(
            serde_json::to_string(&r).unwrap(),
            r#"{"unmappedSource":{"5":2,"12":1,"99":1},"fallbackUsed":{},"dropped":{"china.1.hit":1,"splash.1.hit":1},"untouched":0,"converted":0}"#
        );
    }
}
