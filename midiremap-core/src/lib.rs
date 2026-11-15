#![warn(unreachable_pub)]

mod convert;
mod files;
mod inspect;
mod mapping;
#[cfg(test)]
mod proofs;
pub mod xml;

pub use convert::{convert, Conversion, Converted, FallbackTally, Report};
pub use files::{
    parse_preset, rack_file, sample_file, Daw, FileStem, LoadedPreset, Packing, PresetError,
    PresetName, RackFile, SavedPreset, SkippedEdit,
};
pub use inspect::{
    auto_question, note_hits, part_summaries, source_fits, NoteHits, PartSummary, PlayedDrum,
    Plays, SourceFit, SourceFits,
};
pub use mapping::{
    resolve_on, Landing, Mapping, MissingDrums, MissingDrumsParseError, Outcome, Overrides,
    StandIn, Unrecognized, UnrecognizedParseError, VoicePlan,
};
pub use midiremap_kit::{
    canon::{Canon, CanonEntry, CanonParseError, Family},
    engine::{Catalog, Drum, EngineId, EngineMap, MapError},
};
pub use midiremap_note::{Note, NoteParseError, OctaveBase};
pub use midiremap_smf::{
    midi::{Bar, Channel, CodecError, Damage, Position, Tick, TrackNo},
    parts::{
        ChannelScope, ChannelScopeError, ConvertError, NoParts, Part, PartError, PartSet, Parts,
        Selection,
    },
};
