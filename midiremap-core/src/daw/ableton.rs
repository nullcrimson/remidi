use std::io;

use serde::Serialize;

use super::{
    file::FileStem,
    packing::Packing,
    xml::{self, nest, Xml},
};
use crate::{
    engine_map::EngineMap,
    note::Note,
    preset::PresetName,
    translate::{Destination, Mapping},
};

const PROTECTION: &str = "2818";
const MACROS: usize = 16;
const KEPT: &str = "Unknown, kept";

/// The extension of an Ableton Live device preset file.
pub(crate) const ADG_EXTENSION: &str = "adg";

/// How an Ableton Live device preset file stores its XML.
pub(crate) const ADG_PACKING: Packing = Packing::Gzip;

/// One chain of a rack: its key zone holds `note` alone, and a Pitch device moves the note by
/// `shift` semitones when there is one.
struct Chain {
    note: Note,
    name: String,
    shift: Option<i16>,
}

/// A remap rack as a file: the name to save it under, its XML, how the file stores that
/// XML, and how many drums the source plays that the rack leaves silent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct RackFile {
    pub file_name: String,
    pub xml: String,
    pub packing: Packing,
    pub dropped: usize,
}

/// The remap rack for `mapping`, named after `preset` when it gives a file name, else
/// after the mapping's engines.
pub fn rack_file(mapping: &Mapping, preset: Option<&PresetName>) -> RackFile {
    RackFile {
        file_name: rack_file_name(mapping, preset),
        xml: remap_rack(mapping),
        packing: ADG_PACKING,
        dropped: mapping.dropped_drums().count(),
    }
}

fn rack_file_name(mapping: &Mapping, preset: Option<&PresetName>) -> String {
    preset
        .and_then(|p| FileStem::parse(p.as_str()))
        .unwrap_or_else(|| {
            FileStem::parse(&format!(
                "{} to {}",
                mapping.source().display_name(),
                mapping.target().display_name()
            ))
            .expect("two engine names with a word between are never blank")
        })
        .with_extension(ADG_EXTENSION)
}

/// An Ableton Live 11 MIDI Effect Rack preset, which Live 12 also opens (the XML a `.adg`
/// file holds, before gzip), that plays drum MIDI written for the mapping's source on its
/// target: one chain per source note that lands on the target, shifting it to the target's
/// note, and one chain without a device per note the source does not recognize when the
/// mapping keeps those. Notes that nothing plays have no chain, so the rack drops them, as the
/// converter does.
fn remap_rack(mapping: &Mapping) -> String {
    let chains = Note::ALL
        .into_iter()
        .filter_map(|note| {
            mapping.destination(note).map(|to| match to {
                Destination::Drum { canon, note: to } => {
                    let shift = note.semitones_to(to);
                    Chain {
                        note,
                        name: format!("{} → {}", canon.label(), to.get()),
                        shift: (shift != 0).then_some(shift),
                    }
                }
                Destination::Kept(note) => Chain {
                    note,
                    name: KEPT.to_owned(),
                    shift: None,
                },
            })
        })
        .collect::<Vec<_>>();
    let title = format!(
        "{} → {}",
        mapping.source().display_name(),
        mapping.target().display_name()
    );
    rack(&title, &chains)
}

/// An Ableton Live 11 MIDI Effect Rack preset, which Live 12 also opens (the XML a `.adg`
/// file holds, before gzip), with one empty chain per note `map` plays, named after its drum, so Live can show the
/// drum names in the MIDI editor. Notes pass through unchanged.
pub(crate) fn note_name_rack(map: &EngineMap) -> String {
    let chains: Vec<Chain> = map
        .source_notes()
        .into_iter()
        .map(|d| Chain {
            note: d.note,
            name: d.entry.label().to_owned(),
            shift: None,
        })
        .collect();
    rack(map.display_name(), &chains)
}

#[derive(Default)]
struct Ids(u32);

impl Ids {
    fn next(&mut self) -> String {
        self.0 += 1;
        self.0.to_string()
    }
}

fn rack(title: &str, chains: &[Chain]) -> String {
    let mut ids = Ids::default();
    xml::document((b'\t', 1), "UTF-8", |w| {
        xml::element(
            w,
            "Ableton",
            [
                ("MajorVersion", "5"),
                ("MinorVersion", "11.0_11202"),
                ("SchemaChangeCount", "17"),
                ("Creator", "Ableton Live 11.2.10"),
                ("Revision", "a70e3f18ac1d93094ec19c7ca1ea7cfc1a1a7543"),
            ],
            |w| {
                nest(w, "GroupDevicePreset", |w| {
                    value(w, "OverwriteProtectionNumber", PROTECTION)?;
                    nest(w, "Device", |w| group_device(w, title, &mut ids))?;
                    default_preset_ref(w, "MidiEffectGroupDevice")?;
                    nest(w, "BranchPresets", |w| {
                        chains
                            .iter()
                            .enumerate()
                            .try_for_each(|(i, c)| chain(w, i, c, &mut ids))
                    })?;
                    empty(w, "ReturnBranchPresets")
                })
            },
        )
    })
}

