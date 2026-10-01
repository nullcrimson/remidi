#![warn(unreachable_pub)]

mod canon;
mod catalog;
mod channel;
mod conversion;
mod engine_map;
mod family;
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
pub use engine_map::{Drum, EngineMap, MapError};
pub use family::Family;
pub use midi::CodecError;
pub use non_blank::NonBlank;
pub use note::{Note, NoteOutOfRange, NoteParseError, OctaveBase};
pub use overrides::Overrides;
pub use plan::{plan, PlanOutcome, PlanStatus, VoicePlan};
pub use preset::{parse_preset, LoadedPreset, PresetError, SavedPreset, SkippedEdit};
pub use report::{FallbackTally, Report};
pub use translate::{CanonResolution, Mapping, MissingDrums, MissingDrumsParseError, Resolution};
