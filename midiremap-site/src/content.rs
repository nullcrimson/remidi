use serde::Deserialize;
use serde_json::json;

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
    pub a: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Block {
    P(Vec<Inline>),
    Steps(Vec<Step>),
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
            Block::Steps(s) => format!("steps:{}", s.len()),
            Block::List(items) => format!(
                "list:{}:[{}]",
                items.len(),
                items.iter().map(|i| links(i)).collect::<Vec<_>>().join("|")
            ),
            Block::Faq(q) => format!("faq:{}", q.len()),
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
                "acceptedAnswer": { "@type": "Answer", "text": qa.a },
            })
        })
        .collect();
    script_json(
        &json!({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities }),
    )
}

/// The HowTo schema for the steps in `blocks`.
pub fn how_to_schema(heading: &str, blocks: &[Block]) -> String {
    let steps: Vec<serde_json::Value> = blocks
        .iter()
        .flat_map(|b| match b {
            Block::Steps(steps) => steps.as_slice(),
            _ => &[],
        })
        .map(|s| {
            json!({
                "@type": "HowToStep",
                "name": s.title.trim_end_matches('.'),
                "text": s.body,
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
            r#"[{ "p": ["intro"] }, { "faq": [{ "q": "Free?", "a": "Yes." }] }]"#,
        )))
        .unwrap();
        assert_eq!(faq["@type"], "FAQPage");
        assert_eq!(faq["mainEntity"][0]["name"], "Free?");
        assert_eq!(faq["mainEntity"][0]["acceptedAnswer"]["text"], "Yes.");
    }

    #[test]
    fn how_to_schema_names_each_step_without_its_full_stop() {
        let how: serde_json::Value = serde_json::from_str(&how_to_schema(
            "Heading",
            &blocks(r#"[{ "steps": [{ "title": "Add files.", "body": "Drop them." }] }]"#),
        ))
        .unwrap();
        assert_eq!(how["name"], "Heading");
        assert_eq!(how["step"][0]["name"], "Add files");
        assert_eq!(how["step"][0]["text"], "Drop them.");
    }

    #[test]
    fn schema_json_cannot_close_its_script() {
        let s = script_json(&json!({ "q": "</script><b>" }));
        assert!(!s.contains('<'));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&s).unwrap()["q"],
            "</script><b>"
        );
    }
}
