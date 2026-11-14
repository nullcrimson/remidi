#![warn(unreachable_pub)]

mod canon;
mod catalog;
mod channel;
mod conversion;
mod daw;
mod engine_map;
mod family;
mod fit;
mod idx;
mod meter;
mod midi;
mod non_blank;
mod note;
mod open_levels;
mod overrides;
mod plan;
mod preset;
#[cfg(test)]
mod proofs;
mod report;
mod resolution;
mod rewrite;
mod sample;
mod translate;
pub mod xml;

pub use canon::{Canon, CanonEntry, CanonParseError};
pub use catalog::Catalog;
pub use channel::{Channel, ChannelScope, ChannelScopeError, Part, PartError, PartSet, TrackNo};
pub use conversion::{convert, Conversion, Converted};
pub use daw::{rack_file, Daw, FileStem, Packing, RackFile};
pub use engine_map::{Drum, EngineId, EngineMap, MapError};
pub use family::Family;
pub use fit::{
    note_hits, part_summaries, source_fits, NoteHits, PartSummary, PlayedDrum, Plays, SourceFit,
    SourceFits,
};
pub use meter::{Bar, Position};
pub use midi::{CodecError, Damage};
pub use note::{Note, NoteParseError, OctaveBase};
pub use overrides::Overrides;
pub use plan::VoicePlan;
pub use preset::{parse_preset, LoadedPreset, PresetError, PresetName, SavedPreset, SkippedEdit};
pub use report::{FallbackTally, Report};
pub use resolution::{MissingDrums, MissingDrumsParseError, OpenedTo, Outcome, StandIn};
pub use sample::sample_file;
pub use translate::{Mapping, Unrecognized, UnrecognizedParseError};
