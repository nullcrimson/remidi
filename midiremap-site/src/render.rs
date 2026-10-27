use askama::Template;
use midiremap_core::Daw;

use crate::{
    content::{Block, Closing, ContentPage},
    converter_step::{converter_steps, shown_steps, ConverterStep, ShownStep},
    i18n::{Docs, Locale, Messages, Phrase, Plain, SectionKey, TIP_HREF},
    manifest::{AnalyticsScript, LocaleScript, SiteManifest},
    meta::{
        content_meta, drum_maps_meta, engine_meta, index_meta, pair_meta, section_meta, with_midi,
        Meta,
    },
    pages::{EnginePage, IndexPage, NoteCell, NoteRole, PairPage, PairSummary, Site, Tally},
    routes::{
        alternates, home, href, og_image_url, page_in, Alternate, LocalPath, NavTarget, Page,
        SitePath, DRUM_MAPS, DRUM_MAPS_PAGE, FOOTER, NAV, NOTE_MAPS, NOTE_MAPS_PAGE, THANKS,
        THANKS_PAGE,
    },
    schema::{breadcrumb_schema, section_schema},
    texts::{NavItem, Texts},
};

/// What stops the static pages from being rendered.
#[derive(thiserror::Error, Debug)]
pub enum RenderError {
    #[error(transparent)]
    Template(#[from] askama::Error),
}

fn pair_summary(texts: &Texts, src: &str, tgt: &str, tally: Tally) -> String {
    texts.say(Phrase::maps_pair_summary(
        tally.approximated,
        tally.dropped,
        tally.exact,
        src,
        tgt,
        tally.total(),
    ))
}

fn pair_heading(p: &PairPage, texts: &Texts) -> String {
    texts.say(Phrase::maps_pair_heading(
        with_midi(&p.src.name),
        &p.tgt.name,
    ))
}

/// A step of the drum maps page.
#[derive(Clone, Copy, PartialEq, Eq)]
enum DrumMapStep {
    PickDaw,
    Load,
    Download,
}

/// The drum maps page's steps in the order it shows them.
const DRUM_MAP_STEPS: [DrumMapStep; 3] = [
    DrumMapStep::PickDaw,
    DrumMapStep::Load,
    DrumMapStep::Download,
];

fn daw_steps<'a>(texts: &Texts<'a>) -> Vec<(Daw, &'a str)> {
    Daw::ALL
        .iter()
        .map(|&daw| (daw, texts.get(how_to_load(daw))))
        .collect()
}

/// The message telling how `daw` loads its drum map.
fn how_to_load(daw: Daw) -> Plain {
    match daw {
        Daw::Reaper => Plain::DrumMapsReaper,
        Daw::Cubase => Plain::DrumMapsCubase,
        Daw::StudioOne => Plain::DrumMapsStudioOne,
        Daw::AbletonLive => Plain::DrumMapsAbleton,
        Daw::Logic => Plain::DrumMapsLogic,
    }
}

#[derive(Clone, Copy)]
enum PageKind {
    Index,
    Engine,
    Pair,
    DrumMaps,
    Doc,
}

impl std::fmt::Display for PageKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Index => "index",
            Self::Engine => "engine",
            Self::Pair => "pair",
            Self::DrumMaps => "drum-maps",
            Self::Doc => "doc",
        })
    }
}

struct LangItem {
    name: &'static str,
    tag: &'static str,
    code: &'static str,
    href: LocalPath,
    current: bool,
}

struct Offer<'a> {
    code: &'static str,
    tag: &'static str,
    href: LocalPath,
    text: &'a str,
}

struct Frame<'a> {
    lang: &'static str,
    og_image: String,
    code: String,
    menu_label: &'a str,
    dismiss: &'a str,
    languages: Vec<LangItem>,
    offers: Vec<Offer<'a>>,
    alternates: Vec<Alternate>,
    indexed: bool,
    css: &'a str,
    csp: &'a str,
    analytics: &'a [AnalyticsScript],
    locale_script: &'a LocaleScript,
    skip: &'a str,
    nav_main: &'a str,
    nav_site: &'a str,
    nav: Vec<NavItem<'a>>,
    footer: Vec<NavItem<'a>>,
    tip: &'a str,
    tip_href: &'static str,
    home: LocalPath,
    open_converter: &'a str,
    kind: PageKind,
    json_ld: Option<String>,
}

impl<'a> Frame<'a> {
    fn new(
        manifest: &'a SiteManifest,
        texts: &Texts<'a>,
        current: Option<NavTarget>,
        json_ld: Option<String>,
        page: &Page,
        kind: PageKind,
    ) -> Self {
        let here = texts.locale;
        Self {
            lang: here.lang_tag(),
            og_image: og_image_url(),
            code: here.code().to_uppercase(),
            menu_label: texts.get(Plain::LangMenuLabel),
            dismiss: texts.get(Plain::NoticeDismiss),
            languages: Locale::ALL
                .iter()
                .map(|&l| LangItem {
                    name: l.native_name(),
                    tag: l.lang_tag(),
                    code: l.code(),
                    href: page_in(page, l, texts.docs),
                    current: l == here,
                })
                .collect(),
            offers: Locale::ALL
                .iter()
                .filter(|&&l| l != here)
                .filter_map(|&l| {
                    page.in_locale(l, texts.docs).map(|href| Offer {
                        code: l.code(),
                        tag: l.lang_tag(),
                        href,
                        text: texts.messages.get(l, Plain::LangOffer),
                    })
                })
                .collect(),
            alternates: alternates(page, texts.docs),
            indexed: page.indexed_in(here),
            css: &manifest.stylesheet,
            csp: &manifest.content_security_policy,
            analytics: &manifest.analytics,
            locale_script: &manifest.locale_script,
            skip: texts.get(Plain::SkipToContent),
            nav_main: texts.get(Plain::NavMain),
            nav_site: texts.get(Plain::NavSite),
            nav: texts.links(NAV, current),
            footer: texts.links(FOOTER, None),
            tip: texts.get(Plain::TipLink),
            tip_href: TIP_HREF,
            home: home(texts.locale),
            open_converter: texts.get(Plain::OpenConverter),
            kind,
            json_ld,
        }
    }
}

const IN_NOTE_MAPS: Option<NavTarget> = Some(NavTarget::NoteMaps);

#[derive(Template)]
#[template(path = "engine.html")]
struct EngineHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    intro: String,
    page: &'a EnginePage,
}

#[derive(Template)]
#[template(path = "pair.html")]
struct PairHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    heading: String,
    summary: String,
    rack: String,
    steps: [ShownStep<ConverterStep>; 3],
    page: &'a PairPage,
}

#[derive(Template)]
#[template(path = "index.html")]
struct IndexHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a IndexPage,
    popular: &'a [PairSummary],
}

#[derive(Template)]
#[template(path = "drum_maps.html")]
struct DrumMapsHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a IndexPage,
    steps: [ShownStep<DrumMapStep>; 3],
    daws: Vec<(Daw, &'a str)>,
}

#[derive(Template)]
#[template(path = "content.html")]
struct ContentHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a ContentPage<'a>,
    steps: [ShownStep<ConverterStep>; 3],
    closing: Closing,
}

#[derive(Template)]
#[template(path = "thanks.html")]
struct ThanksHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
}

/// Every static page in every locale: the note-map index, engine and pair pages, each
/// locale's translated sections and its thank-you page.
pub fn render_site(
    site: &Site,
    manifest: &SiteManifest,
    messages: &Messages,
    docs: &Docs,
) -> Result<Vec<(String, String)>, RenderError> {
    let mut out = vec![];
    for &locale in Locale::ALL {
        let texts = Texts {
            messages,
            docs,
            locale,
        };
        out.extend(render_note_maps(site, manifest, &texts)?);
        out.extend(render_sections(manifest, &texts)?);
        out.push(render_thanks(manifest, &texts)?);
    }
    Ok(out)
}

fn render_thanks(
    manifest: &SiteManifest,
    texts: &Texts,
) -> Result<(String, String), askama::Error> {
    let path = THANKS.in_locale(texts.locale);
    let html = ThanksHtml {
        meta: content_meta(
            texts.get(Plain::ThanksTitle).to_owned(),
            texts.get(Plain::ThanksDescription).to_owned(),
            &path,
        ),
        frame: Frame::new(manifest, texts, None, None, &THANKS_PAGE, PageKind::Doc),
        texts,
    }
    .render()?;
    Ok((path.file(), html))
}

