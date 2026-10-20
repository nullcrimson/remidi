use std::borrow::Borrow;

use serde::Deserialize;
use serde_json::json;

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
pub struct Step {
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
    Note(Step),
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

/// A guide, FAQ or legal page in one locale.
pub struct ContentPage<'a> {
    pub heading: &'a str,
    pub blocks: &'a [Block],
}

/// JSON for a `<script type="application/ld+json">`, with `<` escaped so the text cannot
/// close the script.
pub fn script_json(value: &serde_json::Value) -> String {
    value.to_string().replace('<', "\\u003c")
}

/// The FAQPage schema for the questions in `blocks`.
pub fn faq_schema(blocks: &[Block]) -> String {
    let entities: Vec<serde_json::Value> = blocks
        .iter()
        .flat_map(|b| match b {
            Block::Faq(qas) => qas.as_slice(),
            _ => &[],
        })
        .map(|qa| {
            json!({
                "@type": "Question",
                "name": qa.q,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": qa.a.iter().map(Inline::plain).collect::<String>(),
                },
            })
        })
        .collect();
    script_json(
        &json!({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities }),
    )
}

/// The BreadcrumbList schema for a trail of `(name, url)` steps, outermost first.
pub fn breadcrumb_schema(trail: &[(&str, String)]) -> String {
    let items: Vec<serde_json::Value> = trail
        .iter()
        .zip(1..)
        .map(|((name, url), position)| {
            json!({ "@type": "ListItem", "position": position, "name": name, "item": url })
        })
        .collect();
    script_json(&json!({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }))
}

/// The HowTo schema for the converter's `steps` in `blocks`, each named by `title`.
pub fn how_to_schema<'a>(
    heading: &str,
    blocks: &[Block],
    steps: &[ConverterStep],
    title: impl Fn(ConverterStep) -> &'a str,
) -> String {
    let steps: Vec<serde_json::Value> = blocks
        .iter()
        .filter_map(|b| match b {
            Block::ConverterSteps(bodies) => Some(bodies),
            _ => None,
        })
        .flat_map(|bodies| {
            steps.iter().map(|&step| {
                json!({
                    "@type": "HowToStep",
                    "name": title(step),
                    "text": bodies.body(step),
                })
            })
        })
        .collect();
    script_json(&json!({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": heading,
        "step": steps,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn blocks(json: &str) -> Vec<Block> {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn faq_schema_lists_each_question_with_its_answer() {
        let faq: serde_json::Value = serde_json::from_str(&faq_schema(&blocks(
            r#"[{ "p": ["intro"] }, { "faq": [{ "q": "Free?", "a": ["Yes."] }] }]"#,
        )))
        .unwrap();
        assert_eq!(faq["@type"], "FAQPage");
        assert_eq!(faq["mainEntity"][0]["name"], "Free?");
        assert_eq!(faq["mainEntity"][0]["acceptedAnswer"]["text"], "Yes.");
    }

    #[test]
    fn faq_schema_joins_an_answers_parts_into_its_text() {
        let faq: serde_json::Value = serde_json::from_str(&faq_schema(&blocks(
            r#"[{ "faq": [{ "q": "Where?", "a": ["See the ", { "text": "maps", "href": "/engines/" }, "."] }] }]"#,
        )))
        .unwrap();
        assert_eq!(
            faq["mainEntity"][0]["acceptedAnswer"]["text"],
            "See the maps."
        );
    }

    #[test]
    fn how_to_schema_names_the_converters_steps() {
        let how: serde_json::Value = serde_json::from_str(&how_to_schema(
            "Heading",
            &blocks(
                r#"[{ "converter-steps": { "file": "Drop it.", "engines": "Pick two.", "convert": "Press it." } }]"#,
            ),
            &[
                ConverterStep::File,
                ConverterStep::Engines,
                ConverterStep::Convert,
            ],
            |step| match step {
                ConverterStep::File => "File",
                ConverterStep::Engines => "Engines",
                ConverterStep::Convert => "Convert",
            },
        ))
        .unwrap();
        assert_eq!(how["name"], "Heading");
        let steps: Vec<(&str, &str)> = how["step"]
            .as_array()
            .unwrap()
            .iter()
            .map(|s| (s["name"].as_str().unwrap(), s["text"].as_str().unwrap()))
            .collect();
        assert_eq!(
            steps,
            [
                ("File", "Drop it."),
                ("Engines", "Pick two."),
                ("Convert", "Press it.")
            ]
        );
    }

    #[test]
    fn schema_json_cannot_close_its_script() {
        let s = script_json(&json!({ "q": "</script><b>" }));
        assert!(!s.contains('<'));
    }

    #[test]
    fn schema_json_still_decodes_to_its_value() {
        let s = script_json(&json!({ "q": "</script><b>" }));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&s).unwrap()["q"],
            "</script><b>"
        );
    }
}
