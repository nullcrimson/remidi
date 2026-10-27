use serde_json::{json, Value};

use crate::{
    content::{Block, ContentPage, Inline},
    converter_step::{converter_steps, ConverterStep},
    i18n::SectionKey,
    routes::{logo_url, SITE_NAME},
    texts::Texts,
};

const SCHEMA_ORG: &str = "https://schema.org";

/// `value` in schema.org's context, as JSON for a `<script type="application/ld+json">`, with
/// `<` escaped so the text cannot close the script.
fn script(mut value: Value) -> String {
    value["@context"] = SCHEMA_ORG.into();
    value.to_string().replace('<', "\\u003c")
}

/// The FAQPage schema for the questions in `blocks`.
fn faq_schema(blocks: &[Block]) -> String {
    let entities: Vec<Value> = blocks
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
    script(json!({ "@type": "FAQPage", "mainEntity": entities }))
}

/// The BreadcrumbList schema for a trail of `(name, url)` steps, outermost first.
pub fn breadcrumb_schema(trail: &[(&str, String)]) -> String {
    let items: Vec<Value> = trail
        .iter()
        .zip(1..)
        .map(|((name, url), position)| {
            json!({ "@type": "ListItem", "position": position, "name": name, "item": url })
        })
        .collect();
    script(json!({
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }))
}

/// The HowTo schema for the converter's `steps` in `blocks`, each named by `title`.
fn how_to_schema<'a>(
    heading: &str,
    blocks: &[Block],
    steps: &[ConverterStep],
    title: impl Fn(ConverterStep) -> &'a str,
) -> String {
    let steps: Vec<Value> = blocks
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
    script(json!({
        "@type": "HowTo",
        "name": heading,
        "step": steps,
    }))
}

/// The schema a document section carries, when it has one.
pub fn section_schema(key: SectionKey, page: &ContentPage, texts: &Texts) -> Option<String> {
    match key {
        SectionKey::Faq => Some(faq_schema(page.blocks)),
        SectionKey::Guide => Some(how_to_schema(
            page.heading,
            page.blocks,
            &converter_steps(&[]).map(|s| s.step),
            |step| texts.step(step),
        )),
        SectionKey::Issue | SectionKey::Contact | SectionKey::Terms => None,
    }
}

/// The converter's schema: the app, the website and the organization behind it.
pub fn converter_schema(description: &str, canonical: &str, site_root: &str) -> String {
    script(json!({
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "name": SITE_NAME,
                "description": description,
                "url": canonical,
                "applicationCategory": "MultimediaApplication",
                "operatingSystem": "Web",
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
            },
            { "@type": "WebSite", "name": SITE_NAME, "url": site_root },
            {
                "@type": "Organization",
                "name": SITE_NAME,
                "url": site_root,
                "logo": logo_url(),
            },
        ],
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::converter_step::ConverterStep;

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
        let s = script(json!({ "q": "</script><b>" }));
        assert!(!s.contains('<'));
    }

    #[test]
    fn schema_json_still_decodes_to_its_value() {
        let s = script(json!({ "q": "</script><b>" }));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&s).unwrap()["q"],
            "</script><b>"
        );
    }
}
