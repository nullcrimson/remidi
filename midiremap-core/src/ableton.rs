use std::io;

use quick_xml::{
    events::{BytesDecl, Event},
    Writer,
};

use crate::{
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    resolution::MissingDrums,
    table::{Destination, NoteTable},
    translate::Mapping,
};

type Xml = Writer<Vec<u8>>;

const PROTECTION: &str = "2818";
const MACROS: usize = 16;

/// One chain of a rack: its key zone holds `note` alone, and a Pitch device moves the note by
/// `shift` semitones when there is one.
struct Chain {
    note: Note,
    name: String,
    shift: Option<i16>,
}

/// An Ableton Live 11 MIDI Effect Rack preset, which Live 12 also opens (the XML a `.adg`
/// file holds, before gzip), that plays drum MIDI written for `src` on `tgt`: one chain per source note that lands
/// on the target, shifting it to the target's note. Notes that nothing plays have no chain,
/// so the rack drops them, as the converter does.
pub fn remap_rack(
    src: &EngineMap,
    tgt: &EngineMap,
    overrides: &Overrides,
    missing: MissingDrums,
) -> String {
    let table = NoteTable::compile(&Mapping::new(src, tgt, overrides, missing));
    let chains = Note::ALL
        .into_iter()
        .filter_map(|note| match table.destination(note)? {
            Destination::Drum { canon, note: to } => {
                let shift = note.semitones_to(to);
                Some(Chain {
                    note,
                    name: format!("{} → {}", canon.label(), to.get()),
                    shift: (shift != 0).then_some(shift),
                })
            }
            Destination::Kept(_) => None,
        })
        .collect::<Vec<_>>();
    let title = format!("{} → {}", src.display_name(), tgt.display_name());
    rack(&title, &chains)
}

/// An Ableton Live 11 MIDI Effect Rack preset, which Live 12 also opens (the XML a `.adg`
/// file holds, before gzip), with one empty chain per note `map` plays, named after its drum, so Live can show the
/// drum names in the MIDI editor. Notes pass through unchanged.
pub fn note_name_rack(map: &EngineMap) -> String {
    let chains: Vec<Chain> = map
        .source_notes()
        .into_iter()
        .map(|d| Chain {
            note: d.note,
            name: d.label,
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
    let mut w = Writer::new_with_indent(Vec::new(), b'\t', 1);
    w.write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))
        .and_then(|()| {
            w.create_element("Ableton")
                .with_attributes([
                    ("MajorVersion", "5"),
                    ("MinorVersion", "11.0_11202"),
                    ("SchemaChangeCount", "17"),
                    ("Creator", "Ableton Live 11.2.10"),
                    ("Revision", "a70e3f18ac1d93094ec19c7ca1ea7cfc1a1a7543"),
                ])
                .write_inner_content(|w| {
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
                })
                .map(drop)
        })
        .expect("writing into memory cannot fail");
    let mut out =
        String::from_utf8(w.into_inner()).expect("the writer emits the UTF-8 it is given");
    out.push('\n');
    out
}

fn nest(w: &mut Xml, tag: &str, inner: impl FnOnce(&mut Xml) -> io::Result<()>) -> io::Result<()> {
    w.create_element(tag).write_inner_content(inner).map(drop)
}

fn with_id(
    w: &mut Xml,
    tag: &str,
    id: &str,
    inner: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    w.create_element(tag)
        .with_attribute(("Id", id))
        .write_inner_content(inner)
        .map(drop)
}

fn empty(w: &mut Xml, tag: &str) -> io::Result<()> {
    w.create_element(tag).write_empty().map(drop)
}

fn value(w: &mut Xml, tag: &str, v: impl ToString) -> io::Result<()> {
    w.create_element(tag)
        .with_attribute(("Value", v.to_string().as_str()))
        .write_empty()
        .map(drop)
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
    w.create_element("ParametersListWrapper")
        .with_attribute(("LomId", "0"))
        .write_empty()?;
    w.create_element("Pointee")
        .with_attribute(("Id", ids.next().as_str()))
        .write_empty()?;
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
        w.create_element("ChainsListWrapper")
            .with_attribute(("LomId", "0"))
            .write_empty()?;
        w.create_element("ReturnChainsListWrapper")
            .with_attribute(("LomId", "0"))
            .write_empty()?;
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
            w.create_element("DeviceId")
                .with_attribute(("Name", device))
                .write_empty()
                .map(drop)
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
