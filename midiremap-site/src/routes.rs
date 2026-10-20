use std::{borrow::Cow, fmt};

use midiremap_core::Daw;

use crate::i18n::{Docs, Locale, Plain, SectionKey};

include!(concat!(env!("OUT_DIR"), "/routes.rs"));

const ORIGIN: &str = "https://drumverter.com";

/// The site's name, as page titles, social cards, schema and `/llms.txt` carry it.
pub const SITE_NAME: &str = "Drumverter";

/// Where Stripe sends a visitor back after a tip.
pub const THANKS: SitePath = SitePath::fixed("/thanks/");

const OG_IMAGE: SitePath = SitePath::fixed("/og-image.png");

const SITEMAP: SitePath = SitePath::fixed("/sitemap.xml");

const LOGO: SitePath = SitePath::fixed("/icon-512.png");

/// A page's address as the site defines it, before any locale prefix: `/engines/`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SitePath(Cow<'static, str>);

impl SitePath {
    /// A route known at compile time.
    pub const fn fixed(path: &'static str) -> Self {
        Self(Cow::Borrowed(path))
    }

    pub fn new(path: impl Into<String>) -> Self {
        Self(Cow::Owned(path.into()))
    }

    /// The page's address in `locale`: the locale's prefix and this path.
    pub fn in_locale(&self, locale: Locale) -> LocalPath {
        let prefix = match locale.prefix() {
            "" => String::new(),
            p => format!("/{p}"),
        };
        LocalPath(format!("{prefix}{}", self.0))
    }
}

impl fmt::Display for SitePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

/// A page's address in one locale: `/pl/engines/`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LocalPath(String);

impl LocalPath {
    /// The full URL search engines and social cards see.
    pub fn url(&self) -> String {
        format!("{ORIGIN}{}", self.0)
    }

    /// The file the address is served from, relative to the site root.
    pub fn file(&self) -> String {
        format!("{}index.html", self.0.trim_start_matches('/'))
    }
}

impl fmt::Display for LocalPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

fn asset_url(path: &SitePath) -> String {
    path.in_locale(Locale::En).url()
}

/// The full URL of the social card image.
pub fn og_image_url() -> String {
    asset_url(&OG_IMAGE)
}

/// The full URL of the logo search engines show for the site.
pub fn logo_url() -> String {
    asset_url(&LOGO)
}

/// The full URL of the sitemap.
pub fn sitemap_url() -> String {
    asset_url(&SITEMAP)
}

/// A note-map engine page's address.
pub fn engine_href(slug: &str) -> SitePath {
    SitePath::new(format!("{NOTE_MAPS}{slug}/"))
}

/// A drum map file's address: one copy every locale links.
pub fn drum_map_href(slug: &str, daw: Daw) -> SitePath {
    SitePath::new(format!("{DRUM_MAPS}files/{slug}.{}", daw.extension()))
}

/// A conversion pair page's address.
pub fn pair_href(slug: &str) -> SitePath {
    SitePath::new(format!("/convert/{slug}/"))
}

/// The converter as a page, for the language menu and `hreflang`.
pub const CONVERTER_PAGE: Page = Page::Everywhere(CONVERTER);

fn section_path(key: SectionKey) -> SitePath {
    SitePath::new(format!("/{}/", key.slug()))
}

/// The converter's address in `locale`.
pub fn home(locale: Locale) -> LocalPath {
    CONVERTER.in_locale(locale)
}

/// Where a nav or footer link goes from a `locale` page: a section the locale lacks
/// links to the English page.
pub fn href(target: NavTarget, locale: Locale, docs: &Docs) -> LocalPath {
    match target {
        NavTarget::Converter => home(locale),
        NavTarget::NoteMaps => NOTE_MAPS.in_locale(locale),
        NavTarget::DrumMaps => DRUM_MAPS.in_locale(locale),
        NavTarget::Section(k) if docs.has(locale, k) => section_path(k).in_locale(locale),
        NavTarget::Section(k) => section_path(k).in_locale(Locale::En),
    }
}

/// The label a nav or footer link shows.
pub fn label(target: NavTarget) -> Plain {
    match target {
        NavTarget::Converter => Plain::NavConverter,
        NavTarget::NoteMaps => Plain::NavNoteMaps,
        NavTarget::DrumMaps => Plain::NavDrumMaps,
        NavTarget::Section(k) => k.label(),
    }
}

/// A static page, as the language menu and `hreflang` see it.
pub enum Page {
    /// A document section, which a locale may lack.
    Section(SectionKey),
    /// A page every locale has, by its English path.
    Everywhere(SitePath),
}

impl Page {
    /// The page's address in `locale`, or `None` when the locale has no version of it.
    pub fn in_locale(&self, locale: Locale, docs: &Docs) -> Option<LocalPath> {
        match self {
            Page::Section(k) => docs
                .has(locale, *k)
                .then(|| section_path(*k).in_locale(locale)),
            Page::Everywhere(path) => Some(path.in_locale(locale)),
        }
    }
}

/// The same page in `to`, or `to`'s converter when the page has no version there.
pub fn page_in(page: &Page, to: Locale, docs: &Docs) -> LocalPath {
    page.in_locale(to, docs).unwrap_or_else(|| home(to))
}

/// One version of a page for `hreflang`: the language tag and the version's path.
#[derive(Debug, PartialEq, Eq)]
pub struct Alternate {
    pub tag: &'static str,
    pub path: LocalPath,
}

impl Alternate {
    /// The version's full URL.
    pub fn url(&self) -> String {
        self.path.url()
    }
}

