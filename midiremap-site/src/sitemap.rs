use crate::{
    i18n::{href, Docs, Locale, NavTarget, SectionKey},
    pages::{PairPage, Site, ORIGIN},
};

pub fn sitemap(site: &Site, docs: &Docs) -> String {
    let paths = [NavTarget::Converter, NavTarget::NoteMaps]
        .into_iter()
        .map(|t| href(t, Locale::En, docs))
        .chain(site.engines.iter().map(|p| p.engine.href()))
        .chain(site.pairs.iter().map(PairPage::href))
        .chain(
            SectionKey::ALL
                .iter()
                .map(|&k| href(NavTarget::Section(k), Locale::En, docs)),
        );
    let urls: String = paths
        .map(|p| format!("  <url><loc>{ORIGIN}{p}</loc></url>\n"))
        .collect();
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{urls}</urlset>\n"
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
        let catalog = Catalog::builtin();
        let xml = sitemap(&Site::build(&catalog).unwrap(), &Docs::load().unwrap());
        let doc = roxmltree::Document::parse(&xml).unwrap();
        let locs: Vec<&str> = doc
            .descendants()
            .filter(|n| n.has_tag_name("loc"))
            .filter_map(|n| n.text())
            .collect();
        let engines = catalog.ids().len() - EXCLUDED_IDS.len();
        let pairs = MAJORS.len() * (MAJORS.len() - 1);
        assert_eq!(locs.len(), 2 + engines + pairs + SectionKey::ALL.len());
        assert!(locs.contains(&"https://drumverter.com/faq/"));
        assert_eq!(locs.iter().collect::<HashSet<_>>().len(), locs.len());
        assert!(locs
            .iter()
            .all(|l| l.starts_with("https://drumverter.com/")));
    }
}
