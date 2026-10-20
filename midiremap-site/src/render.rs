use std::borrow::Borrow;

use askama::Template;
use fluent_bundle::{FluentArgs, FluentValue};
use midiremap_core::Daw;

use crate::{
    content::{breadcrumb_schema, faq_schema, how_to_schema, Block, ContentPage},
    i18n::{Docs, I18nError, Locale, MessageId, Messages, Plain, SectionKey, TIP_HREF},
    manifest::{AnalyticsScript, LocaleScript, SiteManifest},
    pages::{EnginePage, IndexPage, Landing, PairPage, PopularPair, Site, Tally},
    routes::{
        alternates, home, href, label, local_href, og_image_url, page_in, Alternate, LocalPath,
        NavTarget, Page, SitePath, DRUM_MAPS, FOOTER, NAV, NOTE_MAPS, SITE_NAME, THANKS,
    },
};

const DESCRIPTION_MAX: usize = 155;

/// A page's name, search snippet and canonical address.
pub struct Meta {
    pub name: String,
    pub description: String,
    pub canonical: String,
}

impl Meta {
    /// The page's title: its name and the site's.
    pub fn title(&self) -> String {
        format!("{} | {SITE_NAME}", self.name)
    }
}

const TITLE_NAME_MAX: usize = 40;

