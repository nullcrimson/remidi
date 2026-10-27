use std::io;

use super::xml::{self, element, empty, nest, Xml};
use crate::{channel::Channel, engine_map::EngineMap, note::Note};

const UNNAMED: &str = "---";

fn named_notes(map: &EngineMap) -> Vec<(Note, String)> {
    map.source_notes()
        .into_iter()
        .map(|d| (d.note, d.entry.label))
        .collect()
}

/// Reaper MIDI note names, with `credit` in the header.
pub(super) fn reaper(map: &EngineMap, credit: &str) -> String {
    let lines: String = named_notes(map)
        .iter()
        .map(|(note, name)| format!("{} {name}\n", note.get()))
        .collect();
    format!(
        "# MIDI note/CC name map\n# {} ({credit})\n{lines}",
        map.display_name()
    )
}

fn value(w: &mut Xml, kind: &str, name: &str, value: &str) -> io::Result<()> {
    empty(w, kind, [("name", name), ("value", value)])
}

fn int(w: &mut Xml, name: &str, v: impl ToString) -> io::Result<()> {
    value(w, "int", name, &v.to_string())
}

fn wide_string(w: &mut Xml, name: &str, v: &str) -> io::Result<()> {
    empty(
        w,
        "string",
        [("name", name), ("value", v), ("wide", "true")],
    )
}

fn list(
    w: &mut Xml,
    name: &str,
    kind: &str,
    items: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    element(w, "list", [("name", name), ("type", kind)], items)
}

fn item(w: &mut Xml, fields: impl FnOnce(&mut Xml) -> io::Result<()>) -> io::Result<()> {
    nest(w, "item", fields)
}

fn cubase_order(notes: &[(Note, String)]) -> Vec<Note> {
    let played: Vec<Note> = notes.iter().map(|&(note, _)| note).collect();
    let rest = Note::ALL.into_iter().filter(|n| !played.contains(n));
    played.iter().copied().chain(rest).collect()
}

/// A Cubase drum map: every note on itself on the drum channel, named after its drum, the
/// played notes listed first.
pub(super) fn cubase(map: &EngineMap) -> String {
    let notes = named_notes(map);
    let name_of = |n: Note| {
        notes
            .iter()
            .find(|&&(note, _)| note == n)
            .map_or(UNNAMED, |(_, name)| name.as_str())
    };
    xml::document((b' ', 3), "utf-8", |w| {
        nest(w, "DrumMap", |w| {
            wide_string(w, "Name", map.display_name())?;
            list(w, "Quantize", "list", |w| {
                item(w, |w| {
                    int(w, "Grid", 4)?;
                    int(w, "Type", 0)?;
                    value(w, "float", "Swing", "0")?;
                    int(w, "Unquantized", 0)?;
                    int(w, "Legato", 50)
                })
            })?;
            list(w, "Map", "list", |w| {
                Note::ALL.into_iter().try_for_each(|n| {
                    item(w, |w| {
                        int(w, "INote", n.get())?;
                        int(w, "ONote", n.get())?;
                        int(w, "Channel", Channel::DRUMS.wire().as_int())?;
                        value(w, "float", "Length", "200")?;
                        int(w, "Mute", 0)?;
                        int(w, "DisplayNote", n.get())?;
                        int(w, "HeadSymbol", 0)?;
                        int(w, "Voice", 0)?;
                        int(w, "PortIndex", 0)?;
                        wide_string(w, "Name", name_of(n))?;
                        int(w, "QuantizeIndex", 0)
                    })
                })
            })?;
            list(w, "Order", "int", |w| {
                cubase_order(&notes)
                    .into_iter()
                    .try_for_each(|n| empty(w, "item", [("value", n.get().to_string().as_str())]))
            })?;
            list(w, "OutputDevices", "list", |w| {
                item(w, |w| {
                    value(w, "string", "DeviceName", "Default Device")?;
                    value(w, "string", "PortName", "Default Port")
                })
            })?;
            int(w, "Flags", 0)
        })
    })
}

/// A Studio One pitch list naming each played note after its drum.
pub(super) fn studio_one(map: &EngineMap) -> String {
    xml::document((b'\t', 1), "UTF-8", |w| {
        nest(w, "Music.PitchNameList", |w| {
            named_notes(map).iter().try_for_each(|(note, name)| {
                empty(
                    w,
                    "Music.PitchName",
                    [
                        ("pitch", note.get().to_string().as_str()),
                        ("name", name.as_str()),
                    ],
                )
            })
        })
    })
}
