use std::io;

use quick_xml::{
    events::{BytesDecl, Event},
    Writer,
};

pub(super) type Xml = Writer<Vec<u8>>;

/// An XML document: the declaration naming `encoding`, then what `body` writes, indented by
/// `indent` (a character and how many of it per level), ending in a newline.
pub(super) fn document(
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

/// An element with `attributes` holding what `inner` writes.
pub(super) fn element<'a>(
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
pub(super) fn nest(
    w: &mut Xml,
    tag: &str,
    inner: impl FnOnce(&mut Xml) -> io::Result<()>,
) -> io::Result<()> {
    element(w, tag, [], inner)
}

/// An element with `attributes` and nothing inside.
pub(super) fn empty<'a>(
    w: &mut Xml,
    tag: &str,
    attributes: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> io::Result<()> {
    w.create_element(tag)
        .with_attributes(attributes)
        .write_empty()
        .map(drop)
}
