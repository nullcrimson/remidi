use std::{fmt, num::NonZeroUsize};

use midly::{num::u28, MetaMessage, Track, TrackEvent, TrackEventKind};
use serde::{Deserialize, Serialize};

/// A track of a file, numbered from 1 as people count them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "number"))]
pub struct TrackNo(NonZeroUsize);

impl TrackNo {
    pub(crate) fn new(n: NonZeroUsize) -> Self {
        Self(n)
    }

    /// The track a file stores at `index`, counted from zero.
    pub(crate) fn at(index: usize) -> Self {
        Self(NonZeroUsize::MIN.saturating_add(index))
    }

    /// Where a file stores this track, counted from zero.
    pub(crate) fn index(self) -> usize {
        self.0.get() - 1
    }
}

impl fmt::Display for TrackNo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// The event that closes every track of a file.
pub const END_OF_TRACK: TrackEventKind<'static> = TrackEventKind::Meta(MetaMessage::EndOfTrack);

/// Whether `track` ends with its End-of-Track, as a whole track does.
pub fn is_closed(track: &[TrackEvent]) -> bool {
    track.last().is_some_and(|ev| ev.kind == END_OF_TRACK)
}

/// A track of `events` given at their absolute ticks.
///
/// # Panics
///
/// When a tick is below the one before it, or the gap between them does not fit a delta.
pub fn track_at<'a>(events: impl IntoIterator<Item = (u32, TrackEventKind<'a>)>) -> Track<'a> {
    let mut last = 0;
    events
        .into_iter()
        .map(|(tick, kind)| {
            let delta = tick
                .checked_sub(last)
                .and_then(u28::try_from)
                .expect("the ticks never decrease and their gaps fit a delta");
            last = tick;
            TrackEvent { delta, kind }
        })
        .collect()
}
