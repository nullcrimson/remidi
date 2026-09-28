pub mod canon;
pub mod catalog;
pub mod conversion;
pub mod engine_map;
pub mod midi;
pub mod note;
pub mod overrides;
pub mod plan;
pub mod table;
pub mod translate;

pub use canon::Canon;
pub use catalog::Catalog;
pub use conversion::{convert, ConversionError, Converted};
pub use engine_map::{Drum, EngineMap, MapError};
pub use midi::{ChannelFilter, ChannelScope, ChannelScopeError, CodecError};
pub use note::{Note, NoteOutOfRange};
pub use overrides::{CanonNote, Overrides, SrcNote};
pub use plan::{plan, PlanStatus, VoicePlan};
pub use table::NoteTable;
pub use translate::{
    resolve, CanonResolution, FallbackTally, Mapping, MissingDrums, MissingDrumsParseError, Report,
    Resolution,
};
