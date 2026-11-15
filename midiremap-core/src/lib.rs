#![warn(unreachable_pub)]

mod canon;
mod convert;
mod daw;
mod engine;
mod idx;
mod inspect;
mod mapping;
mod midi;
mod non_blank;
mod note;
mod parts;
mod preset;
#[cfg(test)]
mod proofs;
mod sample;
mod spread;
pub mod xml;

pub use canon::{Canon, CanonEntry, CanonParseError, Family};
pub use convert::{convert, Conversion, Converted, FallbackTally, Report};
pub use daw::{rack_file, Daw, FileStem, Packing, RackFile};
pub use engine::{Catalog, Drum, EngineId, EngineMap, MapError};
pub use inspect::{
    auto_question, note_hits, part_summaries, source_fits, NoteHits, PartSummary, PlayedDrum,
    Plays, SourceFit, SourceFits,
};
pub use mapping::{
    resolve_on, Landing, Mapping, MissingDrums, MissingDrumsParseError, Outcome, Overrides,
    StandIn, Unrecognized, UnrecognizedParseError, VoicePlan,
};
pub use midi::{Bar, Channel, CodecError, Damage, Position, Tick, TrackNo};
pub use note::{Note, NoteParseError, OctaveBase};
pub use parts::{
    ChannelScope, ChannelScopeError, ConvertError, NoParts, Part, PartError, PartSet, Parts,
    Selection,
};
pub use preset::{parse_preset, LoadedPreset, PresetError, PresetName, SavedPreset, SkippedEdit};
pub use sample::sample_file;
