use crate::{
    i18n::{Docs, Locale, SectionKey},
    pages::Site,
    routes::{
        alternates, drum_map_files, home, href, sitemap_url, NavTarget, Page, CONVERTER_PAGE,
        DRUM_MAPS, NOTE_MAPS,
    },
};

/// Every indexed page's address, each with `xhtml:link`s to its indexed versions.
pub fn sitemap(site: &Site, docs: &Docs) -> String {
    let converters = Locale::ALL
        .iter()
        .map(|&l| (home(l), alternates(&CONVERTER_PAGE, docs)));
    let pages: Vec<Page> = [NOTE_MAPS, DRUM_MAPS]
        .into_iter()
        .chain(site.engines.iter().map(|p| p.engine.href()))
        .map(Page::Everywhere)
        .chain(site.pairs.iter().map(|p| Page::Pair(p.href())))
        .collect();
    let note_maps = Locale::ALL.iter().flat_map(|&l| {
        pages
            .iter()
            .filter(move |page| page.indexed_in(l))
            .filter_map(move |page| {
                page.in_locale(l, docs)
                    .map(|path| (path, alternates(page, docs)))
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
                .map(|version| {
                    format!(
                        r#"<xhtml:link rel="alternate" hreflang="{}" href="{}"/>"#,
                        version.tag,
                        version.url()
                    )
                })
                .collect();
            format!("  <url><loc>{}</loc>{links}</url>\n", path.url())
        })
        .collect();
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n{urls}</urlset>\n"
    )
}

pub fn robots() -> String {
    format!(
        "User-agent: *\nAllow: /\nDisallow: {}\n\nSitemap: {}\n",
        drum_map_files(),
        sitemap_url()
    )
}

#[cfg(test)]
mod tests {
    use std::{collections::HashSet, sync::LazyLock};

    use midiremap_core::Catalog;

    use super::*;
    use crate::{
        pages::{EXCLUDED_IDS, MAJORS, TARGETS},
        routes::pair_href,
    };

    #[test]
    fn robots_allows_all() {
        let r = robots();
        assert!(r.contains("User-agent: *"));
        assert!(r.contains("Allow: /"));
    }

    #[test]
    fn robots_points_to_the_sitemap() {
        let r = robots();
        assert!(r.contains("Sitemap: https://drumverter.com/sitemap.xml"));
    }

    fn sitemap_xml() -> &'static str {
        static XML: LazyLock<String> =
            LazyLock::new(|| sitemap(crate::fixtures::site(), crate::fixtures::docs()));
        &XML
    }

    fn locations<'a>(doc: &'a roxmltree::Document) -> Vec<&'a str> {
        doc.descendants()
            .filter(|n| n.has_tag_name("loc"))
            .filter_map(|n| n.text())
            .collect()
    }

    #[test]
    fn lists_as_many_addresses_as_there_are_pages() {
        let catalog = Catalog::builtin().unwrap();
        let xml = sitemap_xml();
        let doc = roxmltree::Document::parse(xml).unwrap();
        let locs: Vec<&str> = locations(&doc);
        let engines = catalog.ids().count() - EXCLUDED_IDS.len();
        let pairs = MAJORS.len() * (MAJORS.len() - 1) + (engines - MAJORS.len()) * TARGETS.len();
        let docs = crate::fixtures::docs();
        let sections: usize = Locale::ALL
            .iter()
            .map(|&l| SectionKey::ALL.iter().filter(|&&k| docs.has(l, k)).count())
            .sum();
        let reviewed = Locale::ALL.iter().filter(|l| l.reviewed()).count();
        assert_eq!(
            locs.len(),
            Locale::ALL.len() * (3 + engines) + reviewed * pairs + sections
        );
    }

    #[test]
    fn lists_the_drum_maps_page_in_every_locale() {
        let xml = sitemap_xml();
        let doc = roxmltree::Document::parse(xml).unwrap();
        let locs = locations(&doc);
        for &l in Locale::ALL {
            let url = DRUM_MAPS.in_locale(l).url();
            assert!(locs.contains(&url.as_str()), "{url}");
        }
    }

    #[test]
    fn robots_keeps_crawlers_out_of_the_drum_map_files() {
        assert!(robots().contains("Disallow: /drum-maps/files/\n"));
    }

    #[test]
    fn lists_no_drum_map_file() {
        assert!(!sitemap_xml().contains("/drum-maps/files/"));
    }

    #[test]
    fn lists_the_english_faq() {
        let xml = sitemap_xml();
        let doc = roxmltree::Document::parse(xml).unwrap();
        let locs: Vec<&str> = locations(&doc);
        assert!(locs.contains(&"https://drumverter.com/faq/"));
    }

    #[test]
    fn lists_no_page_twice() {
        let xml = sitemap_xml();
        let doc = roxmltree::Document::parse(xml).unwrap();
        let locs: Vec<&str> = locations(&doc);
        assert_eq!(locs.iter().collect::<HashSet<_>>().len(), locs.len());
    }

    #[test]
    fn lists_every_page_on_the_canonical_origin() {
        let xml = sitemap_xml();
        let doc = roxmltree::Document::parse(xml).unwrap();
        let locs: Vec<&str> = locations(&doc);
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
        urls(sitemap_xml())
    }

    #[test]
    fn leaves_out_the_thanks_page() {
        assert!(all_urls().iter().all(|(url, _)| !url.contains("/thanks/")));
    }

    fn version(tag: &str, url: &str) -> (String, String) {
        (tag.to_owned(), url.to_owned())
    }

    fn url_entry(location: &str) -> (String, Vec<(String, String)>) {
        all_urls()
            .into_iter()
            .find(|(loc, _)| loc == location)
            .unwrap()
    }

    #[test]
    fn a_translated_page_lists_every_version_and_the_default() {
        let pl_faq = url_entry("https://drumverter.com/pl/faq/");
        assert_eq!(pl_faq.1.len(), Locale::ALL.len() + 1);
    }

    #[test]
    fn a_translated_page_lists_english_first() {
        let pl_faq = url_entry("https://drumverter.com/pl/faq/");
        assert_eq!(
            pl_faq.1.first(),
            Some(&version("en", "https://drumverter.com/faq/"))
        );
    }

    #[test]
    fn a_translated_page_lists_its_polish_version() {
        let pl_faq = url_entry("https://drumverter.com/pl/faq/");
        assert!(pl_faq
            .1
            .contains(&version("pl", "https://drumverter.com/pl/faq/")));
    }

    #[test]
    fn a_translated_page_lists_its_brazilian_portuguese_version() {
        let pl_faq = url_entry("https://drumverter.com/pl/faq/");
        assert!(pl_faq
            .1
            .contains(&version("pt-BR", "https://drumverter.com/pt/faq/")));
    }

    #[test]
    fn a_translated_page_lists_the_default_last() {
        let pl_faq = url_entry("https://drumverter.com/pl/faq/");
        assert_eq!(
            pl_faq.1.last(),
            Some(&version("x-default", "https://drumverter.com/faq/"))
        );
    }

    #[test]
    fn a_polish_home_page_lists_every_version_and_the_default() {
        let pl_home = url_entry("https://drumverter.com/pl/");
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

    #[test]
    fn lists_no_pair_page_of_an_unreviewed_locale() {
        let pair = Page::Pair(pair_href("addictive-drums2-to-ezdrummer"));
        for &l in Locale::ALL.iter().filter(|l| !l.reviewed()) {
            let url = pair.in_locale(l, crate::fixtures::docs()).unwrap().url();
            assert!(all_urls().iter().all(|(loc, _)| *loc != url), "{url}");
        }
    }

    #[test]
    fn lists_the_pair_pages_of_the_reviewed_locales() {
        url_entry("https://drumverter.com/convert/addictive-drums2-to-ezdrummer/");
        url_entry("https://drumverter.com/ru/convert/addictive-drums2-to-ezdrummer/");
    }

    #[test]
    fn a_pair_page_lists_only_its_reviewed_versions_and_the_default() {
        let (_, versions) =
            url_entry("https://drumverter.com/ru/convert/addictive-drums2-to-ezdrummer/");
        let tags: Vec<&str> = versions.iter().map(|(tag, _)| tag.as_str()).collect();
        let reviewed: Vec<&str> = Locale::ALL
            .iter()
            .filter(|l| l.reviewed())
            .map(|l| l.lang_tag())
            .chain(["x-default"])
            .collect();
        assert_eq!(tags, reviewed);
    }
}
