use crate::{
    i18n::{Docs, Locale, Messages, Plain, SectionKey},
    meta::{drum_maps_meta, engine_meta, index_meta, section_meta, summary_meta, Meta},
    pages::Site,
    routes::{home, SITE_NAME},
    texts::Texts,
};

fn line(name: &str, url: &str, description: &str) -> String {
    format!("- [{name}]({url}): {description}\n")
}

fn entry(meta: Meta) -> String {
    line(&meta.name, &meta.canonical, &meta.description)
}

/// `/llms.txt` (llmstxt.org): what Drumverter is and where its English pages are, for
/// language models that answer with links.
pub fn llms_txt(site: &Site, messages: &Messages, docs: &Docs) -> String {
    let texts = Texts {
        messages,
        docs,
        locale: Locale::En,
    };
    let sections = SectionKey::ALL
        .iter()
        .filter(|&&k| docs.has(texts.locale, k))
        .map(|&k| entry(section_meta(k, &texts)))
        .collect::<String>();
    let popular = site
        .popular
        .iter()
        .map(|p| entry(summary_meta(p, &texts)))
        .collect::<String>();
    let engines = site
        .engines
        .iter()
        .map(|p| entry(engine_meta(p, &texts)))
        .collect::<String>();
    let converter = line(
        texts.get(Plain::ConverterTitle),
        &home(texts.locale).url(),
        texts.get(Plain::ConverterOgDescription),
    );
    let maps = entry(index_meta(&site.index, &texts)) + &entry(drum_maps_meta(&site.index, &texts));
    [
        format!(
            "# {SITE_NAME}\n\n> {}\n\n{}\n",
            texts.get(Plain::ConverterDescription),
            texts.get(Plain::ConverterAppDescription)
        ),
        section("Converter", &converter),
        section("Guides", &sections),
        section("Note maps and DAW drum maps", &maps),
        section("Popular conversions", &popular),
        section("Engine note maps", &engines),
    ]
    .join("\n")
}

fn section(heading: &str, entries: &str) -> String {
    format!("## {heading}\n\n{entries}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixtures::site;

    fn text() -> String {
        llms_txt(site(), crate::fixtures::messages(), crate::fixtures::docs())
    }

    fn links(text: &str) -> Vec<&str> {
        text.split("](")
            .skip(1)
            .filter_map(|s| s.split(')').next())
            .collect()
    }

    #[test]
    fn opens_with_the_name_and_a_one_line_summary() {
        let t = text();
        let mut lines = t.lines();
        assert_eq!(lines.next(), Some("# Drumverter"));
        assert_eq!(lines.next(), Some(""));
        assert!(lines
            .next()
            .unwrap()
            .starts_with("> Free drum MIDI converter"));
    }

    #[test]
    fn links_every_engine_page() {
        let t = text();
        let urls = links(&t);
        for p in &site().engines {
            assert!(urls.contains(&p.engine.href().in_locale(Locale::En).url().as_str()));
        }
    }

    #[test]
    fn links_every_popular_conversion() {
        let t = text();
        let urls = links(&t);
        for p in &site().popular {
            assert!(
                urls.contains(&p.link.href().in_locale(Locale::En).url().as_str()),
                "{}",
                p.link.slug
            );
        }
    }

    #[test]
    fn links_only_english_pages_on_the_site() {
        let t = text();
        let urls = links(&t);
        let foreign: Vec<String> = Locale::ALL
            .iter()
            .map(|l| l.prefix())
            .filter(|p| !p.is_empty())
            .map(|p| format!("https://drumverter.com/{p}/"))
            .collect();
        assert!(urls.len() > 100);
        assert!(urls
            .iter()
            .all(|u| u.starts_with("https://drumverter.com/")));
        assert!(urls
            .iter()
            .all(|u| foreign.iter().all(|f| !u.starts_with(f.as_str()))));
    }

    #[test]
    fn names_pages_without_the_brand_suffix() {
        assert!(!text().contains(&format!("| {SITE_NAME}")));
    }
}
