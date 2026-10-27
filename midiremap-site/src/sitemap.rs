use quick_xml::{
    events::{BytesDecl, BytesText, Event},
    Writer,
};

use crate::{
    i18n::Docs,
    pages::Site,
    routes::{alternates, drum_map_files, sitemap_url},
};

/// Every indexed page's address, each with `xhtml:link`s to its indexed versions.
pub fn sitemap(site: &Site, docs: &Docs) -> String {
    let mut w = Writer::new_with_indent(Vec::new(), b' ', 2);
    w.write_event(Event::Decl(BytesDecl::new("1.0", Some("UTF-8"), None)))
        .and_then(|()| {
            w.create_element("urlset")
                .with_attributes([
                    ("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9"),
                    ("xmlns:xhtml", "http://www.w3.org/1999/xhtml"),
                ])
                .write_inner_content(|w| {
                    site.pages().iter().try_for_each(|page| {
                        let links = alternates(page, docs);
                        page.versions(docs).try_for_each(|(_, path)| {
                            w.create_element("url")
                                .write_inner_content(|w| {
                                    w.create_element("loc")
                                        .write_text_content(BytesText::new(&path.url()))?;
                                    links.iter().try_for_each(|link| {
                                        w.create_element("xhtml:link")
                                            .with_attributes([
                                                ("rel", "alternate"),
                                                ("hreflang", link.tag),
                                                ("href", link.url().as_str()),
                                            ])
                                            .write_empty()
                                            .map(drop)
                                    })
                                })
                                .map(drop)
                        })
                    })
                })
                .map(drop)
        })
        .expect("writing into memory cannot fail");
    let mut xml =
        String::from_utf8(w.into_inner()).expect("the writer emits the UTF-8 it is given");
    xml.push('\n');
    xml
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
        i18n::{Locale, SectionKey},
        pages::{EXCLUDED_IDS, MAJORS, TARGETS},
        routes::{pair_href, Page, DRUM_MAPS},
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
        let catalog = Catalog::builtin();
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
