mod advice;
mod fit;
mod hits;
mod summary;

pub(crate) use self::summary::{hit_fate, summaries};
pub use self::{
    advice::{source_advice, Advised, Named, SourceAdvice},
    fit::Lacks,
    hits::{note_hits, NoteHits},
    summary::{
        auto_question, part_summaries, AutoQuestion, Known, PartSummary, PlayedDrum, Plays,
        QuestionReason,
    },
};