/// What stops the static pages from being rendered.
#[derive(thiserror::Error, Debug)]
pub enum RenderError {
    #[error(transparent)]
    Template(#[from] askama::Error),
    #[error(transparent)]
    Message(#[from] I18nError),
}

fn fit(first: &str, fallbacks: &[String], rest: &[String], max: usize) -> String {
    let Some(mut out) = std::iter::once(first)
        .chain(fallbacks.iter().map(String::as_str))
        .find(|s| s.chars().count() <= max)
        .map(str::to_owned)
    else {
        return fallbacks
            .iter()
            .map(String::as_str)
            .fold(first, |shortest, s| {
                if s.chars().count() < shortest.chars().count() {
                    s
                } else {
                    shortest
                }
            })
            .to_owned();
    };
    for sentence in rest {
        if out.chars().count() + 1 + sentence.chars().count() <= max {
            out = format!("{out} {sentence}");
        }
    }
    out
}

fn with_midi(name: &str) -> String {
    if name.ends_with("MIDI") {
        name.to_string()
    } else {
        format!("{name} MIDI")
    }
}

fn args<'a>(pairs: impl IntoIterator<Item = (&'a str, FluentValue<'a>)>) -> FluentArgs<'a> {
    pairs.into_iter().collect()
}

pub fn engine_meta(p: &EnginePage, texts: &Texts) -> Result<Meta, I18nError> {
    let n = p.engine.name.as_str();
    let midi = with_midi(n);
    let name = if n.chars().count() <= TITLE_NAME_MAX {
        texts.format(
            MessageId::MapsEngineTitle,
            args([("engineMidi", midi.as_str().into())]),
        )?
    } else {
        texts.format(
            MessageId::MapsEngineTitleLongName,
            args([("engine", n.into())]),
        )?
    };
    Ok(Meta {
        name,
        description: fit(
            &texts.format(
                MessageId::MapsEngineDescription,
                args([("engine", n.into()), ("total", p.total.into())]),
            )?,
            &[texts.format(
                MessageId::MapsEngineDescriptionShort,
                args([("engine", n.into())]),
            )?],
            &[
                texts.get(Plain::MapsEngineDescriptionDrumMaps).to_owned(),
                texts.format(
                    MessageId::MapsEngineDescriptionMore,
                    args([("engineMidi", midi.as_str().into())]),
                )?,
            ],
            DESCRIPTION_MAX,
        ),
        canonical: p.engine.href().in_locale(texts.locale).url(),
    })
}

fn pair_summary(texts: &Texts, src: &str, tgt: &str, tally: Tally) -> Result<String, I18nError> {
    texts.format(
        MessageId::MapsPairSummary,
        args([
            ("total", tally.total().into()),
            ("source", src.into()),
            ("exact", tally.exact.into()),
            ("target", tgt.into()),
            ("approximated", tally.approximated.into()),
            ("dropped", tally.dropped.into()),
        ]),
    )
}

fn pair_args<'a>(src: &'a str, tgt: &'a str, tally: Tally) -> FluentArgs<'a> {
    args([
        ("sourceMidi", with_midi(src).into()),
        ("source", src.into()),
        ("target", tgt.into()),
        ("exact", tally.exact.into()),
        ("approximated", tally.approximated.into()),
        ("dropped", tally.dropped.into()),
    ])
}

fn pair_heading(p: &PairPage, texts: &Texts) -> Result<String, I18nError> {
    texts.format(
        MessageId::MapsPairHeading,
        pair_args(&p.src.name, &p.tgt.name, p.tally),
    )
}

fn conversion_meta(
    src: &str,
    tgt: &str,
    tally: Tally,
    path: SitePath,
    texts: &Texts,
) -> Result<Meta, I18nError> {
    let format = |id| texts.format(id, pair_args(src, tgt, tally));
    Ok(Meta {
        name: format(MessageId::MapsPairTitle)?,
        description: fit(
            &format(MessageId::MapsPairDescription)?,
            &[format(MessageId::MapsPairDescriptionShort)?],
            &[texts.get(Plain::MapsPairDescriptionMore).to_owned()],
            DESCRIPTION_MAX,
        ),
        canonical: path.in_locale(texts.locale).url(),
    })
}

pub fn pair_meta(p: &PairPage, texts: &Texts) -> Result<Meta, I18nError> {
    conversion_meta(&p.src.name, &p.tgt.name, p.tally, p.href(), texts)
}

pub fn popular_meta(p: &PopularPair, texts: &Texts) -> Result<Meta, I18nError> {
    conversion_meta(
        &p.link.src_name,
        &p.link.tgt_name,
        p.tally,
        p.link.href(),
        texts,
    )
}

pub fn index_meta(p: &IndexPage, texts: &Texts) -> Result<Meta, I18nError> {
    let count = || args([("count", p.all.len().into())]);
    Ok(Meta {
        name: texts.format(MessageId::MapsIndexTitle, count())?,
        description: fit(
            &texts.format(MessageId::MapsIndexDescription, count())?,
            &[],
            &[],
            DESCRIPTION_MAX,
        ),
        canonical: NOTE_MAPS.in_locale(texts.locale).url(),
    })
}

pub fn drum_maps_meta(p: &IndexPage, texts: &Texts) -> Result<Meta, I18nError> {
    let count = || args([("count", p.all.len().into())]);
    Ok(Meta {
        name: texts.format(MessageId::DrumMapsTitle, count())?,
        description: fit(
            &texts.format(MessageId::DrumMapsDescription, count())?,
            &[],
            &[],
            DESCRIPTION_MAX,
        ),
        canonical: DRUM_MAPS.in_locale(texts.locale).url(),
    })
}

fn daw_steps<'a>(texts: &Texts<'a>) -> Vec<(Daw, &'a str)> {
    Daw::ALL
        .iter()
        .map(|&daw| {
            let how = match daw {
                Daw::Reaper => Plain::DrumMapsReaper,
                Daw::Cubase => Plain::DrumMapsCubase,
                Daw::StudioOne => Plain::DrumMapsStudioOne,
            };
            (daw, texts.get(how))
        })
        .collect()
}

pub fn section_meta(k: SectionKey, texts: &Texts) -> Meta {
    content_meta(
        texts.get(k.title()).to_owned(),
        texts.get(k.description()).to_owned(),
        &href(NavTarget::Section(k), texts.locale, texts.docs),
    )
}

fn content_meta(name: String, description: String, path: &LocalPath) -> Meta {
    Meta {
        name,
        description,
        canonical: path.url(),
    }
}

struct NavItem<'a> {
    label: &'a str,
    href: LocalPath,
    current: bool,
    converter: bool,
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

/// The site's messages and documents in one locale.
pub struct Texts<'a> {
    pub messages: &'a Messages,
    pub docs: &'a Docs,
    pub locale: Locale,
}

impl<'a> Texts<'a> {
    pub fn get(&self, id: Plain) -> &'a str {
        self.messages.get(self.locale, id)
    }

    fn format(&self, id: MessageId, args: FluentArgs) -> Result<String, I18nError> {
        self.messages.format(self.locale, id, &args)
    }

    fn engine(&self, id: MessageId, engine: &str) -> Result<String, I18nError> {
        self.format(id, args([("engine", engine.into())]))
    }

    fn count(&self, id: MessageId, count: impl Borrow<usize>) -> Result<String, I18nError> {
        self.format(id, args([("count", (*count.borrow()).into())]))
    }

    fn pair(&self, id: MessageId, source: &str, target: &str) -> Result<String, I18nError> {
        self.format(
            id,
            args([("source", source.into()), ("target", target.into())]),
        )
    }

    fn drum_map_label(&self, engine: &str, daw: &str) -> Result<String, I18nError> {
        self.format(
            MessageId::DrumMapsDownloadLabel,
            args([("engine", engine.into()), ("daw", daw.into())]),
        )
    }

    fn path(&self, english: SitePath) -> LocalPath {
        english.in_locale(self.locale)
    }

    fn link(&self, english: &str) -> LocalPath {
        local_href(english, self.locale, self.docs)
    }

    fn links(&self, targets: &[NavTarget], current: Option<NavTarget>) -> Vec<NavItem<'a>> {
        targets
            .iter()
            .map(|&t| NavItem {
                label: self.get(label(t)),
                href: href(t, self.locale, self.docs),
                current: current == Some(t),
                converter: t == NavTarget::Converter,
            })
            .collect()
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

