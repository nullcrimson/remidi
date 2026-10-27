mod ableton;
mod file;
mod formats;
mod packing;
mod xml;

use strum::VariantArray;

pub use self::{
    ableton::{rack_file, RackFile},
    file::FileStem,
    packing::Packing,
};
use crate::engine_map::EngineMap;

/// A DAW that reads a file naming the notes of a drum engine.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, VariantArray)]
pub enum Daw {
    Reaper,
    Cubase,
    StudioOne,
    AbletonLive,
}

/// A DAW's drum map file: the DAW's names, the file's extension, how the file stores its
/// text and how that text is written for an engine and a credit.
struct Format {
    key: &'static str,
    name: &'static str,
    extension: &'static str,
    packing: Packing,
    write: fn(&EngineMap, &str) -> String,
}

impl Daw {
    /// Every DAW, in the order the site lists them.
    pub const ALL: &[Self] = Self::VARIANTS;

    fn format(self) -> Format {
        match self {
            Daw::Reaper => Format {
                key: "reaper",
                name: "Reaper",
                extension: "txt",
                packing: Packing::Text,
                write: formats::reaper,
            },
            Daw::Cubase => Format {
                key: "cubase",
                name: "Cubase",
                extension: "drm",
                packing: Packing::Text,
                write: |map, _| formats::cubase(map),
            },
            Daw::StudioOne => Format {
                key: "studio-one",
                name: "Studio One",
                extension: "pitchlist",
                packing: Packing::Text,
                write: |map, _| formats::studio_one(map),
            },
            Daw::AbletonLive => Format {
                key: "ableton",
                name: "Ableton Live",
                extension: ableton::ADG_EXTENSION,
                packing: ableton::ADG_PACKING,
                write: |map, _| ableton::note_name_rack(map),
            },
        }
    }

    /// The id links, file names and usage stats use, such as `studio-one`.
    pub fn key(self) -> &'static str {
        self.format().key
    }

    /// The DAW's product name.
    pub fn name(self) -> &'static str {
        self.format().name
    }

    /// The extension the DAW expects on the file.
    pub fn extension(self) -> &'static str {
        self.format().extension
    }

    /// How the file stores the text [`Daw::drum_map`] gives.
    pub fn packing(self) -> Packing {
        self.format().packing
    }

    /// The file that names every note `map` plays, in this DAW's format: Reaper MIDI note
    /// names, a Cubase drum map, a Studio One pitch list or an Ableton Live names rack, before
    /// [`Daw::packing`] packs it. `credit` names who made the file where the format has a
    /// place for it, as Reaper's header does.
    pub fn drum_map(self, map: &EngineMap, credit: &str) -> String {
        (self.format().write)(map, credit)
    }
}
