pub mod canon;
pub mod catalog;
pub mod conversion;
mod embedded_engines;
pub mod engine_map;
pub mod midi;
pub mod overrides;
pub mod plan;
pub mod table;
pub mod translate;

pub use canon::{Canon, DefaultFallbacks, FallbackResolver};
pub use catalog::{BuiltinMaps, LayeredMaps, MapProvider};
pub use conversion::{remap, remap_with_overrides, Conversion, ConversionError, Converted};
pub use engine_map::{Decoder, Drum, Encoder, EngineMap, MapError};
pub use midi::{
    ChannelFilter, ChannelScope, ChannelScopeError, CodecError, EventRewriter, MidiCodec,
    StandardMidiCodec,
};
pub use overrides::Overrides;
pub use plan::{plan, PlanStatus, VoicePlan};
pub use table::NoteTable;
pub use translate::{CanonResolution, FallbackTally, Report, ReportSink, Resolution, Translator};
