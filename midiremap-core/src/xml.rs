//! The one XML writer: every XML file the core, and the site, write goes through it.

use std::io;

use quick_xml::{
    events::{BytesDecl, BytesText, Event},
    Writer,
};

pub type Xml = Writer<Vec<u8>>;

/// How a document indents each level.
#[derive(Clone, Copy, Debug)]
pub enum Indent {
    Tab,
    Spaces(usize),
}

/// An XML document: the declaration naming `encoding`, then what `body` writes, each level
/// indented by `indent`, ending in a newline.
pub fn document(
    indent: Indent,
    encoding: &str,
    body: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> String {
    let (char, size) = match indent {
        Indent::Tab => (b'\t', 1),
        Indent::Spaces(n) => (b' ', n),
    };
    let mut w = Writer::new_with_indent(Vec::new(), char, size);
    w.write_event(Event::Decl(BytesDecl::new("1.0", Some(encoding), None)))
        .and_then(|()| body(&mut w))
        .expect("writing into memory cannot fail");
    let mut out =
        String::from_utf8(w.into_inner()).expect("the writer emits the UTF-8 it is given");
    out.push('\n');
    out
}

/// An element with `attributes` holding what `inner` writes.
pub fn element<'a>(
    w: &mut Xml,
    tag: &str,
    attributes: impl IntoIterator<Item = (&'a str, &'a str)>,
    inner: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    w.create_element(tag)
        .with_attributes(attributes)
        .write_inner_content(inner)
        .map(drop)
}

/// An element without attributes holding what `inner` writes.
pub fn nest(
    w: &mut Xml,
    tag: &str,
    inner: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    element(w, tag, [], inner)
}

/// An element with `attributes` and nothing inside.
pub fn empty<'a>(
    w: &mut Xml,
    tag: &str,
    attributes: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> io::Result<()> {
    w.create_element(tag)
        .with_attributes(attributes)
        .write_empty()
        .map(drop)
}

/// An element without attributes holding `text`, escaped.
pub fn text(w: &mut Xml, tag: &str, text: &str) -> io::Result<()> {
    w.create_element(tag)
        .write_text_content(BytesText::new(text))
        .map(drop)
}