fn with_id(
    w: &mut Xml,
    tag: &str,
    id: &str,
    inner: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    xml::element(w, tag, [("Id", id)], inner)
}

fn empty(w: &mut Xml, tag: &str) -> io::Result<()> {
    xml::empty(w, tag, [])
}

fn value(w: &mut Xml, tag: &str, v: impl ToString) -> io::Result<()> {
    xml::empty(w, tag, [("Value", v.to_string().as_str())])
}

fn flag(w: &mut Xml, tag: &str, on: bool) -> io::Result<()> {
    value(w, tag, on)
}

fn target(w: &mut Xml, tag: &str, ids: &mut Ids) -> io::Result<()> {
    with_id(w, tag, &ids.next(), |w| value(w, "LockEnvelope", 0))
}

fn range(w: &mut Xml, tag: &str, min: impl ToString, max: impl ToString) -> io::Result<()> {
    nest(w, tag, |w| {
        value(w, "Min", min.to_string())?;
        value(w, "Max", max.to_string())
    })
}

fn zone(w: &mut Xml, tag: &str, min: u8, max: u8) -> io::Result<()> {
    nest(w, tag, |w| {
        value(w, "Min", min)?;
        value(w, "Max", max)?;
        value(w, "CrossfadeMin", min)?;
        value(w, "CrossfadeMax", max)
    })
}

fn switch(w: &mut Xml, tag: &str, ids: &mut Ids) -> io::Result<()> {
    nest(w, tag, |w| {
        value(w, "LomId", 0)?;
        flag(w, "Manual", true)?;
        target(w, "AutomationTarget", ids)?;
        range(w, "MidiCCOnOffThresholds", 64, 127)
    })
}

fn dial(
    w: &mut Xml,
    tag: &str,
    manual: i16,
    (min, max): (i16, i16),
    ids: &mut Ids,
) -> io::Result<()> {
    nest(w, tag, |w| {
        value(w, "LomId", 0)?;
        value(w, "Manual", manual)?;
        range(w, "MidiControllerRange", min, max)?;
        target(w, "AutomationTarget", ids)?;
        target(w, "ModulationTarget", ids)
    })
}

fn device_head(w: &mut Xml, name: &str, show_preset_name: bool, ids: &mut Ids) -> io::Result<()> {
    value(w, "LomId", 0)?;
    value(w, "LomIdView", 0)?;
    flag(w, "IsExpanded", true)?;
    switch(w, "On", ids)?;
    value(w, "ModulationSourceCount", 0)?;
    xml::empty(w, "ParametersListWrapper", [("LomId", "0")])?;
    xml::empty(w, "Pointee", [("Id", ids.next().as_str())])?;
    value(w, "LastSelectedTimeableIndex", 0)?;
    value(w, "LastSelectedClipEnvelopeIndex", 0)?;
    nest(w, "LastPresetRef", |w| empty(w, "Value"))?;
    empty(w, "LockedScripts")?;
    flag(w, "IsFolded", false)?;
    flag(w, "ShouldShowPresetName", show_preset_name)?;
    value(w, "UserName", name)?;
    value(w, "Annotation", "")?;
    nest(w, "SourceContext", |w| empty(w, "Value"))?;
    value(w, "OverwriteProtectionNumber", PROTECTION)
}

fn numbered(w: &mut Xml, tag: &str, v: impl Fn(usize) -> String) -> io::Result<()> {
    (0..MACROS).try_for_each(|i| value(w, &format!("{tag}.{i}"), v(i)))
}

