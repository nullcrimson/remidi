#![warn(unreachable_pub)]

mod canon;
mod catalog;
mod convert;
mod daw;
mod engine_map;
mod idx;
mod inspect;
mod midi;
mod non_blank;
mod note;
mod open_levels;
mod overrides;
mod parts;
mod plan;
mod preset;
#[cfg(test)]
mod proofs;
mod resolution;
mod sample;
mod spread;
mod translate;
pub mod xml;

pub use canon::{Canon, CanonEntry, CanonParseError, Family};
pub use catalog::Catalog;
pub use convert::{convert, Conversion, Converted, FallbackTally, Report};
pub use daw::{rack_file, Daw, FileStem, Packing, RackFile};
pub use engine_map::{Drum, EngineId, EngineMap, MapError};
pub use inspect::{
    auto_question, note_hits, part_summaries, source_fits, NoteHits, PartSummary, PlayedDrum,
    Plays, SourceFit, SourceFits,
};
pub use midi::{Bar, Channel, CodecError, Damage, Position, Tick, TrackNo};
pub use note::{Note, NoteParseError, OctaveBase};
pub use overrides::Overrides;
pub use parts::{
    ChannelScope, ChannelScopeError, ConvertError, NoParts, Part, PartError, PartSet, Parts,
    Selection,
};
pub use plan::VoicePlan;
pub use preset::{parse_preset, LoadedPreset, PresetError, PresetName, SavedPreset, SkippedEdit};
pub use resolution::{resolve_on, Landing, MissingDrums, MissingDrumsParseError, Outcome, StandIn};
pub use sample::sample_file;
pub use translate::{Mapping, Unrecognized, UnrecognizedParseError};