fn render_note_maps(
    site: &Site,
    manifest: &SiteManifest,
    texts: &Texts,
) -> Result<Vec<(String, String)>, RenderError> {
    let frame = |page: Page, kind: PageKind, json_ld: Option<String>| {
        Frame::new(manifest, texts, IN_NOTE_MAPS, json_ld, &page, kind)
    };
    let trail = |name: &str, path: &SitePath| {
        Some(breadcrumb_schema(&[
            (
                texts.get(Plain::NavNoteMaps),
                NOTE_MAPS.in_locale(texts.locale).url(),
            ),
            (name, path.in_locale(texts.locale).url()),
        ]))
    };
    let mut out = vec![(
        NOTE_MAPS.in_locale(texts.locale).file(),
        IndexHtml {
            meta: index_meta(&site.index, texts),
            frame: frame(NOTE_MAPS_PAGE, PageKind::Index, None),
            texts,
            page: &site.index,
            popular: &site.popular,
        }
        .render()?,
    )];
    out.push((
        DRUM_MAPS.in_locale(texts.locale).file(),
        DrumMapsHtml {
            meta: drum_maps_meta(&site.index, texts),
            frame: Frame::new(
                manifest,
                texts,
                Some(NavTarget::DrumMaps),
                None,
                &DRUM_MAPS_PAGE,
                PageKind::DrumMaps,
            ),
            texts,
            page: &site.index,
            steps: shown_steps(DRUM_MAP_STEPS, |_| false),
            daws: daw_steps(texts),
        }
        .render()?,
    ));
    for p in &site.engines {
        let path = p.engine.href();
        out.push((
            path.in_locale(texts.locale).file(),
            EngineHtml {
                meta: engine_meta(p, texts),
                frame: frame(p.page(), PageKind::Engine, trail(&p.engine.name, &path)),
                texts,
                intro: texts.say(Phrase::maps_engine_intro(&p.engine.name, p.total)),
                page: p,
            }
            .render()?,
        ));
    }
    for p in &site.pairs {
        let path = p.href();
        out.push((
            path.in_locale(texts.locale).file(),
            PairHtml {
                meta: pair_meta(p, texts),
                frame: frame(p.page(), PageKind::Pair, trail(&p.title(), &path)),
                texts,
                heading: pair_heading(p, texts),
                summary: pair_summary(texts, &p.src.name, &p.tgt.name, p.tally),
                rack: texts.say(Phrase::maps_pair_rack(with_midi(&p.src.name), &p.tgt.name)),
                steps: converter_steps(&[ConverterStep::Engines]),
                page: p,
            }
            .render()?,
        ));
    }
    Ok(out)
}