fn group_device(w: &mut Xml, title: &str, ids: &mut Ids) -> io::Result<()> {
    with_id(w, "MidiEffectGroupDevice", "0", |w| {
        device_head(w, title, true, ids)?;
        empty(w, "Branches")?;
        flag(w, "IsBranchesListVisible", true)?;
        flag(w, "IsReturnBranchesListVisible", false)?;
        flag(w, "IsRangesEditorVisible", true)?;
        flag(w, "AreDevicesVisible", true)?;
        value(w, "NumVisibleMacroControls", 8)?;
        (0..MACROS).try_for_each(|i| dial(w, &format!("MacroControls.{i}"), 0, (0, 127), ids))?;
        numbered(w, "MacroDisplayNames", |i| format!("Macro {}", i + 1))?;
        numbered(w, "MacroDefaults", |_| "0".to_owned())?;
        numbered(w, "MacroAnnotations", |_| String::new())?;
        numbered(w, "ForceDisplayGenericValue", |_| "false".to_owned())?;
        flag(w, "AreMacroControlsVisible", false)?;
        flag(w, "IsAutoSelectEnabled", false)?;
        dial(w, "ChainSelector", 0, (0, 127), ids)?;
        value(w, "ChainSelectorRelativePosition", -1_073_741_824)?;
        value(w, "ViewsToRestoreWhenUnfolding", 0)?;
        empty(w, "ReturnBranches")?;
        value(w, "BranchesSplitterProportion", 0.5)?;
        flag(w, "ShowBranchesInSessionMixer", false)?;
        numbered(w, "MacroColor", |_| "-1".to_owned())?;
        value(w, "LockId", 0)?;
        value(w, "LockSeal", 0)?;
        xml::empty(w, "ChainsListWrapper", [("LomId", "0")])?;
        xml::empty(w, "ReturnChainsListWrapper", [("LomId", "0")])?;
        nest(w, "MacroVariations", |w| empty(w, "MacroSnapshots"))?;
        numbered(w, "ExcludeMacroFromRandomization", |_| "false".to_owned())?;
        numbered(w, "ExcludeMacroFromSnapshots", |_| "false".to_owned())?;
        flag(w, "AreMacroVariationsControlsVisible", false)?;
        flag(w, "ChainSelectorFilterMidiCtrl", false)?;
        value(w, "RangeTypeIndex", 1)?;
        flag(w, "ShowsZonesInsteadOfNoteNames", true)
    })
}

fn default_preset_ref(w: &mut Xml, device: &str) -> io::Result<()> {
    nest(w, "PresetRef", |w| {
        with_id(w, "AbletonDefaultPresetRef", "0", |w| {
            nest(w, "FileRef", |w| {
                value(w, "RelativePathType", 0)?;
                value(w, "RelativePath", "")?;
                value(w, "Path", "")?;
                value(w, "Type", 2)?;
                value(w, "LivePackName", "")?;
                value(w, "LivePackId", "")?;
                value(w, "OriginalFileSize", 0)?;
                value(w, "OriginalCrc", 0)
            })?;
            xml::empty(w, "DeviceId", [("Name", device)])
        })
    })
}

fn device_preset(
    w: &mut Xml,
    device: &str,
    body: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    with_id(w, "AbletonDevicePreset", "0", |w| {
        value(w, "OverwriteProtectionNumber", PROTECTION)?;
        nest(w, "Device", |w| with_id(w, device, "0", body))?;
        default_preset_ref(w, device)
    })
}

fn pitch(w: &mut Xml, shift: i16, ids: &mut Ids) -> io::Result<()> {
    device_preset(w, "MidiPitcher", |w| {
        device_head(w, "", false, ids)?;
        dial(w, "Pitch", shift, (-128, 128), ids)?;
        value(w, "PitchScrollPosArranger", 0)?;
        value(w, "PitchScrollPosEnvelope", 0)?;
        dial(w, "Lowest", 0, (0, 127), ids)?;
        value(w, "LowestScrollPosArranger", 0)?;
        value(w, "LowestScrollPosEnvelope", 0)?;
        dial(w, "Range", 127, (0, 127), ids)
    })
}

fn chain(w: &mut Xml, index: usize, c: &Chain, ids: &mut Ids) -> io::Result<()> {
    with_id(w, "MidiEffectBranchPreset", &index.to_string(), |w| {
        value(w, "Name", &c.name)?;
        flag(w, "IsSoloed", false)?;
        match c.shift {
            Some(shift) => nest(w, "DevicePresets", |w| pitch(w, shift, ids))?,
            None => empty(w, "DevicePresets")?,
        }
        nest(w, "MixerPreset", |w| {
            device_preset(w, "MidiBranchMixerDevice", |w| {
                device_head(w, "", true, ids)?;
                switch(w, "Speaker", ids)
            })
        })?;
        zone(w, "BranchSelectorRange", 0, 0)?;
        value(w, "SessionViewBranchWidth", 55)?;
        value(w, "DocumentColorIndex", 0)?;
        flag(w, "AutoColored", true)?;
        value(w, "AutoColorScheme", 0)?;
        empty(w, "SourceContext")?;
        nest(w, "ZoneSettings", |w| {
            zone(w, "KeyRange", c.note.get(), c.note.get())?;
            zone(w, "VelocityRange", 1, 127)
        })
    })
}