fn section_schema(key: SectionKey, page: &ContentPage) -> Option<String> {
    match key {
        SectionKey::Faq => Some(faq_schema(page.blocks)),
        SectionKey::Guide => Some(how_to_schema(page.heading, page.blocks)),
        SectionKey::Issue | SectionKey::Contact | SectionKey::Terms => None,
    }
}

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
    page: &'a PairPage,
}

#[derive(Template)]
#[template(path = "index.html")]
struct IndexHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a IndexPage,
}

#[derive(Template)]
#[template(path = "drum_maps.html")]
struct DrumMapsHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a IndexPage,
    steps: Vec<(Daw, &'a str)>,
}

#[derive(Template)]
#[template(path = "content.html")]
struct ContentHtml<'a> {
    meta: Meta,
    frame: Frame<'a>,
    texts: &'a Texts<'a>,
    page: &'a ContentPage<'a>,
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
        frame: Frame::new(
            manifest,
            texts,
            None,
            None,
            &Page::Everywhere(THANKS),
            PageKind::Doc,
        ),
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
    let frame = |path: SitePath, kind: PageKind, json_ld: Option<String>| {
        Frame::new(
            manifest,
            texts,
            IN_NOTE_MAPS,
            json_ld,
            &Page::Everywhere(path),
            kind,
        )
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
            meta: index_meta(&site.index, texts)?,
            frame: frame(NOTE_MAPS, PageKind::Index, None),
            texts,
            page: &site.index,
        }
        .render()?,
    )];
    out.push((
        DRUM_MAPS.in_locale(texts.locale).file(),
        DrumMapsHtml {
            meta: drum_maps_meta(&site.index, texts)?,
            frame: Frame::new(
                manifest,
                texts,
                Some(NavTarget::DrumMaps),
                None,
                &Page::Everywhere(DRUM_MAPS),
                PageKind::DrumMaps,
            ),
            texts,
            page: &site.index,
            steps: daw_steps(texts),
        }
        .render()?,
    ));
    for p in &site.engines {
        let path = p.engine.href();
        out.push((
            path.in_locale(texts.locale).file(),
            EngineHtml {
                meta: engine_meta(p, texts)?,
                frame: frame(path.clone(), PageKind::Engine, trail(&p.engine.name, &path)),
                texts,
                intro: texts.format(
                    MessageId::MapsEngineIntro,
                    args([
                        ("engine", p.engine.name.as_str().into()),
                        ("total", p.total.into()),
                    ]),
                )?,
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
                meta: pair_meta(p, texts)?,
                frame: frame(
                    path.clone(),
                    PageKind::Pair,
                    trail(&format!("{} → {}", p.src.name, p.tgt.name), &path),
                ),
                texts,
                heading: pair_heading(p, texts)?,
                summary: pair_summary(texts, &p.src.name, &p.tgt.name, p.tally)?,
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
                    section_schema(k, &page),
                    &Page::Section(k),
                    PageKind::Doc,
                ),
                texts,
                page: &page,
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

    use super::*;

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

    #[test]
    fn the_faq_page_carries_structured_data() {
        let faq = page("faq/index.html");
        assert!(faq.contains(r#"<script type="application/ld+json">"#));
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
            let tags: Vec<&str> = html
                .split(r#"<span class="tag" data-tone=""#)
                .skip(1)
                .filter_map(|rest| rest.split('"').next())
                .collect();
            assert_eq!(tags.len(), shown, "{}", p.slug);
            assert_eq!(tags[0], "neutral", "{}", p.slug);
            assert!(
                tags.iter()
                    .all(|t| ["neutral", "gold", "danger"].contains(t)),
                "{}",
                p.slug
            );
        }
    }

    #[test]
    fn index_matrix_names_the_pair_links_from_general_midi() {
        let html = page("engines/index.html");
        assert_eq!(html.matches(r#"aria-label="General MIDI to "#).count(), 7);
    }

    #[test]
    fn index_matrix_links_fifty_six_named_pairs() {
        let html = page("engines/index.html");
        let matrix_links = html
            .split("<a ")
            .filter(|a| a.contains("href=\"/convert/") && a.contains(" to "))
            .count();
        assert_eq!(matrix_links, 56);
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
            let title = in_locale(Locale::En, |t| engine_meta(p, t).unwrap().title());
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
                    .map(|p| engine_meta(p, t).unwrap().description)
                    .chain(
                        site.pairs
                            .iter()
                            .map(|p| pair_meta(p, t).unwrap().description),
                    )
                    .chain(std::iter::once(
                        index_meta(&site.index, t).unwrap().description,
                    ));
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
                .drum_map_files
                .iter()
                .map(|(path, _)| path.to_string()),
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
        in_locale(Locale::En, |t| pair_summary(t, "A", "B", counts).unwrap())
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
        let maps = Catalog::builtin().unwrap();
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

    fn structured_data(html: &str) -> &str {
        let start = html.find(r#"<script type="application/ld+json">"#).unwrap();
        let end = start + html[start..].find("</script>").unwrap();
        &html[start..end]
    }

    #[test]
    fn names_are_escaped() {
        let mm = page("engines/ggd-modernmassive/index.html");
        let markup = mm.replace(structured_data(mm), "");
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
                .all(|p| description_fits(engine_meta(p, t).unwrap().description)));
        });
    }

    #[test]
    fn pair_descriptions_fit() {
        let site = crate::fixtures::site();
        in_locale(Locale::En, |t| {
            let long: Vec<String> = site
                .pairs
                .iter()
                .map(|p| pair_meta(p, t).unwrap().description)
                .filter(|d| d.chars().count() > DESCRIPTION_MAX)
                .collect();
            assert_eq!(long, Vec::<String>::new());
        });
    }

    #[test]
    fn the_index_description_fits() {
        let site = crate::fixtures::site();
        in_locale(Locale::En, |t| {
            assert!(description_fits(
                index_meta(&site.index, t).unwrap().description
            ));
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

    fn polish(id: MessageId, arg: (&str, &str)) -> String {
        let mut args = FluentArgs::new();
        args.set(arg.0, arg.1);
        crate::fixtures::messages()
            .format(Locale::Pl, id, &args)
            .unwrap()
    }

    #[test]
    fn polish_engine_pages_have_a_polish_heading() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(html.contains(&polish(
            MessageId::MapsEngineHeading,
            ("engine", "EZdrummer 3")
        )));
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

    #[test]
    fn polish_engine_pages_link_the_same_drum_map_files_and_the_polish_guide() {
        let html = page("pl/engines/ggd-invasion/index.html");
        assert!(html.contains(r#"href="/drum-maps/files/ggd-invasion.txt""#));
        assert!(html.contains(r#"href="/pl/drum-maps/""#));
    }

    #[test]
    fn engine_descriptions_mention_the_drum_maps_when_they_fit() {
        let html = page("engines/ggd-invasion/index.html");
        assert!(html.contains("Free Cubase, Reaper and Studio One drum maps."));
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
            site.drum_map_files.len()
        );
        assert!(download_wrapper(html, "/drum-maps/files/ssd5.drm")
            .contains(r#"data-umami-event-page="drum-maps""#));
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
        assert!(html.contains(&polish(
            MessageId::MapsMoreFrom,
            ("engine", "Addictive Drums 2")
        )));
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
            .find(|tag| tag.contains("prose-link text-ui") && tag.contains(r#"href="/""#))
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

    fn table_bodies(html: &str) -> impl Iterator<Item = &str> {
        html.split("<tbody")
            .skip(1)
            .map(|rest| rest.split("</tbody>").next().unwrap())
    }

    #[test]
    fn table_rows_are_one_unindented_line_each() {
        for (path, html) in rendered() {
            let (_, rest) = locale_and_rest(path);
            let engine_page = rest.starts_with("engines/") && rest != "engines/index.html";
            if !(engine_page || rest.starts_with("convert/")) {
                continue;
            }
            for body in table_bodies(html) {
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

    #[test]
    fn an_engine_page_filter_says_it_is_on_an_engine_page() {
        let html = page("engines/ezdrummer/index.html");
        assert!(filter_input(html, "drums").contains(r#"data-page="engine""#));
    }
}
