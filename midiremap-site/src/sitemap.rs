use crate::{
    i18n::{
        alternates, base, converter_alternates, home, href, Docs, Locale, NavTarget, Page,
        SectionKey,
    },
    pages::{PairPage, Site, NOTE_MAPS, ORIGIN},
};

/// Every page's address, each translated one with `xhtml:link`s to all its versions.
pub fn sitemap(site: &Site, docs: &Docs) -> String {
    let converters = Locale::ALL
        .iter()
        .map(|&l| (home(l), converter_alternates()));
    let english: Vec<String> = std::iter::once(NOTE_MAPS.to_owned())
        .chain(site.engines.iter().map(|p| p.engine.href()))
        .chain(site.pairs.iter().map(PairPage::href))
        .collect();
    let note_maps = Locale::ALL.iter().flat_map(|&l| {
        english.iter().map(move |path| {
            (
                format!("{}{path}", base(l)),
                alternates(&Page::Everywhere(path), docs),
            )
        })
    });
    let sections = Locale::ALL.iter().flat_map(|&l| {
        SectionKey::ALL
            .iter()
            .filter(move |&&k| docs.has(l, k))
            .map(move |&k| {
                (
                    href(NavTarget::Section(k), l, docs),
                    alternates(&Page::Section(k), docs),
                )
            })
    });
    let urls: String = converters
        .chain(note_maps)
        .chain(sections)
        .map(|(path, versions)| {
            let links: String = versions
                .iter()
                .map(|(tag, href)| {
                    format!(
                        r#"<xhtml:link rel="alternate" hreflang="{tag}" href="{ORIGIN}{href}"/>"#
                    )
                })
                .collect();
            format!("  <url><loc>{ORIGIN}{path}</loc>{links}</url>\n")
        })
        .collect();
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n{urls}</urlset>\n"
    )
}

pub fn robots() -> String {
    format!("User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n")
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use midiremap_core::Catalog;

    use super::*;
    use crate::pages::{EXCLUDED_IDS, MAJORS};

    #[test]
    fn robots_allows_all_and_points_to_the_sitemap() {
        let r = robots();
        assert!(r.contains("User-agent: *"));
        assert!(r.contains("Allow: /"));
        assert!(r.contains("Sitemap: https://drumverter.com/sitemap.xml"));
    }

    #[test]
    fn lists_every_page_once_on_the_canonical_origin() {
        let catalog = Catalog::builtin().unwrap();
        let xml = sitemap(&Site::build(&catalog).unwrap(), &Docs::load().unwrap());
        let doc = roxmltree::Document::parse(&xml).unwrap();
        let locs: Vec<&str> = doc
            .descendants()
            .filter(|n| n.has_tag_name("loc"))
            .filter_map(|n| n.text())
            .collect();
        let engines = catalog.ids().count() - EXCLUDED_IDS.len();
        let pairs = MAJORS.len() * (MAJORS.len() - 1);
        let docs = Docs::load().unwrap();
        let sections: usize = Locale::ALL
            .iter()
            .map(|&l| SectionKey::ALL.iter().filter(|&&k| docs.has(l, k)).count())
            .sum();
        assert_eq!(
            locs.len(),
            Locale::ALL.len() * (2 + engines + pairs) + sections
        );
        assert!(locs.contains(&"https://drumverter.com/faq/"));
        assert_eq!(locs.iter().collect::<HashSet<_>>().len(), locs.len());
        assert!(locs
            .iter()
            .all(|l| l.starts_with("https://drumverter.com/")));
    }

    fn urls(xml: &str) -> Vec<(String, Vec<(String, String)>)> {
        let doc = roxmltree::Document::parse(xml).unwrap();
        doc.descendants()
            .filter(|n| n.has_tag_name("url"))
            .map(|u| {
                let loc = u
                    .children()
                    .find(|c| c.has_tag_name("loc"))
                    .and_then(|c| c.text())
                    .unwrap()
                    .to_owned();
                let links = u
                    .children()
                    .filter(|c| c.has_tag_name(("http://www.w3.org/1999/xhtml", "link")))
                    .map(|c| {
                        (
                            c.attribute("hreflang").unwrap().to_owned(),
                            c.attribute("href").unwrap().to_owned(),
                        )
                    })
                    .collect();
                (loc, links)
            })
            .collect()
    }

    fn all_urls() -> Vec<(String, Vec<(String, String)>)> {
        urls(&sitemap(
            &Site::build(&Catalog::builtin().unwrap()).unwrap(),
            &Docs::load().unwrap(),
        ))
    }

    #[test]
    fn leaves_out_the_thanks_page() {
        assert!(all_urls().iter().all(|(url, _)| !url.contains("/thanks/")));
    }

    #[test]
    fn a_translated_page_lists_its_versions_and_the_default() {
        let all = all_urls();
        let pl_faq = all
            .iter()
            .find(|(loc, _)| loc == "https://drumverter.com/pl/faq/")
            .unwrap();
        let pair = |tag: &str, url: &str| (tag.to_owned(), url.to_owned());
        assert_eq!(pl_faq.1.len(), Locale::ALL.len() + 1);
        assert_eq!(
            pl_faq.1.first(),
            Some(&pair("en", "https://drumverter.com/faq/"))
        );
        assert!(pl_faq
            .1
            .contains(&pair("pl", "https://drumverter.com/pl/faq/")));
        assert!(pl_faq
            .1
            .contains(&pair("pt-BR", "https://drumverter.com/pt/faq/")));
        assert_eq!(
            pl_faq.1.last(),
            Some(&pair("x-default", "https://drumverter.com/faq/"))
        );
        let pl_home = all
            .iter()
            .find(|(loc, _)| loc == "https://drumverter.com/pl/")
            .unwrap();
        assert_eq!(pl_home.1.len(), Locale::ALL.len() + 1);
    }

    #[test]
    fn a_polish_engine_page_lists_every_version_and_the_default() {
        let all = all_urls();
        let engine = all
            .iter()
            .find(|(loc, _)| loc == "https://drumverter.com/pl/engines/ezdrummer/")
            .unwrap();
        assert_eq!(engine.1.len(), Locale::ALL.len() + 1);
    }
}
