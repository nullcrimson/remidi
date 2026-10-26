//! Reads an XML file back as a flat list of elements, each with its path from the root.

use quick_xml::{
    events::{BytesStart, Event},
    Reader, XmlVersion,
};

/// One element, in document order.
pub struct Element {
    /// The tag name.
    pub name: String,
    /// The steps from the root to this element, joined by `/`.
    pub path: String,
    /// The attributes, with their values unescaped.
    pub attrs: Vec<(String, String)>,
}

impl Element {
    /// The value of the attribute `key`.
    pub fn attr(&self, key: &str) -> Option<&str> {
        self.attrs
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

/// Every element of `xml`; `step` names an element's step in the paths from its tag name and
/// attributes.
pub fn elements(xml: &str, step: impl Fn(&str, &[(String, String)]) -> String) -> Vec<Element> {
    let mut reader = Reader::from_str(xml);
    let mut stack: Vec<String> = Vec::new();
    let mut out = Vec::new();
    loop {
        let (tag, open) = match reader.read_event().expect("the XML is well formed") {
            Event::Start(tag) => (tag, true),
            Event::Empty(tag) => (tag, false),
            Event::End(_) => {
                stack.pop();
                continue;
            }
            Event::Eof => return out,
            _ => continue,
        };
        let name = tag.name().as_ref().to_owned();
        let attrs = attributes(&tag);
        stack.push(step(&name, &attrs));
        out.push(Element {
            name,
            path: stack.join("/"),
            attrs,
        });
        if !open {
            stack.pop();
        }
    }
}

fn attributes(tag: &BytesStart) -> Vec<(String, String)> {
    tag.attributes()
        .map(|a| {
            let a = a.expect("an attribute is well formed");
            (
                a.key.as_ref().to_owned(),
                a.normalized_value(XmlVersion::Explicit1_0)
                    .expect("an attribute value unescapes")
                    .into_owned(),
            )
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn by_name(name: &str, _: &[(String, String)]) -> String {
        name.to_owned()
    }

    #[test]
    fn elements_come_in_document_order_with_their_paths() {
        let found = elements("<a><b/><c><d/></c></a>", by_name);
        let paths: Vec<&str> = found.iter().map(|e| e.path.as_str()).collect();
        assert_eq!(paths, ["a", "a/b", "a/c", "a/c/d"]);
    }

    #[test]
    fn attribute_values_are_unescaped() {
        let found = elements(r#"<a name="Tom &amp; Snare"/>"#, by_name);
        assert_eq!(found[0].attr("name"), Some("Tom & Snare"));
    }

    #[test]
    fn a_step_can_name_an_element_by_its_attributes() {
        let found = elements(r#"<a><b id="1"/></a>"#, |name, attrs| {
            attrs
                .first()
                .map_or(name.to_owned(), |(_, v)| format!("{name}[{v}]"))
        });
        assert_eq!(found[1].path, "a/b[1]");
    }
}
