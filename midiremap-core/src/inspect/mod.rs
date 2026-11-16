mod fit;
mod hits;
mod summary;

pub(crate) use self::summary::{hit_fate, summaries};
pub use self::{
    fit::{source_fits, SourceFit, SourceFits},
    hits::{note_hits, NoteHits},
    summary::{
        auto_question, part_summaries, AutoQuestion, Known, PartSummary, PlayedDrum, Plays,
        QuestionReason,
    },
};
