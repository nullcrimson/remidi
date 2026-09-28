#![warn(unreachable_pub)]

mod canon;
mod catalog;
mod conversion;
mod engine_map;
mod family;
mod midi;
mod note;
mod overrides;
mod plan;
mod preset;
mod table;
mod translate;

pub use canon::{Canon, CanonParseError};
pub use catalog::Catalog;
pub use conversion::{convert, ConversionError, Converted};
pub use engine_map::{Drum, EngineMap, MapError};
pub use family::Family;
pub use midi::{Channel, ChannelScope, ChannelScopeError, CodecError};
pub use note::{Note, NoteOutOfRange, OctaveBase};
pub use overrides::{CanonNote, Overrides, SrcNote};
pub use plan::{plan, PlanStatus, VoicePlan};
pub use preset::{
    parse_preset, LoadedPreset, PresetError, SavedPreset, PRESET_FORMAT, PRESET_VERSION,
};
pub use translate::{
    CanonResolution, FallbackTally, Mapping, MissingDrums, MissingDrumsParseError, Report,
    Resolution,
};
