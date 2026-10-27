use std::borrow::Borrow;

use serde::Deserialize;

use crate::converter_step::ConverterStep;

#[derive(Deserialize)]
#[serde(untagged)]
pub enum Inline {
    Text(String),
    Link { text: String, href: String },
}

impl Inline {
    pub fn plain(&self) -> &str {
        match self {
            Inline::Text(t) | Inline::Link { text: t, .. } => t,
        }
    }

    pub fn href(&self) -> Option<&str> {
        match self {
            Inline::Text(_) => None,
            Inline::Link { href, .. } => Some(href),
        }
    }

    /// Links off the site open in a new tab.
    pub fn external(&self) -> bool {
        self.href().is_some_and(|h| !h.starts_with('/'))
    }
}

#[derive(Deserialize)]
pub struct Note {
    pub title: String,
    pub body: String,
}

#[derive(Deserialize)]
pub struct Qa {
    pub q: String,
    pub a: Vec<Inline>,
}

/// What the guide says about each of the converter's steps.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StepBodies {
    file: String,
    engines: String,
    convert: String,
}

impl StepBodies {
    pub fn body(&self, step: impl Borrow<ConverterStep>) -> &str {
        match step.borrow() {
            ConverterStep::File => &self.file,
            ConverterStep::Engines => &self.engines,
            ConverterStep::Convert => &self.convert,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Block {
    P(Vec<Inline>),
    #[serde(rename = "converter-steps")]
    ConverterSteps(StepBodies),
    List(Vec<Vec<Inline>>),
    Faq(Vec<Qa>),
    H(String),
    Note(Note),
}

#[cfg(test)]
impl Block {
    /// The block's structure without its words: the kind, item counts and link targets,
    /// which every translation must keep.
    pub fn shape(&self) -> String {
        let links = |parts: &[Inline]| {
            parts
                .iter()
                .filter_map(Inline::href)
                .collect::<Vec<_>>()
                .join(",")
        };
        match self {
            Block::P(parts) => format!("p:[{}]", links(parts)),
            Block::ConverterSteps(_) => "converter-steps".to_owned(),
            Block::List(items) => format!(
                "list:{}:[{}]",
                items.len(),
                items.iter().map(|i| links(i)).collect::<Vec<_>>().join("|")
            ),
            Block::Faq(qas) => format!(
                "faq:{}:[{}]",
                qas.len(),
                qas.iter()
                    .map(|qa| links(&qa.a))
                    .collect::<Vec<_>>()
                    .join("|")
            ),
            Block::H(_) => "h".to_owned(),
            Block::Note(_) => "note".to_owned(),
        }
    }
}

/// How a document page ends: on a panel with the converter's button, or on a plain link to it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Closing {
    Panel,
    Link,
}

/// A guide, FAQ or legal page in one locale.
pub struct ContentPage<'a> {
    pub heading: &'a str,
    pub blocks: &'a [Block],
}