fn render_sections(
    manifest: &SiteManifest,
    texts: &Texts,
) -> Result<Vec<(String, String)>, askama::Error> {
    let mut out = vec![];
    for &k in SectionKey::ALL {
        let Some(blocks) = texts.docs.blocks(texts.locale, k) else {
            continue;
        };
        let target = NavTarget::Section(k);
        let path = href(target, texts.locale, texts.docs);
        let page = ContentPage {
            heading: texts.get(k.heading()),
            blocks,
        };
        out.push((
            path.file(),
            ContentHtml {
                meta: section_meta(k, texts),
                frame: Frame::new(
                    manifest,
                    texts,
                    Some(target),
                    section_schema(k, &page, texts),
                    &Page::Section(k),
                    PageKind::Doc,
                ),
                texts,
                page: &page,
                steps: converter_steps(&[]),
                closing: k.closing(),
            }
            .render()?,
        ));
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use std::{collections::HashSet, sync::LazyLock};

    use midiremap_core::Catalog;
    use scraper::{ElementRef, Html, Selector};

    use super::*;
    use crate::{
        meta::{fit, DESCRIPTION_MAX},
        pages::MAJORS,
        routes::pair_href,
    };

    const ORIGIN: &str = "https://drumverter.com";

    const STATIC_ASSETS: [&str; 6] = [
        "/favicon.ico",
        "/favicon-32x32.png",
        "/favicon-16x16.png",
        "/icon-192.png",
        "/apple-touch-icon.png",
        "/site.webmanifest",
    ];

    const BEACON_TAG: &str = r#"<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&#34;token&#34;: &#34;t&#34;}"></script>"#;
    const STATS_TAG: &str = r#"<script defer src="https://cloud.umami.is/script.js" data-domains="example.com" data-website-id="w"></script>"#;

    const LOCALE_TAG: &str = r#"<script type="module" src="/assets/site-locale-test.js"></script>"#;
    const PRELOAD_TAG: &str = r#"<link rel="modulepreload" href="/assets/storage-test.js" />"#;
    const FILTER_TAG: &str = r#"<script src="/filter.js" defer></script>"#;

    fn manifest() -> SiteManifest {
        let attrs = |pairs: &[(&str, &str)]| {
            pairs
                .iter()
                .map(|&(name, value)| (name.to_owned(), value.to_owned()))
                .collect()
        };
        SiteManifest {
            stylesheet: "/assets/index-test.css".to_owned(),
            content_security_policy: "default-src 'self'".to_owned(),
            analytics: vec![
                AnalyticsScript {
                    src: "https://static.cloudflareinsights.com/beacon.min.js".to_owned(),
                    attrs: attrs(&[("data-cf-beacon", r#"{"token": "t"}"#)]),
                },
                AnalyticsScript {
                    src: "https://cloud.umami.is/script.js".to_owned(),
                    attrs: attrs(&[("data-website-id", "w"), ("data-domains", "example.com")]),
                },
            ],
            locale_script: LocaleScript {
                src: "/assets/site-locale-test.js".to_owned(),
                preload: vec!["/assets/storage-test.js".to_owned()],
            },
        }
    }

    fn rendered() -> &'static [(String, String)] {
        static RENDERED: LazyLock<Vec<(String, String)>> = LazyLock::new(|| {
            let messages = crate::fixtures::messages();
            let docs = crate::fixtures::docs();
            render_site(crate::fixtures::site(), &manifest(), messages, docs).unwrap()
        });
        &RENDERED
    }

    #[test]
    fn every_page_carries_the_policy_from_the_manifest() {
        for (path, html) in rendered() {
            let head = html.split("</head>").next().unwrap();
            assert!(
                head.contains(
                    r#"<meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;" />"#
                ),
                "{path}"
            );
        }
    }

    #[test]
    fn every_page_carries_the_beacon_script_from_the_manifest() {
        for (path, html) in rendered() {
            assert_eq!(html.matches(BEACON_TAG).count(), 1, "{path}");
        }
    }

    #[test]
    fn every_page_carries_the_stats_script_from_the_manifest() {
        for (path, html) in rendered() {
            assert_eq!(html.matches(STATS_TAG).count(), 1, "{path}");
        }
    }

    #[test]
    fn no_page_shows_an_unformatted_placeable() {
        for (path, html) in rendered() {
            assert!(!html.contains("{$"), "{path}");
            assert!(!html.contains("{ $"), "{path}");
        }
    }

    #[test]
    fn no_page_runs_inline_script() {
        for (path, html) in rendered() {
            for tag in html.split("<script").skip(1) {
                let open = tag.split('>').next().unwrap();
                assert!(
                    open.contains("src=") || open.contains(r#"type="application/ld+json""#),
                    "{path}: <script{open}>"
                );
            }
        }
    }

    #[test]
    fn every_static_page_loads_the_locale_script() {
        for (path, html) in rendered() {
            assert_eq!(html.matches(LOCALE_TAG).count(), 1, "{path}");
        }
    }

    #[test]
    fn every_static_page_preloads_the_locale_chunks() {
        for (path, html) in rendered() {
            assert_eq!(html.matches(PRELOAD_TAG).count(), 1, "{path}");
        }
    }

    #[test]
    fn the_note_map_index_loads_the_filter_script() {
        assert!(page("engines/index.html").contains(FILTER_TAG));
    }

    #[test]
    fn an_engine_page_loads_the_filter_script() {
        assert!(page("engines/ezdrummer/index.html").contains(FILTER_TAG));
    }

    #[test]
    fn a_pair_page_does_not_load_the_filter_script() {
        assert!(!page("convert/addictive-drums2-to-ezdrummer/index.html").contains(FILTER_TAG));
    }

    fn page(path: &str) -> &'static str {
        rendered()
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, h)| h.as_str())
            .unwrap()
    }

    #[test]
    fn every_page_links_the_app_stylesheet() {
        for (path, html) in rendered() {
            assert!(
                html.contains(&format!(
                    r#"<link rel="stylesheet" href="{}""#,
                    manifest().stylesheet
                )),
                "{path}"
            );
        }
    }

    #[test]
    fn no_page_has_inline_styles() {
        for (path, html) in rendered() {
            assert!(
                !html.contains("<style") && !html.contains("style=\""),
                "{path}"
            );
        }
    }

    fn templates() -> Vec<(String, String)> {
        let root = concat!(env!("CARGO_MANIFEST_DIR"), "/");
        let mut files: Vec<_> = std::fs::read_dir(format!("{root}templates"))
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .collect();
        files.push(format!("{root}static/filter.js").into());
        files.sort();
        files
            .into_iter()
            .map(|path| {
                let name = path.file_name().unwrap().to_string_lossy().into_owned();
                (name, std::fs::read_to_string(&path).unwrap())
            })
            .collect()
    }

    #[test]
    fn the_template_scan_sees_every_template() {
        let names: Vec<_> = templates().into_iter().map(|(name, _)| name).collect();
        for expected in ["app_head.html", "app_noscript.html", "thanks.html"] {
            assert!(names.iter().any(|name| name == expected), "{expected}");
        }
        assert!(names.len() >= 14, "{names:?}");
    }

    #[test]
    fn templates_use_no_arbitrary_text_sizes() {
        for (name, t) in templates() {
            let banned = "text-[";
            assert!(!t.contains(banned), "{name}: {banned}");
        }
    }

    #[test]
    fn templates_use_no_arbitrary_radii() {
        for (name, t) in templates() {
            let banned = "rounded-[";
            assert!(!t.contains(banned), "{name}: {banned}");
        }
    }

    #[test]
    fn templates_use_no_text_t6() {
        for (name, t) in templates() {
            let banned = "text-t6";
            assert!(!t.contains(banned), "{name}: {banned}");
        }
    }

    #[test]
    fn templates_use_no_inline_style_attributes() {
        for (name, t) in templates() {
            let banned = "style=";
            assert!(!t.contains(banned), "{name}: {banned}");
        }
    }

    #[test]
    fn templates_use_no_style_elements() {
        for (name, t) in templates() {
            let banned = "<style";
            assert!(!t.contains(banned), "{name}: {banned}");
        }
    }

    fn current_nav(html: &str) -> Vec<String> {
        html.split("aria-current=\"page\"")
            .skip(1)
            .filter_map(|rest| rest.split('>').nth(1))
            .map(|label| label.split('<').next().unwrap_or("").trim().to_string())
            .collect()
    }

    fn locale_and_rest(path: &str) -> (Locale, &str) {
        let locale = Locale::ALL
            .iter()
            .copied()
            .find(|l| !l.prefix().is_empty() && path.starts_with(&format!("{}/", l.prefix())))
            .unwrap_or(Locale::En);
        let rest = path.trim_start_matches(&format!("{}/", locale.prefix()));
        (locale, rest)
    }

    #[test]
    fn every_page_labels_its_navigation_landmarks() {
        let messages = crate::fixtures::messages();
        for (path, html) in rendered() {
            let (locale, _) = locale_and_rest(path);
            let aria = |nav| format!(r#"<nav aria-label="{}""#, messages.get(locale, nav));
            assert!(html.contains(&aria(Plain::NavMain)), "{path}");
            assert!(html.contains(&aria(Plain::NavSite)), "{path}");
        }
    }

    #[test]
    fn header_marks_the_current_section() {
        let messages = crate::fixtures::messages();
        for (path, html) in rendered() {
            let (locale, rest) = locale_and_rest(path);
            let expected: Vec<&str> =
                if rest.starts_with("engines/") || rest.starts_with("convert/") {
                    vec![messages.get(locale, Plain::NavNoteMaps)]
                } else if rest == "faq/index.html" {
                    vec![messages.get(locale, SectionKey::Faq.label())]
                } else if rest == "how-it-works/index.html" {
                    vec![messages.get(locale, SectionKey::Guide.label())]
                } else if rest == "drum-maps/index.html" {
                    vec![messages.get(locale, Plain::NavDrumMaps)]
                } else {
                    vec![]
                };
            assert_eq!(current_nav(html), expected, "{path}");
        }
    }

    #[test]
    fn the_header_stays_out_of_search_snippets() {
        for (path, html) in rendered() {
            let body = html.split("<body").nth(1).unwrap();
            let before_header = body.split("<header").next().unwrap();
            assert!(
                before_header.contains("<div data-nosnippet>"),
                "{path}: header"
            );
        }
    }

    #[test]
    fn the_footer_stays_out_of_search_snippets() {
        for (path, html) in rendered() {
            let body = html.split("<body").nth(1).unwrap();
            let footer = body.split("<footer").nth(1).unwrap();
            assert!(
                footer
                    .split("<nav")
                    .next()
                    .unwrap()
                    .contains("<div data-nosnippet>"),
                "{path}: footer"
            );
        }
    }

    #[test]
    fn pages_offer_a_large_icon_for_search_results() {
        for (path, html) in rendered() {
            assert!(
                html.contains(
                    r#"<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />"#
                ),
                "{path}"
            );
        }
    }

    #[test]
    fn footer_links_are_centred() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert!(footer.contains("justify-center"));
    }

    #[test]
    fn the_footer_carries_no_trademark_notice() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert!(!footer.contains("trademarks"));
    }

    #[test]
    fn footer_links_are_gold() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert_eq!(
            footer.matches("<a ").count(),
            footer.matches(r#"class="prose-link"#).count()
        );
    }

    #[test]
    fn every_footer_ends_with_a_tip_link_opening_in_a_new_tab() {
        let tip = format!(
            r#"<a href="{TIP_HREF}" target="_blank" rel="noopener" class="prose-link tip-link">"#
        );
        for (path, html) in rendered() {
            let footer = html.split("<footer").nth(1).unwrap();
            let last = footer.split("<li>").last().unwrap();
            assert!(last.contains(&tip), "{path}");
        }
    }

    #[test]
    fn the_polish_tip_link_is_in_polish() {
        assert!(page("pl/faq/index.html").contains("Postaw mi kawę"));
    }

    fn thanks_page(pages: &[(String, String)], l: Locale) -> (String, &str) {
        let file = THANKS.in_locale(l).file();
        let html = pages
            .iter()
            .find(|(p, _)| *p == file)
            .map(|(_, h)| h.as_str())
            .unwrap_or_else(|| panic!("{file}"));
        (file, html)
    }

    #[test]
    fn the_thanks_page_is_kept_out_of_search_in_every_locale() {
        let pages = rendered();
        for &l in Locale::ALL {
            let (file, html) = thanks_page(pages, l);
            let head = html.split("</head>").next().unwrap();
            assert!(
                head.contains(r#"<meta name="robots" content="noindex" />"#),
                "{file}"
            );
        }
    }

    #[test]
    fn the_thanks_page_links_home_in_every_locale() {
        let pages = rendered();
        for &l in Locale::ALL {
            let (file, html) = thanks_page(pages, l);
            assert!(html.contains(&format!(r#"href="{}""#, home(l))), "{file}");
        }
    }

    #[test]
    fn the_english_thanks_page_says_thank_you() {
        assert!(page("thanks/index.html").contains(">Thank you!</h1>"));
    }

    #[test]
    fn the_faq_page_renders_its_section() {
        let faq = page("faq/index.html");
        assert!(faq.contains(">Frequently asked questions</h1>"));
        assert!(faq.contains("Is Drumverter free?"));
    }

    fn select<'a>(scope: ElementRef<'a>, css: &str) -> Vec<ElementRef<'a>> {
        scope.select(&Selector::parse(css).unwrap()).collect()
    }

    fn text(element: ElementRef) -> String {
        element.text().collect()
    }

    fn texts(html: &str, css: &str) -> Vec<String> {
        select(Html::parse_document(html).root_element(), css)
            .into_iter()
            .map(text)
            .collect()
    }

    fn attrs(html: &str, css: &str, name: &str) -> Vec<String> {
        select(Html::parse_document(html).root_element(), css)
            .into_iter()
            .filter_map(|e| e.value().attr(name).map(str::to_owned))
            .collect()
    }

    fn page_text(html: &str) -> String {
        text(Html::parse_document(html).root_element())
    }

    fn structured_data(html: &str) -> serde_json::Value {
        let scripts = texts(html, r#"script[type="application/ld+json"]"#);
        serde_json::from_str(&scripts[0]).unwrap()
    }

    #[test]
    fn the_faq_page_carries_structured_data() {
        for &l in Locale::ALL {
            let path = href(
                NavTarget::Section(SectionKey::Faq),
                l,
                crate::fixtures::docs(),
            );
            let html = page(&path.file());
            let names: Vec<String> = structured_data(html)["mainEntity"]
                .as_array()
                .unwrap()
                .iter()
                .map(|q| q["name"].as_str().unwrap().to_owned())
                .collect();
            assert_eq!(texts(html, "main h3"), names, "{}", l.code());
        }
    }

    #[test]
    fn the_faq_answers_link_a_conversion_table_and_the_drum_maps() {
        let html = page("faq/index.html");
        assert!(html.contains(r#"href="/convert/ggd-invasion-to-ezdrummer/" class="prose-link""#));
        assert!(html.contains(r#"href="/drum-maps/" class="prose-link""#));
        assert!(html.contains(r#"href="/report-an-issue/" class="prose-link""#));
    }

    #[test]
    fn the_faq_heads_its_parts_and_its_closing() {
        assert_eq!(
            texts(page("faq/index.html"), "main h2"),
            ["Converting", "Privacy and cost", "Ready to convert?"]
        );
    }

    #[test]
    fn the_guide_shows_every_converter_step_still_to_do() {
        assert_eq!(
            badges(page("how-it-works/index.html")),
            ["current", "later", "later"]
        );
    }

    #[test]
    fn the_guide_titles_its_steps_as_the_converter_does() {
        let titles: Vec<String> = texts(page("how-it-works/index.html"), "main h2")
            .into_iter()
            .take(3)
            .collect();
        assert_eq!(
            titles,
            [
                "Your drum file",
                "From one drum layout to another",
                "Convert"
            ]
        );
    }

    #[test]
    fn the_guides_structured_data_names_the_converters_steps() {
        let schema = structured_data(page("how-it-works/index.html"));
        assert_eq!(schema["step"][1]["name"], "From one drum layout to another");
    }

    fn ends_on_the_converters_button(path: &str) {
        let main = page(path).split("</main>").next().unwrap();
        let panel = main.rsplit(">Ready to convert?</h2>").next().unwrap();
        let tag = anchor_to(panel, "/");
        assert!(tag.contains(r#"class="cta""#), "{path}");
        assert!(opened_converter(tag), "{path}");
    }

    #[test]
    fn the_guide_ends_on_the_converters_button() {
        ends_on_the_converters_button("how-it-works/index.html");
    }

    #[test]
    fn the_faq_ends_on_the_converters_button() {
        ends_on_the_converters_button("faq/index.html");
    }

    fn ends_on_a_link_to_the_converter(path: &str) {
        let html = page(path);
        assert!(!html.contains(">Ready to convert?</h2>"), "{path}");
        let main = html.split("<main").nth(1).unwrap();
        assert!(
            anchor_to(main, "/").contains("prose-link text-ui"),
            "{path}"
        );
    }

    #[test]
    fn the_report_an_issue_page_ends_on_a_link_to_the_converter() {
        ends_on_a_link_to_the_converter("report-an-issue/index.html");
    }

    #[test]
    fn the_contact_page_ends_on_a_link_to_the_converter() {
        ends_on_a_link_to_the_converter("contact/index.html");
    }

    #[test]
    fn the_terms_end_on_a_link_to_the_converter() {
        ends_on_a_link_to_the_converter("terms/index.html");
    }

    #[test]
    fn the_report_an_issue_page_renders_its_section() {
        let issue = page("report-an-issue/index.html");
        assert!(issue.contains(r#"href="https://github.com/nullcrimson/remidi/issues""#));
        assert!(issue.contains(r#"<a href="https://tally.so/r/J95eYd" target="_blank""#));
    }

    #[test]
    fn the_report_an_issue_page_carries_no_structured_data() {
        let issue = page("report-an-issue/index.html");
        assert!(!issue.contains("application/ld+json"));
    }

    #[test]
    fn the_guide_links_the_note_maps() {
        let html = page("how-it-works/index.html");
        let main = html
            .split("<main")
            .nth(1)
            .unwrap()
            .split("</main>")
            .next()
            .unwrap();
        assert!(main.contains(r#"href="/engines/""#));
    }

    #[test]
    fn pair_pages_carry_an_octave_c1_switch() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"id="oct-c1""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_an_octave_c2_switch() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"id="oct-c2""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_a_show_all_switch() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"id="show-all""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_a_show_changes_switch() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"id="show-changes""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_exact_outcome_rows() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"data-outcome="exact""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_approximated_outcome_rows() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"data-outcome="approximated""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_octave_c1_note_names() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"data-oct="c1""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_octave_c2_note_names() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = r#"data-oct="c2""#;
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_pages_carry_a_reverse_direction_link() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let needle = "⇄ Reverse direction";
        assert!(html.contains(needle), "{needle}");
    }

    #[test]
    fn pair_counts_use_the_tag_utility() {
        for p in &crate::fixtures::site().pairs {
            let html = page(&p.href().in_locale(Locale::En).file());
            let shown =
                1 + usize::from(p.tally.approximated > 0) + usize::from(p.tally.dropped > 0);
            let tags = attrs(html, "span.tag", "data-tone");
            assert_eq!(tags.len(), shown, "{}", p.slug());
            assert_eq!(tags[0], "neutral", "{}", p.slug());
            assert!(
                tags.iter()
                    .all(|t| ["neutral", "bright", "danger"].contains(&t.as_str())),
                "{}",
                p.slug()
            );
            assert!(!html.contains(r#"data-tone="gold""#), "{}", p.slug());
        }
    }

    #[test]
    fn pair_pages_say_what_changes() {
        let html = page("convert/ggd-invasion-to-ezdrummer/index.html");
        let section = html
            .split(">What changes</h2>")
            .nth(1)
            .and_then(|rest| rest.split("</section>").next())
            .unwrap();
        assert!(section.contains(r#"<ul class="merge-list">"#));
        assert!(section.contains("<li><b>Crash 1</b> "));
        assert!(section.contains(" <span>plays "));
        assert!(section.contains(", "));
        assert!(
            html.find(">What changes</h2>").unwrap()
                < html.find(">Every note, drum by drum</h2>").unwrap()
        );
    }

    fn pair_page(p: &PairPage) -> &'static str {
        page(&p.href().in_locale(Locale::En).file())
    }

    #[test]
    fn a_pair_page_without_changes_says_every_note_lands_on_its_own_drum() {
        for p in &crate::fixtures::site().pairs {
            let none = format!(
                "Every {} note lands on its own drum in {}.",
                p.src.name, p.tgt.name
            );
            assert_eq!(
                page_text(pair_page(p)).contains(&none),
                p.tally.changes() == 0,
                "{}",
                p.slug()
            );
        }
    }

    #[test]
    fn a_pair_page_lists_merged_drums_only_when_it_approximates_some() {
        for p in &crate::fixtures::site().pairs {
            assert_eq!(
                !texts(pair_page(p), "ul.merge-list").is_empty(),
                p.tally.approximated > 0,
                "{}",
                p.slug()
            );
        }
    }

    #[test]
    fn a_pair_page_names_the_drums_the_target_lacks_only_when_it_drops_some() {
        for p in &crate::fixtures::site().pairs {
            assert_eq!(
                page_text(pair_page(p)).contains(&format!("{} has no drum for ", p.tgt.name)),
                p.tally.dropped > 0,
                "{}",
                p.slug()
            );
        }
    }

    #[test]
    fn an_all_exact_group_hides_with_the_exact_rows() {
        for p in &crate::fixtures::site().pairs {
            let html = page(&p.href().in_locale(Locale::En).file());
            let groups: Vec<(bool, &str)> = html
                .split("<tbody")
                .skip(1)
                .map(|rest| {
                    let (open, body) = rest.split_once('>').unwrap();
                    (open == r#" data-outcome="exact""#, body)
                })
                .collect();
            assert_eq!(groups.len(), p.groups.len(), "{}", p.slug());
            for ((hidden, body), g) in groups.iter().zip(&p.groups) {
                assert_eq!(*hidden, g.all_exact(), "{}: {}", p.slug(), g.family);
                assert!(
                    body.starts_with(&format!(
                        "\n<tr><th scope=\"rowgroup\" colspan=\"6\">{}</th></tr>",
                        g.family
                    )),
                    "{}",
                    p.slug()
                );
            }
        }
    }

    fn stylesheet() -> String {
        std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../app/src/index.css"))
            .unwrap()
    }

    fn badges(html: &str) -> Vec<String> {
        attrs(html, ".step-badge", "data-state")
    }

    #[test]
    fn pair_pages_mark_the_engine_step_done() {
        for p in &crate::fixtures::site().pairs {
            let html = page(&p.href().in_locale(Locale::En).file());
            assert_eq!(badges(html), ["current", "done", "later"], "{}", p.slug());
            let steps = html.split(r#"<ol class="step-list""#).nth(1).unwrap();
            let engines = steps.split("<li>").nth(2).unwrap();
            assert!(
                engines.contains(
                    "From one drum layout to another<span class=\"sr-only\"> · done</span>"
                ),
                "{}",
                p.slug()
            );
        }
    }

    #[test]
    fn pair_pages_keep_the_converter_in_reach_on_a_phone() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let row = html
            .split(r#"<div class="sticky top-0 z-10 -my-3 bg-card py-3 sm:static">"#)
            .nth(1)
            .and_then(|rest| rest.split("</div>").next())
            .unwrap();
        let cta = anchor_to(row, "/#from=addictive_drums2&amp;to=ezdrummer");
        assert!(opened_converter(cta));
        assert_eq!(html.matches("sticky top-0").count(), 1);
    }

    #[test]
    fn index_matrix_names_the_pair_links_from_general_midi() {
        let html = page("engines/index.html");
        assert_eq!(html.matches(r#"aria-label="General MIDI to "#).count(), 7);
    }

    #[test]
    fn index_matrix_links_fifty_six_named_pairs() {
        let html = page("engines/index.html");
        let cells: Vec<&str> = anchors(html)
            .into_iter()
            .filter(|a| {
                a.contains(r#"href="/convert/"#) && a.contains(r#"% of notes map exactly""#)
            })
            .collect();
        assert_eq!(cells.len(), 56);
    }

    #[test]
    fn index_matrix_cells_show_the_share_of_exact_notes() {
        let html = page("engines/index.html");
        let matrix = html
            .split(">Every pair between the top 8</h2>")
            .nth(1)
            .unwrap();
        for row in &crate::fixtures::site().index.matrix {
            for cell in row.cells.iter().flatten() {
                let tag = anchor_to(matrix, &cell.link.href().to_string());
                let percent = cell.tally.exact_percent();
                assert!(
                    tag.contains(&format!(r#": {percent}% of notes map exactly""#)),
                    "{}",
                    cell.link.slug
                );
            }
        }
    }

    #[test]
    fn the_index_offers_a_card_for_every_popular_pair() {
        let html = page("engines/index.html");
        let cards = html.split(">Popular conversions</h2>").nth(1).unwrap();
        let cards = cards.split("</section>").next().unwrap();
        let hrefs: Vec<String> = crate::fixtures::site()
            .popular
            .iter()
            .map(|s| s.link.href().to_string())
            .collect();
        let linked: Vec<&str> = anchors(cards)
            .into_iter()
            .filter_map(|a| a.split(r#"href=""#).nth(1))
            .filter_map(|rest| rest.split('"').next())
            .collect();
        assert_eq!(linked, hrefs);
    }

    #[test]
    fn the_index_links_the_most_used_engines_with_their_note_counts() {
        let html = page("engines/index.html");
        let quick = html
            .split(r#"<ul aria-label="Most used engines" data-filtering-hides class="link-chips">"#)
            .nth(1)
            .and_then(|rest| rest.split("</ul>").next())
            .unwrap();
        for m in &crate::fixtures::site().index.majors {
            assert!(
                quick.contains(&format!(
                    r#"href="{}">{}<span class="font-mono text-caption text-t5">{} notes</span>"#,
                    m.link.href(),
                    m.link.name,
                    m.notes
                )),
                "{}",
                m.link.id
            );
        }
    }

    #[test]
    fn the_index_hides_its_shortcuts_while_the_filter_has_text() {
        assert_eq!(
            page("engines/index.html")
                .matches(" data-filtering-hides ")
                .count(),
            3
        );
        assert!(stylesheet().contains(
            ":root:has([data-filter='engines']:not(:placeholder-shown)) [data-filtering-hides]"
        ));
    }

    fn url_of(path: &str) -> String {
        format!("/{}", path.trim_end_matches("index.html"))
    }

    #[test]
    fn a_description_longer_than_a_snippet_stays_whole() {
        let long = "A whole sentence well past the limit.".to_owned();
        let longer = format!("{long} And another one.");
        assert_eq!(fit(&longer, std::slice::from_ref(&long), &[], 10), long);
    }

    fn in_locale<R>(locale: Locale, f: impl FnOnce(&Texts) -> R) -> R {
        let messages = crate::fixtures::messages();
        let docs = crate::fixtures::docs();
        f(&Texts {
            messages,
            docs,
            locale,
        })
    }

    #[test]
    fn engine_titles_lead_with_the_keyword() {
        let site = crate::fixtures::site();
        for p in &site.engines {
            let title = in_locale(Locale::En, |t| engine_meta(p, t).title());
            let head: String = title.chars().take(60).collect();
            assert!(head.contains("MIDI Note Map"), "{title}");
        }
    }

    #[test]
    fn descriptions_end_on_a_whole_sentence() {
        let site = crate::fixtures::site();
        for &l in Locale::ALL {
            in_locale(l, |t| {
                let descriptions = site
                    .engines
                    .iter()
                    .map(|p| engine_meta(p, t).description)
                    .chain(site.pairs.iter().map(|p| pair_meta(p, t).description))
                    .chain(std::iter::once(index_meta(&site.index, t).description));
                for d in descriptions {
                    assert!(d.ends_with(['.', '。']), "{d}");
                }
            });
        }
    }

    #[test]
    fn every_page_has_one_h1() {
        for (path, html) in rendered() {
            assert_eq!(html.matches("<h1").count(), 1, "{path}");
        }
    }

    #[test]
    fn every_page_has_a_title() {
        for (path, html) in rendered() {
            assert!(
                html.contains("<title>") && !html.contains("<title></title>"),
                "{path}"
            );
        }
    }

    #[test]
    fn every_page_has_its_canonical() {
        for (path, html) in rendered() {
            let canonical = format!(r#"<link rel="canonical" href="{ORIGIN}{}""#, url_of(path));
            assert!(html.contains(&canonical), "{path}");
        }
    }

    #[test]
    fn midi_is_never_doubled_after_an_engine_name() {
        for (path, html) in rendered() {
            assert!(!html.contains("MIDI MIDI"), "{path}");
        }
    }

    #[test]
    fn every_internal_link_resolves() {
        let pages = rendered();
        let mut known: HashSet<String> = pages.iter().map(|(p, _)| url_of(p)).collect();
        known.extend(Locale::ALL.iter().map(|&l| home(l).to_string()));
        known.insert(manifest().stylesheet);
        known.extend(manifest().locale_script.preload);
        known.extend(STATIC_ASSETS.iter().map(|s| s.to_string()));
        known.extend(
            crate::fixtures::site()
                .files()
                .map(|(path, _)| path.to_string()),
        );
        known.extend(
            crate::fixtures::site()
                .engines
                .iter()
                .map(|p| p.engine.note_map().href.to_string()),
        );
        for (path, html) in pages {
            for href in html
                .split("href=\"")
                .skip(1)
                .filter_map(|s| s.split('"').next())
            {
                let target = href.split(['?', '#']).next().unwrap_or(href);
                if target.starts_with('/') {
                    assert!(known.contains(target), "{path} links to missing {href}");
                }
            }
        }
    }

    fn english_summary(counts: Tally) -> String {
        in_locale(Locale::En, |t| pair_summary(t, "A", "B", counts))
    }

    #[test]
    fn pair_summary_agrees_in_number_for_single_counts() {
        assert_eq!(
            english_summary(
                Tally {
                    exact: 1,
                    approximated: 1,
                    dropped: 1
                }
            ),
            "Of 3 A notes, 1 maps exactly to B, 1 is approximated with the closest available drum, and 1 has no equivalent."
        );
    }

    #[test]
    fn pair_summary_agrees_in_number_for_plural_counts() {
        assert_eq!(
            english_summary(
                Tally {
                    exact: 2,
                    approximated: 0,
                    dropped: 3
                }
            ),
            "Of 5 A notes, 2 map exactly to B, 0 are approximated with the closest available drum, and 3 have no equivalent."
        );
    }

    #[test]
    fn pair_pages_name_the_source_drum_column() {
        let html = page("convert/ggd-invasion-to-ezdrummer/index.html");
        assert!(html.contains(">GetGood Drums Invasion drum</th>"));
    }

    #[test]
    fn pair_pages_name_the_target_drum_column() {
        let html = page("convert/ggd-invasion-to-ezdrummer/index.html");
        assert!(html.contains(">EZdrummer 3 drum</th>"));
    }

    #[test]
    fn pair_pages_have_no_unnamed_drum_column() {
        let html = page("convert/ggd-invasion-to-ezdrummer/index.html");
        assert!(!html.contains(">Drum</th>"));
    }

    #[test]
    fn converter_links_carry_known_distinct_engine_ids() {
        let maps = Catalog::builtin();
        let ids: HashSet<&str> = maps.ids().collect();
        let mut checked = 0;
        for (path, html) in rendered() {
            for href in html
                .split("href=\"")
                .skip(1)
                .filter_map(|s| s.split('"').next())
                .filter(|h| h.starts_with("/#"))
            {
                let query = href.trim_start_matches("/#").replace("&amp;", "&");
                let params: Vec<(&str, &str)> = query
                    .split('&')
                    .filter_map(|kv| kv.split_once('='))
                    .collect();
                assert!(!params.is_empty(), "{path}: {href}");
                for (key, id) in &params {
                    assert!(matches!(*key, "from" | "to"), "{path}: {href}");
                    assert!(ids.contains(id), "{path}: unknown engine in {href}");
                }
                if let [(_, a), (_, b)] = params.as_slice() {
                    assert_ne!(a, b, "{path}: {href}");
                }
                checked += 1;
            }
        }
        let site = crate::fixtures::site();
        let unpaired = site.pairs.iter().filter(|p| p.reverse.is_none()).count();
        assert_eq!(
            checked,
            site.engines.len() * 2 + site.pairs.len() + unpaired
        );
    }

    #[test]
    fn names_are_escaped() {
        let mm = page("engines/ggd-modernmassive/index.html");
        let schema = texts(mm, r#"script[type="application/ld+json"]"#).concat();
        let markup = mm.replace(&schema, "");
        assert!(markup.contains("Modern &amp; Massive") || markup.contains("Modern &#38; Massive"));
        assert!(!markup.contains("Modern & Massive"));
    }

    #[test]
    fn names_keep_their_accents() {
        let mj = page("engines/solemntones-mjolnir/index.html");
        assert!(mj.contains("Mjölnir"));
    }

    fn description_fits(d: String) -> bool {
        d.chars().count() <= DESCRIPTION_MAX
    }

    #[test]
    fn engine_descriptions_fit() {
        let site = crate::fixtures::site();
        in_locale(Locale::En, |t| {
            assert!(site
                .engines
                .iter()
                .all(|p| description_fits(engine_meta(p, t).description)));
        });
    }

    #[test]
    fn pair_descriptions_fit() {
        let site = crate::fixtures::site();
        in_locale(Locale::En, |t| {
            let long: Vec<String> = site
                .pairs
                .iter()
                .map(|p| pair_meta(p, t).description)
                .filter(|d| d.chars().count() > DESCRIPTION_MAX)
                .collect();
            assert_eq!(long, Vec::<String>::new());
        });
    }

    #[test]
    fn the_index_description_fits() {
        let site = crate::fixtures::site();
        in_locale(Locale::En, |t| {
            assert!(description_fits(index_meta(&site.index, t).description));
        });
    }

    #[test]
    fn a_polish_page_declares_polish() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"<html lang="pl">"#));
    }

    #[test]
    fn the_polish_faq_has_a_polish_heading() {
        let html = page("pl/faq/index.html");
        let messages = crate::fixtures::messages();
        let heading = messages.get(Locale::Pl, SectionKey::Faq.heading());
        assert_ne!(heading, messages.get(Locale::En, SectionKey::Faq.heading()));
        assert!(html.contains(&format!(">{heading}<")));
    }

    #[test]
    fn the_polish_faq_has_polish_questions() {
        let html = page("pl/faq/index.html");
        assert!(html.contains("Czy Drumverter jest darmowy?"));
    }

    #[test]
    fn polish_pages_link_the_polish_faq() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"href="/pl/faq/""#));
    }

    #[test]
    fn polish_pages_link_the_polish_terms() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"href="/pl/terms/""#));
    }

    #[test]
    fn polish_pages_link_the_polish_converter() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"href="/pl/""#));
    }

    #[test]
    fn every_page_offers_the_language_menu() {
        for (path, html) in rendered() {
            assert!(html.contains(r#"id="language-menu""#), "{path}");
        }
    }

    #[test]
    fn every_language_menu_lists_polish() {
        for (path, html) in rendered() {
            assert!(html.contains(">Polski<"), "{path}");
        }
    }

    #[test]
    fn an_engine_page_menu_links_each_language_to_the_same_page() {
        let html = page("engines/ezdrummer/index.html");
        assert!(html.contains(r#"href="/pl/engines/ezdrummer/" hreflang="pl""#));
    }

    fn polish(phrase: Phrase) -> String {
        crate::fixtures::messages().say(Locale::Pl, phrase)
    }

    #[test]
    fn polish_engine_pages_have_a_polish_heading() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(html.contains(&polish(Phrase::maps_engine_heading("EZdrummer 3"))));
    }

    #[test]
    fn polish_engine_pages_open_the_polish_converter() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(html.contains(r#"href="/pl/#to=ezdrummer""#));
    }

    #[test]
    fn engine_pages_offer_a_drum_map_for_each_daw() {
        let html = page("engines/ggd-invasion/index.html");
        let reaper = anchor_to(html, "/drum-maps/files/ggd-invasion.txt");
        assert!(reaper.contains(r#"download="GetGood Drums Invasion (Drumverter).txt""#));
        assert!(reaper.contains(r#"aria-label="GetGood Drums Invasion drum map for Reaper""#));
        assert!(html.contains(r#"href="/drum-maps/files/ggd-invasion.drm""#));
        assert!(html.contains(r#"href="/drum-maps/files/ggd-invasion.pitchlist""#));
    }

    fn download_wrapper<'a>(html: &'a str, href: &str) -> &'a str {
        let link = html.find(&format!(r#"href="{href}""#)).unwrap();
        let start = html[..link].rfind("<span ").unwrap();
        &html[start..start + html[start..].find('>').unwrap()]
    }

    #[test]
    fn a_drum_map_link_is_no_stats_element_so_the_browser_downloads_it() {
        let html = page("engines/ggd-invasion/index.html");
        let reaper = anchor_to(html, "/drum-maps/files/ggd-invasion.txt");
        assert!(!reaper.contains("data-umami-event"));
    }

    #[test]
    fn a_drum_map_download_tells_the_stats_what_was_downloaded_where() {
        let html = page("engines/ggd-invasion/index.html");
        let cubase = download_wrapper(html, "/drum-maps/files/ggd-invasion.drm");
        assert!(cubase.contains(r#"data-umami-event="drum-map-downloaded""#));
        assert!(cubase.contains(r#"data-umami-event-engine="ggd_invasion""#));
        assert!(cubase.contains(r#"data-umami-event-daw="cubase""#));
        assert!(cubase.contains(r#"data-umami-event-page="engine""#));
    }

    const INVASION_TO_EZDRUMMER: &str = "convert/ggd-invasion-to-ezdrummer/index.html";
    const RACK: &str = "/drum-maps/files/racks/ggd-invasion-to-ezdrummer.adg";

    #[test]
    fn a_pair_page_offers_its_rack_outside_the_sticky_bar() {
        let html = page(INVASION_TO_EZDRUMMER);
        let rack = anchor_to(html, RACK);
        assert!(rack.contains(r#"download="GetGood Drums Invasion to EZdrummer 3.adg""#));
        let bar = html.find(r#"<div class="sticky top-0"#).unwrap();
        let bar_end = bar + html[bar..].find("</div>").unwrap();
        assert!(html.find(&format!(r#"href="{RACK}""#)).unwrap() > bar_end);
    }

    #[test]
    fn a_rack_link_is_no_stats_element_so_the_browser_downloads_it() {
        assert!(!anchor_to(page(INVASION_TO_EZDRUMMER), RACK).contains("data-umami-event"));
    }

    #[test]
    fn a_rack_download_tells_the_stats_it_came_from_a_pair_page() {
        let wrapper = download_wrapper(page(INVASION_TO_EZDRUMMER), RACK);
        assert!(wrapper.contains(r#"data-umami-event="rack-downloaded""#));
        assert!(wrapper.contains(r#"data-umami-event-where="pair""#));
    }

    #[test]
    fn a_pair_page_says_dropped_drums_stay_silent_only_when_it_drops_some() {
        let silent = "stay silent; their rows show only a note name.";
        assert!(page("convert/superior-drummer3-to-general-midi/index.html")
            .contains(&format!("Drums General MIDI lacks {silent}")));
        assert!(!page(INVASION_TO_EZDRUMMER).contains(silent));
    }

    #[test]
    fn polish_engine_pages_link_the_same_drum_map_files_and_the_polish_guide() {
        let html = page("pl/engines/ggd-invasion/index.html");
        assert!(html.contains(r#"href="/drum-maps/files/ggd-invasion.txt""#));
        assert!(html.contains(r#"href="/pl/drum-maps/""#));
    }

    #[test]
    fn engine_descriptions_mention_the_drum_maps_when_they_fit() {
        let html = page("engines/bfd3/index.html");
        assert!(html.contains("Free Cubase, Reaper, Studio One, Ableton and Logic drum maps."));
    }

    #[test]
    fn an_ableton_download_tells_the_stats_daw_ableton() {
        let html = page("engines/ggd-invasion/index.html");
        let ableton = download_wrapper(html, "/drum-maps/files/ggd-invasion.adg");
        assert!(ableton.contains(r#"data-umami-event-daw="ableton""#));
    }

    #[test]
    fn an_engine_page_links_its_note_map_pdf() {
        let html = page("engines/ggd-invasion/index.html");
        let href = "/drum-maps/files/ggd-invasion-note-map.pdf";
        let stats = download_wrapper(html, href);
        assert!(stats.contains(r#"data-umami-event="note-map-downloaded""#));
        assert!(stats.contains(r#"data-umami-event-engine="ggd_invasion""#));
        assert!(html.contains(&format!(
            r#"href="{href}" download="GetGood Drums Invasion note map (Drumverter).pdf" aria-label="GetGood Drums Invasion note map (PDF)""#
        )));
        assert!(page("pl/engines/ggd-invasion/index.html")
            .contains(r#"href="/drum-maps/files/ggd-invasion-note-map.pdf""#));
    }

    #[test]
    fn the_drum_maps_page_offers_each_note_map_pdf_beside_the_daw_files() {
        let html = page("drum-maps/index.html");
        let href = "/drum-maps/files/ggd-invasion-note-map.pdf";
        let stats = download_wrapper(html, href);
        assert!(stats.contains(r#"data-umami-event-page="drum-maps""#));
        assert!(stats.contains(r#"data-daw="pdf""#));
        let picked: Vec<String> = attrs(html, r#"input[name="daw"]"#, "id");
        assert_eq!(picked.last().map(String::as_str), Some("daw-pdf"));
        let after_logic = html
            .split(r#"href="/drum-maps/files/ggd-invasion.pattern""#)
            .nth(1)
            .unwrap();
        let next_link = after_logic.find("href=").unwrap();
        assert!(after_logic[next_link..].starts_with(&format!(r#"href="{href}""#)));
    }

    #[test]
    fn every_download_chip_shows_the_download_icon() {
        for path in ["engines/ggd-invasion/index.html", "drum-maps/index.html"] {
            let html = Html::parse_document(page(path));
            let chips = select(html.root_element(), ".link-chips a[download]");
            assert!(chips.len() > Daw::ALL.len(), "{path}");
            for chip in chips {
                assert!(
                    !select(chip, r#"svg[aria-hidden="true"]"#).is_empty(),
                    "{}",
                    chip.html()
                );
            }
        }
    }

    #[test]
    fn the_unsupported_daws_line_names_fl_studio_and_bitwig() {
        assert!(page("drum-maps/index.html")
            .contains("FL Studio and Bitwig Studio cannot load note-name files."));
    }

    #[test]
    fn every_locale_has_a_drum_maps_page() {
        let pages = rendered();
        for &l in Locale::ALL {
            let file = DRUM_MAPS.in_locale(l).file();
            assert!(pages.iter().any(|(p, _)| *p == file), "{file}");
        }
    }

    #[test]
    fn the_drum_maps_page_offers_every_engine_in_every_format() {
        let html = page("drum-maps/index.html");
        let site = crate::fixtures::site();
        assert_eq!(
            html.matches(r#"data-umami-event="drum-map-downloaded""#)
                .count(),
            site.drum_map_files.len() + site.index.majors.len() * Daw::ALL.len()
        );
        assert!(download_wrapper(html, "/drum-maps/files/ssd5.drm")
            .contains(r#"data-umami-event-page="drum-maps""#));
    }

    #[test]
    fn every_daw_has_a_picker_rule_in_the_stylesheet() {
        let css = stylesheet();
        for daw in Daw::ALL {
            let key = daw.key();
            assert!(
                css.contains(&format!(
                    ":root:has(#daw-{key}:checked) [data-daw]:not([data-daw='{key}'])"
                )),
                "{key}"
            );
        }
    }

    #[test]
    fn the_drum_maps_page_picks_reaper_until_another_daw_is_picked() {
        let html = page("drum-maps/index.html");
        let checked: Vec<String> = attrs(html, r#"input[name="daw"][checked]"#, "id");
        assert_eq!(checked, ["daw-reaper"]);
    }

    #[test]
    fn the_drum_maps_page_explains_loading_in_every_daw() {
        let explained = attrs(
            page("drum-maps/index.html"),
            "dl > div[data-daw]",
            "data-daw",
        );
        let mut options: Vec<&str> = Daw::ALL.iter().map(|daw| daw.key()).collect();
        options.push("pdf");
        assert_eq!(explained, options);
    }

    #[test]
    fn the_drum_maps_page_shows_every_step_still_to_do() {
        assert_eq!(
            badges(page("drum-maps/index.html")),
            ["current", "later", "later"]
        );
    }

    #[test]
    fn every_drum_map_download_names_its_daw() {
        for (path, html) in rendered() {
            for (at, _) in html.match_indices(r#"data-umami-event="drum-map-downloaded""#) {
                let start = html[..at].rfind("<span ").unwrap();
                let tag = &html[start..at + html[at..].find('>').unwrap()];
                let daw = tag
                    .split(r#"data-umami-event-daw=""#)
                    .nth(1)
                    .and_then(|rest| rest.split('"').next())
                    .unwrap();
                assert!(tag.contains(&format!(r#"data-daw="{daw}""#)), "{path}");
            }
        }
    }

    fn every_engine_slug() -> Vec<String> {
        let mut every: Vec<String> = crate::fixtures::site()
            .index
            .all
            .iter()
            .map(|e| format!("{}/", e.slug))
            .collect();
        every.sort();
        every
    }

    fn engine_slugs_in(path: &str, list: &str) -> Vec<String> {
        let html = Html::parse_document(page(path));
        let lists = select(html.root_element(), list);
        let mut slugs: Vec<String> = select(lists[0], r#"a[href^="/engines/"]"#)
            .into_iter()
            .filter_map(|a| a.value().attr("href")?.strip_prefix("/engines/"))
            .filter(|slug| !slug.is_empty())
            .map(str::to_owned)
            .collect();
        slugs.sort_unstable();
        slugs
    }

    #[test]
    fn the_note_map_index_lists_every_engine_once_even_when_nested() {
        assert_eq!(
            engine_slugs_in("engines/index.html", "#engines"),
            every_engine_slug()
        );
    }

    #[test]
    fn the_drum_maps_a_to_z_lists_every_engine_once_even_when_nested() {
        assert_eq!(
            engine_slugs_in("drum-maps/index.html", "#drum-maps > li:nth-child(2)"),
            every_engine_slug()
        );
    }

    #[test]
    fn a_nested_variant_link_is_dimmed() {
        let classes = attrs(
            page("engines/index.html"),
            r#"#engines a[href="/engines/ggd-invasion-ggd/"]"#,
            "class",
        );
        assert!(classes[0].split(' ').any(|c| c == "text-t4"), "{classes:?}");
    }

    #[test]
    fn the_drum_maps_page_lists_the_hub_engines_first() {
        let html = page("drum-maps/index.html");
        let groups: Vec<&str> = html.split("<li data-group>").skip(1).collect();
        assert_eq!(groups.len(), 2);
        assert!(groups[0].contains(">Most used</h3>"));
        let first: Vec<&str> = groups[0]
            .split(r#"<li data-q=""#)
            .skip(1)
            .filter_map(|row| row.split(r#"href="/engines/"#).nth(1))
            .filter_map(|rest| rest.split('/').next())
            .collect();
        let majors: Vec<String> = MAJORS.iter().map(|(id, _)| id.replace('_', "-")).collect();
        assert_eq!(first, majors);
    }

    #[test]
    fn the_drum_maps_page_explains_each_daw() {
        let html = page("drum-maps/index.html");
        assert!(html.contains(">How to load a drum map</h2>"));
        assert!(html.contains("Load note/CC names from file"));
        assert!(html.contains("Drum Map Setup"));
        assert!(html.contains("Pitch Names"));
    }

    #[test]
    fn the_note_maps_index_links_the_drum_maps_page() {
        assert!(page("engines/index.html").contains(r#"href="/drum-maps/""#));
    }

    #[test]
    fn engine_pages_carry_their_breadcrumb_trail() {
        let html = page("engines/ezdrummer/index.html");
        assert_eq!(html.matches("application/ld+json").count(), 1);
        assert!(html.contains(r#""@type":"BreadcrumbList""#));
        assert!(html.contains(r#"{"@type":"ListItem","item":"https://drumverter.com/engines/","name":"Note maps","position":1}"#));
        assert!(html.contains(r#"{"@type":"ListItem","item":"https://drumverter.com/engines/ezdrummer/","name":"EZdrummer 3","position":2}"#));
    }

    #[test]
    fn polish_pair_pages_carry_their_polish_breadcrumb_trail() {
        let html = page("pl/convert/ggd-invasion-to-ezdrummer/index.html");
        assert!(html.contains(r#""item":"https://drumverter.com/pl/engines/""#));
        assert!(html.contains(r#"{"@type":"ListItem","item":"https://drumverter.com/pl/convert/ggd-invasion-to-ezdrummer/","name":"GetGood Drums Invasion → EZdrummer 3","position":2}"#));
    }

    #[test]
    fn the_note_maps_index_carries_no_breadcrumb_trail() {
        assert!(!page("engines/index.html").contains("BreadcrumbList"));
    }

    #[test]
    fn polish_engine_pages_link_the_polish_note_maps() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(html.contains(r#"href="/pl/engines/""#));
    }

    #[test]
    fn the_polish_note_map_index_links_polish_engine_pages() {
        let html = page("pl/engines/index.html");
        assert!(html.contains(r#"href="/pl/engines/ezdrummer/""#));
    }

    #[test]
    fn the_polish_note_map_index_links_polish_pair_pages() {
        let html = page("pl/engines/index.html");
        assert!(html.contains(r#"href="/pl/convert/"#));
    }

    #[test]
    fn the_polish_note_map_index_links_no_english_pair_pages() {
        let html = page("pl/engines/index.html");
        assert!(!html.contains(r#"href="/convert/"#));
    }

    #[test]
    fn the_polish_note_map_index_names_the_remaining_engines_in_polish() {
        let messages = crate::fixtures::messages();
        let html = page("pl/engines/index.html");
        assert!(html.contains(messages.get(Locale::Pl, Plain::MapsMoreEngines)));
        assert!(!html.contains(messages.get(Locale::En, Plain::MapsMoreEngines)));
    }

    #[test]
    fn the_polish_guide_links_the_polish_note_maps() {
        let html = page("pl/how-it-works/index.html");
        let main = html
            .split("<main")
            .nth(1)
            .unwrap()
            .split("</main>")
            .next()
            .unwrap();
        assert!(main.contains(r#"href="/pl/engines/""#));
    }

    #[test]
    fn polish_pair_pages_open_the_polish_converter() {
        let html = page("pl/convert/addictive-drums2-to-ezdrummer/index.html");
        assert!(html.contains(r#"href="/pl/#from="#));
    }

    #[test]
    fn polish_pair_pages_head_their_sibling_pairs_in_polish() {
        let html = page("pl/convert/addictive-drums2-to-ezdrummer/index.html");
        assert!(html.contains(&polish(Phrase::maps_more_from("Addictive Drums 2"))));
    }

    fn alternate_link(tag: &str, path: &str) -> String {
        format!(r#"<link rel="alternate" hreflang="{tag}" href="{ORIGIN}{path}" />"#)
    }

    #[test]
    fn translated_pages_list_their_english_alternate() {
        let html = page("pl/faq/index.html");
        let link = alternate_link("en", "/faq/");
        assert!(html.contains(&link), "{link}");
    }

    #[test]
    fn translated_pages_list_their_own_alternate() {
        let html = page("pl/faq/index.html");
        let link = alternate_link("pl", "/pl/faq/");
        assert!(html.contains(&link), "{link}");
    }

    #[test]
    fn translated_pages_list_the_default_alternate() {
        let html = page("pl/faq/index.html");
        let link = alternate_link("x-default", "/faq/");
        assert!(html.contains(&link), "{link}");
    }

    const NOINDEX: &str = r#"<meta name="robots" content="noindex,follow" />"#;

    fn head(path: &str) -> &'static str {
        page(path).split("</head>").next().unwrap()
    }

    #[test]
    fn pair_pages_of_unreviewed_locales_are_kept_out_of_search() {
        for &l in Locale::ALL.iter().filter(|l| !l.reviewed()) {
            let file = pair_href("addictive-drums2-to-ezdrummer")
                .in_locale(l)
                .file();
            assert!(head(&file).contains(NOINDEX), "{file}");
        }
    }

    #[test]
    fn pair_pages_of_reviewed_locales_stay_in_search() {
        for &l in Locale::ALL.iter().filter(|l| l.reviewed()) {
            let file = pair_href("addictive-drums2-to-ezdrummer")
                .in_locale(l)
                .file();
            assert!(!head(&file).contains("name=\"robots\""), "{file}");
        }
    }

    #[test]
    fn other_pages_of_unreviewed_locales_stay_in_search() {
        for file in [
            "pl/engines/ezdrummer/index.html",
            "pl/engines/index.html",
            "pl/drum-maps/index.html",
            "pl/faq/index.html",
        ] {
            assert!(!head(file).contains("name=\"robots\""), "{file}");
        }
    }

    #[test]
    fn a_pair_page_of_an_unreviewed_locale_links_only_the_reviewed_versions() {
        let html = head("pl/convert/addictive-drums2-to-ezdrummer/index.html");
        assert!(!html.contains(r#"hreflang="pl""#));
        assert!(html.contains(&alternate_link(
            "en",
            "/convert/addictive-drums2-to-ezdrummer/"
        )));
    }

    #[test]
    fn an_english_page_lists_its_polish_alternate() {
        assert!(page("engines/ezdrummer/index.html")
            .contains(&alternate_link("pl", "/pl/engines/ezdrummer/")));
    }

    #[test]
    fn a_polish_page_offers_english() {
        assert!(page("pl/faq/index.html").contains(r#"data-offer="en""#));
    }

    #[test]
    fn an_english_page_offers_polish() {
        assert!(page("faq/index.html").contains(r#"data-offer="pl""#));
    }

    #[test]
    fn english_section_descriptions_fit() {
        let messages = crate::fixtures::messages();
        for &k in SectionKey::ALL {
            assert!(
                messages.get(Locale::En, k.description()).chars().count() <= DESCRIPTION_MAX,
                "{}",
                k.key()
            );
        }
    }

    fn anchors(html: &str) -> Vec<&str> {
        html.split("<a")
            .skip(1)
            .map(|rest| rest.split('>').next().unwrap())
            .collect()
    }

    fn anchor_to<'a>(html: &'a str, href: &str) -> &'a str {
        let needle = format!(r#"href="{href}""#);
        anchors(html)
            .into_iter()
            .find(|tag| tag.contains(&needle))
            .unwrap_or_else(|| panic!("{href}"))
    }

    fn opened_converter(tag: &str) -> bool {
        tag.contains(r#"data-umami-event="converter-opened""#)
    }

    #[test]
    fn an_engine_page_tells_the_stats_which_page_kind_opened_the_converter() {
        let html = page("engines/ezdrummer/index.html");
        assert!(anchor_to(html, "/#to=ezdrummer").contains(r#"data-umami-event-page="engine""#));
    }

    #[test]
    fn an_engine_pages_convert_to_link_names_the_target_engine() {
        let html = page("engines/ezdrummer/index.html");
        let tag = anchor_to(html, "/#to=ezdrummer");
        assert!(opened_converter(tag));
        assert!(tag.contains(r#"data-umami-event-to="ezdrummer""#));
    }

    #[test]
    fn an_engine_pages_convert_to_link_names_no_source_engine() {
        let html = page("engines/ezdrummer/index.html");
        assert!(!anchor_to(html, "/#to=ezdrummer").contains("data-umami-event-from"));
    }

    #[test]
    fn an_engine_pages_convert_from_link_names_the_source_engine() {
        let html = page("engines/ezdrummer/index.html");
        let tag = anchor_to(html, "/#from=ezdrummer");
        assert!(opened_converter(tag));
        assert!(tag.contains(r#"data-umami-event-from="ezdrummer""#));
    }

    #[test]
    fn a_pair_pages_convert_link_names_both_engines() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let tag = anchor_to(html, "/#from=addictive_drums2&amp;to=ezdrummer");
        assert!(opened_converter(tag));
        assert!(tag.contains(r#"data-umami-event-from="addictive_drums2""#));
        assert!(tag.contains(r#"data-umami-event-to="ezdrummer""#));
    }

    #[test]
    fn a_pair_pages_convert_link_says_it_is_on_a_pair_page() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        let tag = anchor_to(html, "/#from=addictive_drums2&amp;to=ezdrummer");
        assert!(tag.contains(r#"data-umami-event-page="pair""#));
    }

    #[test]
    fn the_headers_converter_link_says_which_kind_of_page_it_is_on() {
        let html = page("engines/index.html");
        let tag = anchors(html)
            .into_iter()
            .find(|tag| tag.contains("nav-cta"))
            .unwrap();
        assert!(tag.contains(r#"data-umami-event-page="index""#));
    }

    #[test]
    fn the_headers_converter_link_opens_the_converter() {
        let html = page("faq/index.html");
        let tag = anchors(html)
            .into_iter()
            .find(|tag| tag.contains("nav-cta"))
            .unwrap();
        assert!(opened_converter(tag));
    }

    #[test]
    fn the_headers_other_links_do_not_open_the_converter() {
        let html = page("faq/index.html");
        let tag = anchors(html)
            .into_iter()
            .find(|tag| tag.contains("nav-link") && tag.contains(r#"href="/engines/""#))
            .unwrap();
        assert!(!opened_converter(tag));
    }

    #[test]
    fn the_brand_link_opens_the_converter() {
        let html = page("engines/ezdrummer/index.html");
        let tag = anchors(html)
            .into_iter()
            .find(|tag| tag.contains("brand-mark"))
            .unwrap();
        assert!(opened_converter(tag));
    }

    #[test]
    fn a_document_pages_open_converter_link_says_it_is_on_a_doc_page() {
        let html = page("faq/index.html");
        let tag = anchors(html)
            .into_iter()
            .find(|tag| tag.contains(r#"class="cta""#) && tag.contains(r#"href="/""#))
            .unwrap();
        assert!(tag.contains(r#"data-umami-event-page="doc""#));
    }

    #[test]
    fn the_thanks_pages_open_converter_link_says_it_is_on_a_doc_page() {
        let pages = rendered();
        let (_, html) = thanks_page(pages, Locale::En);
        let tag = anchor_to(html, "/");
        assert!(tag.contains(r#"data-umami-event-page="doc""#));
    }

    #[test]
    fn the_footer_links_do_not_open_the_converter() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert!(!anchors(footer).into_iter().any(opened_converter));
    }

    #[test]
    fn a_polish_engine_page_keeps_the_event_on_its_converter_link() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(opened_converter(anchor_to(html, "/pl/#to=ezdrummer")));
    }

    #[test]
    fn every_converter_link_carries_the_stats_event() {
        let mut checked = 0;
        for (path, html) in rendered() {
            let (locale, _) = locale_and_rest(path);
            let home = home(locale).to_string();
            for tag in anchors(html) {
                let Some(href) = tag
                    .split("href=\"")
                    .nth(1)
                    .and_then(|s| s.split('"').next())
                else {
                    continue;
                };
                if href == home || href.starts_with(&format!("{home}#")) {
                    assert!(opened_converter(tag), "{path}: {tag}");
                    assert!(tag.contains("data-umami-event-page=\""), "{path}: {tag}");
                    checked += 1;
                }
            }
        }
        assert!(checked > rendered().len());
    }

    #[test]
    fn table_rows_are_one_unindented_line_each() {
        for (path, html) in rendered() {
            let (_, rest) = locale_and_rest(path);
            let engine_page = rest.starts_with("engines/") && rest != "engines/index.html";
            if !(engine_page || rest.starts_with("convert/")) {
                continue;
            }
            for body in html
                .split("<tbody")
                .skip(1)
                .filter_map(|rest| rest.split("</tbody>").next())
            {
                for line in body.lines().skip(1) {
                    assert!(line.starts_with('<'), "{path}: {line:?}");
                    if line.contains("<tr") {
                        assert!(line.contains("</tr>"), "{path}: {line:?}");
                    }
                }
            }
        }
    }

    fn filter_input<'a>(html: &'a str, scope: &str) -> &'a str {
        html.split("<input")
            .find(|tag| tag.contains(&format!(r#"data-filter="{scope}""#)))
            .unwrap()
            .split('>')
            .next()
            .unwrap()
    }

    #[test]
    fn the_note_map_filter_says_it_is_on_the_index() {
        let html = page("engines/index.html");
        assert!(filter_input(html, "engines").contains(r#"data-page="index""#));
    }

    fn local_anchors(html: &str, scope: &str) -> Vec<String> {
        attrs(html, &format!(r##"{scope} a[href^="#"]"##), "href")
            .into_iter()
            .filter_map(|href| href.strip_prefix('#').map(str::to_owned))
            .filter(|id| id != "main")
            .collect()
    }

    #[test]
    fn engine_pages_link_each_drum_group() {
        let messages = crate::fixtures::messages();
        let label = messages.get(Locale::En, Plain::MapsGroupsLabel);
        for p in &crate::fixtures::site().engines {
            let html = page(&p.engine.href().in_locale(Locale::En).file());
            let anchors: Vec<String> = p.groups.iter().map(|g| g.anchor()).collect();
            assert_eq!(
                local_anchors(html, &format!(r#"nav[aria-label="{label}"]"#)),
                anchors,
                "{}",
                p.engine.id
            );
        }
    }

    #[test]
    fn every_group_anchor_names_a_table_on_the_page() {
        for p in &crate::fixtures::site().engines {
            let html = page(&p.engine.href().in_locale(Locale::En).file());
            let tables = attrs(html, "table[id]", "id");
            for id in local_anchors(html, "body") {
                assert!(tables.contains(&id), "{}: #{id}", p.engine.id);
            }
        }
    }

    #[test]
    fn engine_pages_head_the_note_table() {
        let html = page("engines/ezdrummer/index.html");
        let total = crate::fixtures::site()
            .engines
            .iter()
            .find(|p| p.engine.id == "ezdrummer")
            .map(|p| p.total)
            .unwrap();
        let heading = html.find(&format!(">All {total} notes</h2>")).unwrap();
        let table = html.find(r#"class="note-table""#).unwrap();
        assert!(heading < table);
    }

    #[test]
    fn engine_pages_show_the_core_notes_before_the_note_table() {
        let html = page("engines/general-midi/index.html");
        let core = html.find(">The notes you will use most</h2>").unwrap();
        let list = &html[core..];
        assert!(list.contains(r#"<ul class="core-notes"><li><span>Kick</span> 36 · "#));
        assert!(core < html.find(r#"class="note-table""#).unwrap());
    }

    #[test]
    fn engine_pages_dim_the_extra_notes() {
        let html = page("engines/ezdrummer/index.html");
        assert!(html.contains(r#"<tr data-q="35 "#));
        let extra = html.split(r#"<tr data-q="35 "#).nth(1).unwrap();
        assert!(extra.split('>').next().unwrap().ends_with(" data-extra"));
        assert!(html.contains("Dimmed rows are extra notes"));
    }

    #[test]
    fn an_engine_page_filter_says_it_is_on_an_engine_page() {
        let html = page("engines/ezdrummer/index.html");
        assert!(filter_input(html, "drums").contains(r#"data-page="engine""#));
    }
}