/// The versions of `page` for `hreflang`: each locale that has it, then `x-default`.
pub fn alternates(page: &Page, docs: &Docs) -> Vec<Alternate> {
    Locale::ALL
        .iter()
        .filter_map(|&l| {
            page.in_locale(l, docs).map(|path| Alternate {
                tag: l.lang_tag(),
                path,
            })
        })
        .chain([Alternate {
            tag: "x-default",
            path: page_in(page, Locale::En, docs),
        }])
        .collect()
}

/// A document's internal link, pointed at the same page in `locale`.
pub fn local_href(path: &str, locale: Locale, docs: &Docs) -> LocalPath {
    let english = SitePath::new(path);
    match SectionKey::ALL
        .iter()
        .find(|&&k| english == section_path(k))
    {
        Some(&k) => href(NavTarget::Section(k), locale, docs),
        None => english.in_locale(locale),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Map, Value};

    use super::*;

    fn nav_links(docs: &Docs) -> Value {
        let hrefs = |targets: &[NavTarget], locale| -> Vec<String> {
            targets
                .iter()
                .map(|&t| href(t, locale, docs).to_string())
                .collect()
        };
        Value::Object(
            Locale::ALL
                .iter()
                .map(|&l| {
                    (
                        l.code().to_owned(),
                        json!({ "nav": hrefs(NAV, l), "footer": hrefs(FOOTER, l) }),
                    )
                })
                .collect::<Map<_, _>>(),
        )
    }

    #[test]
    fn every_locale_links_nav_and_footer_to_the_recorded_addresses() {
        let recorded: Value =
            serde_json::from_str(include_str!("../tests/golden/nav-links.json")).unwrap();
        assert_eq!(nav_links(crate::fixtures::docs()), recorded);
    }

    #[test]
    fn a_translated_section_switches_to_its_translation() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            page_in(&Page::Section(SectionKey::Faq), Locale::Pl, docs).to_string(),
            "/pl/faq/"
        );
    }

    #[test]
    fn a_translated_section_switches_back_to_english() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            page_in(&Page::Section(SectionKey::Faq), Locale::En, docs).to_string(),
            "/faq/"
        );
    }

    fn polish_without_terms() -> Docs {
        Docs::with_sections(|l| match l {
            Locale::En => &[SectionKey::Faq, SectionKey::Terms],
            _ => &[SectionKey::Faq],
        })
    }

    #[test]
    fn an_untranslated_section_switches_to_the_converter() {
        let docs = polish_without_terms();
        assert_eq!(
            page_in(&Page::Section(SectionKey::Terms), Locale::Pl, &docs).to_string(),
            "/pl/"
        );
    }

    #[test]
    fn a_document_link_to_a_note_map_points_at_the_page_in_the_readers_language() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            local_href("/engines/", Locale::Pl, docs).to_string(),
            "/pl/engines/"
        );
    }

    #[test]
    fn a_document_link_to_a_section_points_at_the_page_in_the_readers_language() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            local_href("/faq/", Locale::Pl, docs).to_string(),
            "/pl/faq/"
        );
    }

    #[test]
    fn a_document_link_for_an_english_reader_stays_unprefixed() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            local_href("/engines/", Locale::En, docs).to_string(),
            "/engines/"
        );
    }

    #[test]
    fn a_note_map_page_switches_to_the_same_page_in_another_locale() {
        let docs = crate::fixtures::docs();
        let page = Page::Everywhere(SitePath::new("/engines/ezdrummer/"));
        assert_eq!(
            page_in(&page, Locale::Pl, docs).to_string(),
            "/pl/engines/ezdrummer/"
        );
    }

    #[test]
    fn a_note_map_page_lists_every_locale_and_the_default() {
        let docs = crate::fixtures::docs();
        assert_eq!(
            alternates(&Page::Everywhere(NOTE_MAPS), docs).len(),
            Locale::ALL.len() + 1
        );
    }

    fn versions(page: &Page, docs: &Docs) -> Vec<(&'static str, String)> {
        alternates(page, docs)
            .into_iter()
            .map(|a| (a.tag, a.path.to_string()))
            .collect()
    }

    fn faq_versions() -> Vec<(&'static str, String)> {
        versions(&Page::Section(SectionKey::Faq), crate::fixtures::docs())
    }

    fn version(tag: &'static str, path: &str) -> (&'static str, String) {
        (tag, path.to_owned())
    }

    #[test]
    fn a_translated_section_lists_every_locale_and_the_default() {
        assert_eq!(faq_versions().len(), Locale::ALL.len() + 1);
    }

    #[test]
    fn a_translated_section_lists_english_first() {
        assert_eq!(faq_versions().first(), Some(&version("en", "/faq/")));
    }

    #[test]
    fn a_translated_section_lists_its_polish_version() {
        assert!(faq_versions().contains(&version("pl", "/pl/faq/")));
    }

    #[test]
    fn a_translated_section_lists_its_brazilian_portuguese_version() {
        assert!(faq_versions().contains(&version("pt-BR", "/pt/faq/")));
    }

    #[test]
    fn a_translated_section_lists_its_simplified_chinese_version() {
        assert!(faq_versions().contains(&version("zh-Hans", "/zh/faq/")));
    }

    #[test]
    fn a_translated_section_lists_the_default_last() {
        assert_eq!(faq_versions().last(), Some(&version("x-default", "/faq/")));
    }

    #[test]
    fn a_section_only_english_has_lists_english_and_the_default() {
        assert_eq!(
            alternates(&Page::Section(SectionKey::Terms), &polish_without_terms()).len(),
            2
        );
    }
}
