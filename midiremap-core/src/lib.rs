#![warn(unreachable_pub)]

mod canon;
mod catalog;
mod channel;
mod conversion;
mod daw_map;
mod engine_map;
mod family;
mod fit;
mod idx;
mod midi;
mod non_blank;
mod note;
mod overrides;
mod plan;
mod preset;
mod report;
mod rewrite;
mod table;
mod translate;

pub use canon::{Canon, CanonParseError};
pub use catalog::Catalog;
pub use channel::{Channel, ChannelScope, ChannelScopeError};
pub use conversion::{convert, Converted};
pub use daw_map::Daw;
pub use engine_map::{Drum, EngineMap, MapError};
pub use family::Family;
pub use fit::{note_hits, source_fits, NoteHits, SourceFit, SourceFits};
pub use midi::CodecError;
pub use non_blank::NonBlank;
pub use note::{Note, NoteParseError, OctaveBase};
pub use overrides::Overrides;
pub use plan::{plan, PlanOutcome, PlanStatus, VoicePlan};
pub use preset::{parse_preset, LoadedPreset, PresetError, SavedPreset, SkippedEdit};
pub use report::{FallbackTally, Report};
pub use translate::{CanonResolution, Mapping, MissingDrums, MissingDrumsParseError};
