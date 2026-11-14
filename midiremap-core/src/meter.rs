use std::{fmt, num::NonZeroU32};

use midly::{MetaMessage, Smf, Timing, TrackEvent, TrackEventKind};
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

/// A moment of a track, in ticks from its start.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default, Serialize)]
#[serde(transparent)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct Tick(u32);

impl Tick {
    /// Tick `n`, for tests.
    #[cfg(test)]
    pub(crate) fn at(n: u32) -> Self {
        Self(n)
    }

    /// The ticks from `start` to this moment; none when `start` comes later.
    fn since(self, start: Self) -> u32 {
        self.0.saturating_sub(start.0)
    }
}

impl fmt::Display for Tick {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// Each event of `track` with the tick it happens at.
pub(crate) fn ticks<'t, 'a>(
    track: &'t [TrackEvent<'a>],
) -> impl Iterator<Item = (Tick, &'t TrackEvent<'a>)> {
    track.iter().scan(Tick::default(), |tick, ev| {
        *tick = Tick(tick.0.saturating_add(ev.delta.as_int()));
        Some((*tick, ev))
    })
}

/// Where in a file something happens: its bar, or its tick in a file that has no bars (one
/// timed in SMPTE frames, or with a zero division).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Position {
    Bar(Bar),
    Tick(Tick),
}

/// A time signature from its first tick on, by the ticks of one of its bars.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Signature {
    start: Tick,
    bar: NonZeroU32,
}

impl Signature {
    /// The bars it begins before `end`, a bar that `end` cuts short counting as one.
    fn bars_before(self, end: Tick) -> u32 {
        end.since(self.start).div_ceil(self.bar.get())
    }

    /// The whole bars from its start to `tick`.
    fn whole_bars_to(self, tick: Tick) -> u32 {
        tick.since(self.start) / self.bar.get()
    }
}

/// The time signatures of a file, which turn its ticks into bars.
pub(crate) enum Meter {
    /// A file with no bars: timed in SMPTE frames, or with a zero division.
    Unbarred,
    /// Bars of `first` from tick 0, then of each of `changes`, in order.
    Barred {
        first: NonZeroU32,
        changes: Vec<Signature>,
    },
}

const FOUR_FOUR: (u8, u8) = (4, 2);
const QUARTERS_PER_WHOLE: u32 = 4;

impl Meter {
    pub(crate) fn new(smf: &Smf) -> Self {
        let Timing::Metrical(per_quarter) = smf.header.timing else {
            return Self::Unbarred;
        };
        let per_quarter = u32::from(per_quarter.as_int());
        let bar_ticks = |(numerator, power): (u8, u8)| {
            let whole = per_quarter * QUARTERS_PER_WHOLE * u32::from(numerator);
            1u32.checked_shl(u32::from(power))
                .and_then(|denominator| NonZeroU32::new(whole / denominator))
        };
        let Some(first) = bar_ticks(FOUR_FOUR) else {
            return Self::Unbarred;
        };
        let mut changes: Vec<Signature> = smf
            .tracks
            .iter()
            .flat_map(|track| ticks(track))
            .filter_map(|(start, ev)| match ev.kind {
                TrackEventKind::Meta(MetaMessage::TimeSignature(numerator, power, ..)) => {
                    bar_ticks((numerator, power)).map(|bar| Signature { start, bar })
                }
                TrackEventKind::Midi { .. }
                | TrackEventKind::SysEx(_)
                | TrackEventKind::Escape(_)
                | TrackEventKind::Meta(_) => None,
            })
            .collect();
        changes.sort_by_key(|signature| signature.start);
        Self::Barred { first, changes }
    }

    /// Where `tick` falls: a bar that a signature change cuts short still counts as a bar.
    pub(crate) fn position(&self, tick: Tick) -> Position {
        let Self::Barred { first, changes } = self else {
            return Position::Tick(tick);
        };
        let mut current = Signature {
            start: Tick::default(),
            bar: *first,
        };
        let mut whole = 0u32;
        for &next in changes.iter().take_while(|next| next.start <= tick) {
            whole = whole.saturating_add(current.bars_before(next.start));
            current = next;
        }
        Position::Bar(Bar::after(
            whole.saturating_add(current.whole_bars_to(tick)),
        ))
    }
}

#[cfg(test)]
mod tests {
    use midly::{
        num::{u15, u28},
        Format, Fps, Header, Track,
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
        Meter::new(smf).position(Tick(tick))
    }

    fn nth(n: u32) -> Position {
        Position::Bar(Bar::number(n))
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
        assert_eq!(bar(1234, &smf), Position::Tick(Tick(1234)));
    }
}
