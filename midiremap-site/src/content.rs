use std::sync::LazyLock;

use serde::Deserialize;
use serde_json::json;

const PAGES_JSON: &str = include_str!("../../app/src/content/pages.json");

/// The FAQ, guide and legal text the app's modals show, shared through `pages.json`.
pub static CONTENT: LazyLock<Content> =
    LazyLock::new(|| serde_json::from_str(PAGES_JSON).expect("pages.json must parse"));

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

#[derive(Deserialize)]
pub struct Section {
    pub key: String,
    pub slug: String,
    pub label: String,
    pub heading: String,
    pub title: String,
    pub description: String,
    pub blocks: Vec<Block>,
}

impl Section {
    pub fn href(&self) -> String {
        format!("/{}/", self.slug)
    }
}

#[derive(Deserialize, Clone)]
pub struct Link {
    pub label: String,
    pub href: String,
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum FooterItem {
    Section(String),
    Link(Link),
}

#[derive(Deserialize)]
pub struct Content {
    pub nav: Vec<Link>,
    pub footer: Vec<FooterItem>,
    pub trademark: String,
    pub sections: Vec<Section>,
}

pub struct ContentPage {
    pub section: &'static Section,
    pub json_ld: Option<String>,
}

/// JSON for a `<script type="application/ld+json">`, with `<` escaped so the text cannot
/// close the script.
pub fn script_json(value: &serde_json::Value) -> String {
    value.to_string().replace('<', "\\u003c")
}

fn faq_schema(section: &Section) -> serde_json::Value {
    let entities: Vec<serde_json::Value> = section
        .blocks
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
    json!({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities })
}

fn how_to_schema(section: &Section) -> serde_json::Value {
    let steps: Vec<serde_json::Value> = section
        .blocks
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
    json!({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": section.heading,
        "step": steps,
    })
}

impl Content {
    pub fn pages(&'static self) -> Vec<ContentPage> {
        self.sections
            .iter()
            .map(|section| ContentPage {
                section,
                json_ld: match section.key.as_str() {
                    "faq" => Some(script_json(&faq_schema(section))),
                    "guide" => Some(script_json(&how_to_schema(section))),
                    _ => None,
                },
            })
            .collect()
    }

    /// Footer links in order, sections resolved to their pages.
    pub fn footer_links(&self) -> Vec<Link> {
        self.footer
            .iter()
            .filter_map(|item| match item {
                FooterItem::Link(link) => Some(link.clone()),
                FooterItem::Section(key) => {
                    self.sections.iter().find(|s| &s.key == key).map(|s| Link {
                        label: s.label.clone(),
                        href: s.href(),
                    })
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    #[test]
    fn every_footer_key_names_a_section_and_slugs_are_unique() {
        let keys: HashSet<&str> = CONTENT.sections.iter().map(|s| s.key.as_str()).collect();
        for item in &CONTENT.footer {
            if let FooterItem::Section(key) = item {
                assert!(keys.contains(key.as_str()), "{key}");
            }
        }
        assert_eq!(CONTENT.footer_links().len(), CONTENT.footer.len());
        let slugs: HashSet<&str> = CONTENT.sections.iter().map(|s| s.slug.as_str()).collect();
        assert_eq!(slugs.len(), CONTENT.sections.len());
    }

    #[test]
    fn faq_and_guide_pages_carry_schema_built_from_the_text() {
        let pages = CONTENT.pages();
        let by_slug = |slug: &str| pages.iter().find(|p| p.section.slug == slug).unwrap();
        let faq: serde_json::Value =
            serde_json::from_str(by_slug("faq").json_ld.as_deref().unwrap()).unwrap();
        assert_eq!(faq["@type"], "FAQPage");
        assert_eq!(faq["mainEntity"][0]["name"], "Is Drumverter free?");
        let how: serde_json::Value =
            serde_json::from_str(by_slug("how-it-works").json_ld.as_deref().unwrap()).unwrap();
        assert_eq!(how["@type"], "HowTo");
        assert_eq!(how["step"][0]["name"], "Add your files");
        assert!(by_slug("terms").json_ld.is_none());
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
