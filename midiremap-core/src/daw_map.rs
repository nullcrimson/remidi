use std::io;

use quick_xml::{
    events::{BytesDecl, Event},
    Writer,
};

use crate::{engine_map::EngineMap, note::Note};

/// A DAW that reads a file naming the notes of a drum engine.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Daw {
    Reaper,
    Cubase,
    StudioOne,
}

type Xml = Writer<Vec<u8>>;

const CUBASE_CHANNEL: &str = "9";
const UNNAMED: &str = "---";

impl Daw {
    pub const ALL: [Daw; 3] = [Daw::Reaper, Daw::Cubase, Daw::StudioOne];

    /// The id links, file names and usage stats use, such as `studio-one`.
    pub fn key(self) -> &'static str {
        match self {
            Daw::Reaper => "reaper",
            Daw::Cubase => "cubase",
            Daw::StudioOne => "studio-one",
        }
    }

    /// The DAW's product name.
    pub fn name(self) -> &'static str {
        match self {
            Daw::Reaper => "Reaper",
            Daw::Cubase => "Cubase",
            Daw::StudioOne => "Studio One",
        }
    }

    /// The extension the DAW expects on the file.
    pub fn extension(self) -> &'static str {
        match self {
            Daw::Reaper => "txt",
            Daw::Cubase => "drm",
            Daw::StudioOne => "pitchlist",
        }
    }

    /// The file that names every note `map` plays, in this DAW's format: Reaper MIDI note
    /// names, a Cubase drum map or a Studio One pitch list.
    pub fn drum_map(self, map: &EngineMap) -> String {
        let notes: Vec<(Note, String)> = map
            .source_notes()
            .into_iter()
            .map(|d| (d.note, d.label))
            .collect();
        let title = map.display_name();
        match self {
            Daw::Reaper => reaper(title, &notes),
            Daw::Cubase => cubase(title, &notes),
            Daw::StudioOne => studio_one(&notes),
        }
    }
}

fn reaper(title: &str, notes: &[(Note, String)]) -> String {
    let lines: String = notes
        .iter()
        .map(|(note, name)| format!("{} {name}\n", note.get()))
        .collect();
    format!("# MIDI note/CC name map\n# {title} (drumverter.com)\n{lines}")
}

fn xml(
    indent: (u8, usize),
    encoding: &str,
    body: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> String {
    let mut w = Writer::new_with_indent(Vec::new(), indent.0, indent.1);
    w.write_event(Event::Decl(BytesDecl::new("1.0", Some(encoding), None)))
        .and_then(|()| body(&mut w))
        .expect("writing into memory cannot fail");
    let mut out =
        String::from_utf8(w.into_inner()).expect("the writer emits the UTF-8 it is given");
    out.push('\n');
    out
}

fn value(w: &mut Xml, kind: &str, name: &str, value: &str) -> io::Result<()> {
    w.create_element(kind)
        .with_attributes([("name", name), ("value", value)])
        .write_empty()
        .map(drop)
}

fn int(w: &mut Xml, name: &str, v: impl ToString) -> io::Result<()> {
    value(w, "int", name, &v.to_string())
}

fn wide_string(w: &mut Xml, name: &str, v: &str) -> io::Result<()> {
    w.create_element("string")
        .with_attributes([("name", name), ("value", v), ("wide", "true")])
        .write_empty()
        .map(drop)
}

fn list(
    w: &mut Xml,
    name: &str,
    kind: &str,
    items: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    w.create_element("list")
        .with_attributes([("name", name), ("type", kind)])
        .write_inner_content(items)
        .map(drop)
}

fn item(w: &mut Xml, fields: impl FnOnce(&mut Xml) -> io::Result<()>) -> io::Result<()> {
    w.create_element("item")
        .write_inner_content(fields)
        .map(drop)
}

fn cubase_order(notes: &[(Note, String)]) -> Vec<u8> {
    let played: Vec<u8> = notes.iter().map(|(note, _)| note.get()).collect();
    let rest = (0..=Note::MAX).filter(|n| !played.contains(n));
    played.iter().copied().chain(rest).collect()
}

fn cubase(title: &str, notes: &[(Note, String)]) -> String {
    let name_of = |n: u8| {
        notes
            .iter()
            .find(|(note, _)| note.get() == n)
            .map_or(UNNAMED, |(_, name)| name.as_str())
    };
    xml((b' ', 3), "utf-8", |w| {
        w.create_element("DrumMap")
            .write_inner_content(|w| {
                wide_string(w, "Name", title)?;
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
                    (0..=Note::MAX).try_for_each(|n| {
                        item(w, |w| {
                            int(w, "INote", n)?;
                            int(w, "ONote", n)?;
                            value(w, "int", "Channel", CUBASE_CHANNEL)?;
                            value(w, "float", "Length", "200")?;
                            int(w, "Mute", 0)?;
                            int(w, "DisplayNote", n)?;
                            int(w, "HeadSymbol", 0)?;
                            int(w, "Voice", 0)?;
                            int(w, "PortIndex", 0)?;
                            wide_string(w, "Name", name_of(n))?;
                            int(w, "QuantizeIndex", 0)
                        })
                    })
                })?;
                list(w, "Order", "int", |w| {
                    cubase_order(notes).into_iter().try_for_each(|n| {
                        w.create_element("item")
                            .with_attribute(("value", n.to_string().as_str()))
                            .write_empty()
                            .map(drop)
                    })
                })?;
                list(w, "OutputDevices", "list", |w| {
                    item(w, |w| {
                        value(w, "string", "DeviceName", "Default Device")?;
                        value(w, "string", "PortName", "Default Port")
                    })
                })?;
                int(w, "Flags", 0)
            })
            .map(drop)
    })
}

fn studio_one(notes: &[(Note, String)]) -> String {
    xml((b'\t', 1), "UTF-8", |w| {
        w.create_element("Music.PitchNameList")
            .write_inner_content(|w| {
                notes.iter().try_for_each(|(note, name)| {
                    w.create_element("Music.PitchName")
                        .with_attributes([
                            ("pitch", note.get().to_string().as_str()),
                            ("name", name.as_str()),
                        ])
                        .write_empty()
                        .map(drop)
                })
            })
            .map(drop)
    })
}
