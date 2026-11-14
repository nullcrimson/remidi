use std::{fmt, num::NonZeroU32};

use midly::{MetaMessage, Smf, Timing, TrackEventKind};
use serde::Serialize;

/// A bar of a piece, counted from 1 as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(transparent)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct Bar(NonZeroU32);

impl Bar {
    fn after(whole_bars: u32) -> Self {
        Self(NonZeroU32::MIN.saturating_add(whole_bars))
    }

    /// Bar `n`, counted from 1, for tests.
    #[cfg(test)]
    pub(crate) fn number(n: u32) -> Self {
        Self::after(n - 1)
    }
}

impl fmt::Display for Bar {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// Where in a file something happens: its bar, or its tick in a file timed in SMPTE frames,
/// which has no bars.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Position {
    Bar(Bar),
    Tick(u32),
}

/// The time signatures of a file, which turn its ticks into bars.
pub(crate) struct Meter {
    /// Each signature's first tick and the ticks of one of its bars, in order; empty for a
    /// file timed in SMPTE frames.
    bars: Vec<(u32, u32)>,
}

const FOUR_FOUR: (u8, u8) = (4, 2);

impl Meter {
    pub(crate) fn new(smf: &Smf) -> Self {
        let Timing::Metrical(per_quarter) = smf.header.timing else {
            return Self { bars: Vec::new() };
        };
        let per_quarter = u32::from(per_quarter.as_int());
        let bar_ticks = |(numerator, power): (u8, u8)| {
            let whole = per_quarter * 4 * u32::from(numerator);
            1u32.checked_shl(u32::from(power))
                .map(|denominator| whole / denominator)
                .filter(|&ticks| ticks > 0)
        };
        let mut changes: Vec<(u32, u32)> = smf
            .tracks
            .iter()
            .flat_map(|track| {
                track.iter().scan(0u32, |tick, ev| {
                    *tick = tick.saturating_add(ev.delta.as_int());
                    Some((*tick, ev.kind))
                })
            })
            .filter_map(|(tick, kind)| match kind {
                TrackEventKind::Meta(MetaMessage::TimeSignature(numerator, power, ..)) => {
                    bar_ticks((numerator, power)).map(|ticks| (tick, ticks))
                }
                TrackEventKind::Midi { .. }
                | TrackEventKind::SysEx(_)
                | TrackEventKind::Escape(_)
                | TrackEventKind::Meta(_) => None,
            })
            .collect();
        changes.sort_by_key(|&(tick, _)| tick);
        let first = bar_ticks(FOUR_FOUR).map(|ticks| (0, ticks));
        Self {
            bars: first.into_iter().chain(changes).collect(),
        }
    }

    /// Where `tick` falls: a bar that a signature change cuts short still counts as a bar.
    pub(crate) fn position(&self, tick: u32) -> Position {
        if self.bars.is_empty() {
            return Position::Tick(tick);
        }
        let mut whole = 0u32;
        for (i, &(start, ticks)) in self.bars.iter().enumerate() {
            match self.bars.get(i + 1) {
                Some(&(next, _)) if next <= tick => {
                    whole = whole.saturating_add((next - start).div_ceil(ticks));
                }
                Some(_) | None => {
                    whole = whole.saturating_add((tick - start) / ticks);
                    break;
                }
            }
        }
        Position::Bar(Bar::after(whole))
    }
}

#[cfg(test)]
mod tests {
    use midly::{
        num::{u15, u28},
        Format, Fps, Header, Track, TrackEvent,
    };

    use super::*;

    const PPQ: u32 = 480;

    fn signature(delta: u32, numerator: u8, power: u8) -> TrackEvent<'static> {
        TrackEvent {
            delta: u28::new(delta),
            kind: TrackEventKind::Meta(MetaMessage::TimeSignature(numerator, power, 24, 8)),
        }
    }

    fn metrical(track: Track<'static>) -> Smf<'static> {
        Smf {
            header: Header::new(Format::SingleTrack, Timing::Metrical(u15::new(PPQ as u16))),
            tracks: vec![track],
        }
    }

    fn bar(tick: u32, smf: &Smf) -> Position {
        Meter::new(smf).position(tick)
    }

    fn nth(n: u32) -> Position {
        Position::Bar(Bar::after(n - 1))
    }

    #[test]
    fn a_file_without_a_signature_counts_bars_of_four_quarters() {
        let smf = metrical(Vec::new());
        assert_eq!(bar(0, &smf), nth(1));
        assert_eq!(bar(4 * PPQ - 1, &smf), nth(1));
        assert_eq!(bar(4 * PPQ, &smf), nth(2));
        assert_eq!(bar(10 * 4 * PPQ, &smf), nth(11));
    }

    #[test]
    fn bars_follow_each_time_signature_change() {
        let smf = metrical(vec![signature(0, 3, 2), signature(2 * 3 * PPQ, 7, 3)]);
        assert_eq!(bar(3 * PPQ, &smf), nth(2));
        let seven_eight = 7 * PPQ / 2;
        assert_eq!(bar(2 * 3 * PPQ, &smf), nth(3));
        assert_eq!(bar(2 * 3 * PPQ + seven_eight, &smf), nth(4));
    }

    #[test]
    fn a_bar_a_change_cuts_short_still_counts() {
        let smf = metrical(vec![signature(2 * PPQ, 3, 2)]);
        assert_eq!(bar(2 * PPQ, &smf), nth(2));
    }

    #[test]
    fn a_file_timed_in_frames_has_ticks_not_bars() {
        let smf = Smf {
            header: Header::new(Format::SingleTrack, Timing::Timecode(Fps::Fps25, 40)),
            tracks: vec![Vec::new()],
        };
        assert_eq!(bar(1234, &smf), Position::Tick(1234));
    }
}
