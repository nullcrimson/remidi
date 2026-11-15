use midiremap_kit::canon::{Canon, OpenLevel};
use midiremap_note::Note;
use serde::Serialize;

/// Where a drum lands on the target: on its own note, on the note of the drum that stands
/// in for it, or nowhere. Serialized tagged by `status`, without the drum itself.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize)]
#[serde(
    tag = "status",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub enum Outcome {
    /// The target has the drum, and plays it on its own note or matched to the source's.
    Direct(Landing),
    /// Another drum plays it.
    Fallback(StandIn),
    /// Nothing plays it; `other_drum` when only another drum could have, so the
    /// [`MissingDrums`](super::MissingDrums) setting decided it.
    Dropped {
        #[serde(skip)]
        canon: Canon,
        other_drum: bool,
    },
}

/// The target drum that plays `canon` on `note`: `canon` itself, or the same drum matched to
/// the source's, the main hi-hat at the opening that matches the source's or the same stroke on
/// the target tom the source's toms spread it to.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub struct Landing {
    #[serde(skip)]
    canon: Canon,
    #[serde(skip)]
    plays: Canon,
    note: Note,
}

impl Landing {
    /// `canon` on its own note.
    pub(crate) fn itself(canon: Canon, note: Note) -> Self {
        Self {
            canon,
            plays: canon,
            note,
        }
    }

    /// The open main hi-hat `canon` played at `level` on `note`.
    pub(crate) fn opened_to(canon: Canon, level: OpenLevel, note: Note) -> Self {
        Self {
            canon,
            plays: canon.at_open_level(level),
            note,
        }
    }

    /// `canon` played as `plays`, the stroke a spread moves it to, on `note`.
    pub(crate) fn spread_to(canon: Canon, plays: Canon, note: Note) -> Self {
        Self { canon, plays, note }
    }

    pub fn canon(&self) -> Canon {
        self.canon
    }

    /// The target drum that plays it.
    pub fn plays(&self) -> Canon {
        self.plays
    }

    pub fn note(&self) -> Note {
        self.note
    }
}

/// The drum `stand_in` playing `canon` on `note`; `other_drum` when the stand-in is not `drum`,
/// the drum `canon` is played on, played another way.
#[derive(Debug, PartialEq, Eq, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub struct StandIn {
    #[serde(skip)]
    canon: Canon,
    stand_in: Canon,
    note: Note,
    other_drum: bool,
}

impl StandIn {
    pub(crate) fn new(canon: Canon, drum: Canon, stand_in: Canon, note: Note) -> Self {
        Self {
            canon,
            stand_in,
            note,
            other_drum: !drum.same_drum(stand_in),
        }
    }

    pub fn stand_in(&self) -> Canon {
        self.stand_in
    }

    pub fn note(&self) -> Note {
        self.note
    }
}

impl Outcome {
    /// Whether the target lacks the drum and its nearest stand-in is another drum, so the
    /// [`MissingDrums`](super::MissingDrums) setting decides what plays it.
    pub fn moves_to_other_drum(&self) -> bool {
        match *self {
            Self::Direct(_) => false,
            Self::Fallback(s) => s.other_drum,
            Self::Dropped { other_drum, .. } => other_drum,
        }
    }

    /// The drum it is about.
    pub fn canon(&self) -> Canon {
        match *self {
            Self::Direct(landing) => landing.canon,
            Self::Dropped { canon, .. } => canon,
            Self::Fallback(s) => s.canon,
        }
    }

    /// The target drum that plays it and that drum's note, when anything plays it.
    pub fn played(&self) -> Option<(Canon, Note)> {
        match *self {
            Self::Direct(landing) => Some((landing.plays, landing.note)),
            Self::Fallback(s) => Some((s.stand_in, s.note)),
            Self::Dropped { .. } => None,
        }
    }

    pub fn note(&self) -> Option<Note> {
        self.played().map(|(_, note)| note)
    }
}
