//! The drum-engine remapper: what a file plays (`inspect`), the conversion (`convert`) and
//! the files written for other programs (`files`, `xml`), over the drum crates
//! (`midiremap-kit`, `midiremap-mapping`) and the MIDI crate (`midiremap-smf`). It is the one
//! crate the CLI, the WASM bindings and the site depend on, and re-exports the API they use.
//!
//! The folders use each other in one order, lowest first. Cargo holds only the edges between
//! crates, so this order is held by review:
//!
//! - `xml` uses no other folder;
//! - `inspect` uses no other folder;
//! - `convert` uses `inspect`;
//! - `files` uses `xml`, and outside its tests neither `inspect` nor `convert`.

#![warn(unreachable_pub)]

mod convert;
mod files;
mod inspect;
pub mod xml;

pub use convert::{convert, Conversion, Converted, FallbackTally, Report, Unmapped, UnmappedFate};
pub use files::{
    parse_preset, rack_file, sample_file, Daw, FileStem, LoadedPreset, Packing, PresetError,
    PresetName, RackFile, SavedPreset, SkippedEdit,
};
pub use inspect::{
    auto_question, note_hits, part_summaries, source_fits, AutoQuestion, Known, NoteHits,
    PartSummary, PlayedDrum, Plays, QuestionReason, SourceFit, SourceFits,
};
pub use midiremap_kit::{
    canon::{Canon, CanonEntry, CanonParseError, Family},
    engine::{Catalog, Drum, EngineId, EngineMap, MapError},
};
pub use midiremap_mapping::{
    resolve_on, Landing, Mapping, MissingDrums, MissingDrumsParseError, Outcome, Overrides,
    StandIn, Unrecognized, UnrecognizedParseError, VoicePlan,
};
pub use midiremap_note::{Note, NoteParseError, OctaveBase};
pub use midiremap_smf::{
    midi::{Bar, Channel, CodecError, Damage, Position, Tick, TrackNo},
    parts::{
        AskReason, ChannelScope, ChannelScopeError, ConvertError, NoParts, Part, PartError,
        PartSet, Parts, Selection,
    },
};
