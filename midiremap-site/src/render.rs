use std::borrow::Borrow;

use askama::Template;
use fluent_bundle::{FluentArgs, FluentValue};
use midiremap_core::PlanStatus;

use crate::{
    content::{faq_schema, how_to_schema, Block, ContentPage},
    i18n::{
        alternates, base, home, href, label, local_href, page_in, Docs, Locale, MessageId,
        Messages, NavTarget, Page, Plain, SectionKey, FOOTER, NAV, TIP_HREF,
    },
    pages::{page_file, EnginePage, IndexPage, PairPage, Site, NOTE_MAPS, ORIGIN, THANKS},
};

pub const DESCRIPTION_MAX: usize = 155;

pub struct Meta {
    pub title: String,
    pub description: String,
    pub canonical: String,
}

pub const TITLE_NAME_MAX: usize = 40;

fn fit(first: &[String], rest: &[String], max: usize) -> String {
    let Some(mut out) = first.iter().find(|s| s.chars().count() <= max).cloned() else {
        return first
            .iter()
            .min_by_key(|s| s.chars().count())
            .cloned()
            .unwrap_or_default();
    };
    for sentence in rest {
        if out.chars().count() + 1 + sentence.chars().count() <= max {
            out = format!("{out} {sentence}");
        }
    }
    out
}

/// `name` followed by "MIDI", unless the name already ends with it ("General MIDI").
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

fn engine_meta(p: &EnginePage, texts: &Texts) -> Meta {
    let n = p.engine.name.as_str();
    let midi = with_midi(n);
    let title = if n.chars().count() <= TITLE_NAME_MAX {
        texts.format(
            MessageId::MapsEngineTitle,
            args([("engineMidi", midi.as_str().into())]),
        )
    } else {
        texts.format(
            MessageId::MapsEngineTitleLongName,
            args([("engine", n.into())]),
        )
    };
    Meta {
        title,
        description: fit(
            &[
                texts.format(
                    MessageId::MapsEngineDescription,
                    args([("engine", n.into()), ("total", p.total.into())]),
                ),
                texts.format(
                    MessageId::MapsEngineDescriptionShort,
                    args([("engine", n.into())]),
                ),
            ],
            &[texts.format(
                MessageId::MapsEngineDescriptionMore,
                args([("engineMidi", midi.as_str().into())]),
            )],
            DESCRIPTION_MAX,
        ),
        canonical: texts.url(&p.engine.href()),
    }
}

fn pair_summary(
    texts: &Texts,
    src: &str,
    tgt: &str,
    total: usize,
    (exact, approximated, dropped): (usize, usize, usize),
) -> String {
    texts.format(
        MessageId::MapsPairSummary,
        args([
            ("total", total.into()),
            ("source", src.into()),
            ("exact", exact.into()),
            ("target", tgt.into()),
            ("approximated", approximated.into()),
            ("dropped", dropped.into()),
        ]),
    )
}

fn pair_args<'a>(p: &'a PairPage, midi: &'a str) -> FluentArgs<'a> {
    args([
        ("sourceMidi", midi.into()),
        ("source", p.src.name.as_str().into()),
        ("target", p.tgt.name.as_str().into()),
        ("exact", p.exact.into()),
        ("approximated", p.approximated.into()),
        ("dropped", p.dropped.into()),
    ])
}

fn pair_heading(p: &PairPage, texts: &Texts) -> String {
    texts.format(
        MessageId::MapsPairHeading,
        pair_args(p, &with_midi(&p.src.name)),
    )
}

fn pair_meta(p: &PairPage, texts: &Texts) -> Meta {
    let midi = with_midi(&p.src.name);
    Meta {
        title: texts.format(MessageId::MapsPairTitle, pair_args(p, &midi)),
        description: fit(
            &[texts.format(MessageId::MapsPairDescription, pair_args(p, &midi))],
            &[texts.get(Plain::MapsPairDescriptionMore).to_owned()],
            DESCRIPTION_MAX,
        ),
        canonical: texts.url(&p.href()),
    }
}

fn index_meta(p: &IndexPage, texts: &Texts) -> Meta {
    let count = || args([("count", p.all.len().into())]);
    Meta {
        title: texts.format(MessageId::MapsIndexTitle, count()),
        description: fit(
            &[texts.format(MessageId::MapsIndexDescription, count())],
            &[],
            DESCRIPTION_MAX,
        ),
        canonical: texts.url(NOTE_MAPS),
    }
}

pub fn content_meta(title: String, description: String, path: &str) -> Meta {
    Meta {
        title,
        description,
        canonical: format!("{ORIGIN}{path}"),
    }
}

struct NavItem<'a> {
    label: &'a str,
    href: String,
    current: bool,
}

/// What the static pages take from the app's built `index.html`: its stylesheet, its
/// content security policy (escaped attribute text) and its analytics beacon `<script>`
/// element, both written as they are.
pub struct Shell<'a> {
    pub css: &'a str,
    pub csp: &'a str,
    pub beacon: &'a str,
}

/// The words pages are written in: one locale's messages and documents.
struct Texts<'a> {
    messages: &'a Messages,
    docs: &'a Docs,
    locale: Locale,
}

impl<'a> Texts<'a> {
    fn get(&self, id: Plain) -> &'a str {
        self.messages.get(self.locale, id)
    }

    fn format(&self, id: MessageId, args: FluentArgs) -> String {
        self.messages.format(self.locale, id, &args)
    }

    fn engine(&self, id: MessageId, engine: &str) -> String {
        self.format(id, args([("engine", engine.into())]))
    }

    fn count(&self, id: MessageId, count: impl Borrow<usize>) -> String {
        self.format(id, args([("count", (*count.borrow()).into())]))
    }

    fn pair(&self, id: MessageId, source: &str, target: &str) -> String {
        self.format(
            id,
            args([("source", source.into()), ("target", target.into())]),
        )
    }

    fn path(&self, english: &str) -> String {
        format!("{}{english}", base(self.locale))
    }

    fn link(&self, english: &str) -> String {
        local_href(english, self.locale, self.docs)
    }

    fn url(&self, english: &str) -> String {
        format!("{ORIGIN}{}", self.path(english))
    }

    fn links(&self, targets: &[NavTarget], current: Option<NavTarget>) -> Vec<NavItem<'a>> {
        targets
            .iter()
            .map(|&t| NavItem {
                label: self.get(label(t)),
                href: href(t, self.locale, self.docs),
                current: current == Some(t),
            })
            .collect()
    }
}

/// One entry of the language menu: a locale, named in itself, and this page in it.
struct LangItem {
    name: &'static str,
    tag: &'static str,
    code: &'static str,
    href: String,
    current: bool,
}

/// A hidden notice offering this page in another locale, in that locale's words.
struct Offer<'a> {
    code: &'static str,
    tag: &'static str,
    href: String,
    text: &'a str,
}

/// What every page shares: the app shell, header nav, footer and optional schema.
struct Frame<'a> {
    lang: &'static str,
    code: String,
    menu_label: &'a str,
    dismiss: &'a str,
    languages: Vec<LangItem>,
    offers: Vec<Offer<'a>>,
    alternates: Vec<(&'static str, String)>,
    css: &'a str,
    csp: &'a str,
    beacon: &'a str,
    skip: &'a str,
    nav_main: &'a str,
    nav_site: &'a str,
    nav: Vec<NavItem<'a>>,
    footer: Vec<NavItem<'a>>,
    tip: &'a str,
    tip_href: &'static str,
    home: String,
    open_converter: &'a str,
    json_ld: Option<String>,
}

impl<'a> Frame<'a> {
    fn new(
        shell: &Shell<'a>,
        texts: &Texts<'a>,
        current: Option<NavTarget>,
        json_ld: Option<String>,
        page: &Page,
    ) -> Self {
        let here = texts.locale;
        let versions = alternates(page, texts.docs);
        Self {
            lang: here.lang_tag(),
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
                .filter(|&&l| l != here && versions.iter().any(|(tag, _)| *tag == l.lang_tag()))
                .map(|&l| Offer {
                    code: l.code(),
                    tag: l.lang_tag(),
                    href: page_in(page, l, texts.docs),
                    text: texts.messages.get(l, Plain::LangOffer),
                })
                .collect(),
            alternates: versions
                .into_iter()
                .map(|(tag, path)| (tag, format!("{ORIGIN}{path}")))
                .collect(),
            css: shell.css,
            csp: shell.csp,
            beacon: shell.beacon,
            skip: texts.get(Plain::SkipToContent),
            nav_main: texts.get(Plain::NavMain),
            nav_site: texts.get(Plain::NavSite),
            nav: texts.links(NAV, current),
            footer: texts.links(FOOTER, None),
            tip: texts.get(Plain::TipLink),
            tip_href: TIP_HREF,
            home: home(texts.locale),
            open_converter: texts.get(Plain::OpenConverter),
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
    shell: &Shell,
    messages: &Messages,
    docs: &Docs,
) -> Result<Vec<(String, String)>, askama::Error> {
    let mut out = vec![];
    for &locale in Locale::ALL {
        let texts = Texts {
            messages,
            docs,
            locale,
        };
        out.extend(render_note_maps(site, shell, &texts)?);
        out.extend(render_sections(shell, &texts)?);
        out.push(render_thanks(shell, &texts)?);
    }
    Ok(out)
}

fn render_thanks(shell: &Shell, texts: &Texts) -> Result<(String, String), askama::Error> {
    let path = texts.path(THANKS);
    let html = ThanksHtml {
        meta: content_meta(
            texts.get(Plain::ThanksTitle).to_owned(),
            texts.get(Plain::ThanksDescription).to_owned(),
            &path,
        ),
        frame: Frame::new(shell, texts, None, None, &Page::Everywhere(THANKS)),
        texts,
    }
    .render()?;
    Ok((page_file(&path), html))
}

fn render_note_maps(
    site: &Site,
    shell: &Shell,
    texts: &Texts,
) -> Result<Vec<(String, String)>, askama::Error> {
    let frame = |path: &str| Frame::new(shell, texts, IN_NOTE_MAPS, None, &Page::Everywhere(path));
    let mut out = vec![(
        page_file(&texts.path(NOTE_MAPS)),
        IndexHtml {
            meta: index_meta(&site.index, texts),
            frame: frame(NOTE_MAPS),
            texts,
            page: &site.index,
        }
        .render()?,
    )];
    for p in &site.engines {
        let path = p.engine.href();
        out.push((
            page_file(&texts.path(&path)),
            EngineHtml {
                meta: engine_meta(p, texts),
                frame: frame(&path),
                texts,
                intro: texts.format(
                    MessageId::MapsEngineIntro,
                    args([
                        ("engine", p.engine.name.as_str().into()),
                        ("total", p.total.into()),
                    ]),
                ),
                page: p,
            }
            .render()?,
        ));
    }
    for p in &site.pairs {
        let path = p.href();
        out.push((
            page_file(&texts.path(&path)),
            PairHtml {
                meta: pair_meta(p, texts),
                frame: frame(&path),
                texts,
                heading: pair_heading(p, texts),
                summary: pair_summary(
                    texts,
                    &p.src.name,
                    &p.tgt.name,
                    p.rows.len(),
                    (p.exact, p.approximated, p.dropped),
                ),
                page: p,
            }
            .render()?,
        ));
    }
    Ok(out)
}

fn render_sections(shell: &Shell, texts: &Texts) -> Result<Vec<(String, String)>, askama::Error> {
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
            page_file(&path),
            ContentHtml {
                meta: content_meta(
                    texts.get(k.title()).to_owned(),
                    texts.get(k.description()).to_owned(),
                    &path,
                ),
                frame: Frame::new(
                    shell,
                    texts,
                    Some(target),
                    section_schema(k, &page),
                    &Page::Section(k),
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
    use std::collections::HashSet;

    use midiremap_core::Catalog;

    use super::*;
    use crate::pages::Site;

    const STATIC_ASSETS: [&str; 6] = [
        "/favicon.ico",
        "/favicon-32x32.png",
        "/favicon-16x16.png",
        "/icon-192.png",
        "/apple-touch-icon.png",
        "/site.webmanifest",
    ];

    const SHELL: Shell = Shell {
        css: "/assets/index-test.css",
        csp: "default-src &#39;self&#39;",
        beacon: r#"<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>"#,
    };

    fn rendered() -> Vec<(String, String)> {
        let messages = Messages::load().unwrap();
        let docs = Docs::load().unwrap();
        render_site(
            &Site::build(&Catalog::builtin().unwrap()).unwrap(),
            &SHELL,
            &messages,
            &docs,
        )
        .unwrap()
    }

    #[test]
    fn every_page_carries_the_policy_and_the_beacon() {
        for (path, html) in rendered() {
            let head = html.split("</head>").next().unwrap();
            assert!(
                head.contains(
                    r#"<meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;" />"#
                ),
                "{path}"
            );
            assert_eq!(html.matches(SHELL.beacon).count(), 1, "{path}");
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
            assert!(
                html.contains(r#"<script src="/locale.js" defer></script>"#),
                "{path}"
            );
        }
    }

    #[test]
    fn filter_pages_load_the_filter_script() {
        let script = r#"<script src="/filter.js" defer></script>"#;
        assert!(page("engines/index.html").contains(script));
        assert!(page("engines/ezdrummer/index.html").contains(script));
        assert!(!page("convert/addictive-drums2-to-ezdrummer/index.html").contains(script));
    }

    fn page(path: &str) -> String {
        rendered()
            .into_iter()
            .find(|(p, _)| p == path)
            .map(|(_, h)| h)
            .unwrap()
    }

    #[test]
    fn every_page_links_the_app_stylesheet_and_no_inline_styles() {
        for (path, html) in rendered() {
            assert!(
                html.contains(&format!(r#"<link rel="stylesheet" href="{}""#, SHELL.css)),
                "{path}"
            );
            assert!(
                !html.contains("<style") && !html.contains("style=\""),
                "{path}"
            );
        }
    }

    #[test]
    fn templates_use_only_theme_sizes() {
        let templates = [
            include_str!("../templates/base.html"),
            include_str!("../templates/engine.html"),
            include_str!("../templates/index.html"),
            include_str!("../templates/pair.html"),
            include_str!("../templates/content.html"),
            include_str!("../templates/filter.html"),
            include_str!("../templates/lang_menu.html"),
            include_str!("../templates/lang_offer.html"),
            include_str!("../static/filter.js"),
            include_str!("../static/locale.js"),
        ];
        for t in templates {
            for banned in ["text-[", "rounded-[", "text-t6", "style=", "<style"] {
                assert!(!t.contains(banned), "{banned}");
            }
        }
    }

    fn current_nav(html: &str) -> Vec<String> {
        html.split("aria-current=\"page\"")
            .skip(1)
            .filter_map(|rest| rest.split('>').nth(1))
            .map(|label| label.split('<').next().unwrap_or("").trim().to_string())
            .collect()
    }

    #[test]
    fn header_marks_the_current_section() {
        let messages = Messages::load().unwrap();
        for (path, html) in rendered() {
            let locale = Locale::ALL
                .iter()
                .copied()
                .find(|l| !l.prefix().is_empty() && path.starts_with(&format!("{}/", l.prefix())))
                .unwrap_or(Locale::En);
            let rest = path.trim_start_matches(&format!("{}/", locale.prefix()));
            let aria = |nav| format!(r#"<nav aria-label="{}""#, messages.get(locale, nav));
            assert!(html.contains(&aria(Plain::NavMain)), "{path}");
            assert!(html.contains(&aria(Plain::NavSite)), "{path}");
            let expected: Vec<&str> =
                if rest.starts_with("engines/") || rest.starts_with("convert/") {
                    vec![messages.get(locale, Plain::NavNoteMaps)]
                } else if rest == "faq/index.html" {
                    vec![messages.get(locale, SectionKey::Faq.label())]
                } else if rest == "how-it-works/index.html" {
                    vec![messages.get(locale, SectionKey::Guide.label())]
                } else {
                    vec![]
                };
            assert_eq!(current_nav(&html), expected, "{path}");
        }
    }

    #[test]
    fn site_chrome_stays_out_of_search_snippets() {
        for (path, html) in rendered() {
            let body = html.split("<body").nth(1).unwrap();
            let before_header = body.split("<header").next().unwrap();
            assert!(
                before_header.contains("<div data-nosnippet>"),
                "{path}: header"
            );
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
    fn footer_links_are_gold_and_centred() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert!(footer.contains("justify-center"));
        assert!(!footer.contains("trademarks"));
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
        assert!(page("pl/faq/index.html").contains("Postaw mi kawę"));
    }

    #[test]
    fn the_thanks_page_is_in_every_locale_and_kept_out_of_search() {
        let pages = rendered();
        for &l in Locale::ALL {
            let file = page_file(&format!("{}{THANKS}", base(l)));
            let (_, html) = pages
                .iter()
                .find(|(p, _)| *p == file)
                .unwrap_or_else(|| panic!("{file}"));
            let head = html.split("</head>").next().unwrap();
            assert!(
                head.contains(r#"<meta name="robots" content="noindex" />"#),
                "{file}"
            );
            assert!(html.contains(&format!(r#"href="{}""#, home(l))), "{file}");
        }
        assert!(page("thanks/index.html").contains(">Thank you!</h1>"));
    }

    #[test]
    fn content_pages_render_their_section() {
        let faq = page("faq/index.html");
        assert!(faq.contains(">Frequently asked questions</h1>"));
        assert!(faq.contains("Is Drumverter free?"));
        assert!(faq.contains(r#"<script type="application/ld+json">"#));
        let issue = page("report-an-issue/index.html");
        assert!(issue.contains(r#"href="https://github.com/nullcrimson/remidi/issues""#));
        assert!(issue.contains(r#"<a href="https://tally.so/r/J95eYd" target="_blank""#));
        assert!(!issue.contains("application/ld+json"));
        let guide = page("how-it-works/index.html");
        assert!(guide.contains(r#"href="/engines/""#));
    }

    #[test]
    fn pair_pages_switch_octave_and_changes_without_script() {
        let html = page("convert/addictive-drums2-to-ezdrummer/index.html");
        for needle in [
            r#"id="oct-c1""#,
            r#"id="oct-c2""#,
            r#"id="show-all""#,
            r#"id="show-changes""#,
            r#"data-outcome="exact""#,
            r#"data-outcome="approximated""#,
            r#"data-oct="c1""#,
            r#"data-oct="c2""#,
            "⇄ Reverse direction",
        ] {
            assert!(html.contains(needle), "{needle}");
        }
    }

    #[test]
    fn index_matrix_names_each_pair_link() {
        let html = page("engines/index.html");
        assert_eq!(html.matches(r#"aria-label="General MIDI to "#).count(), 7);
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
        assert_eq!(fit(&[longer, long.clone()], &[], 10), long);
    }

    fn in_locale<R>(locale: Locale, f: impl FnOnce(&Texts) -> R) -> R {
        let messages = Messages::load().unwrap();
        let docs = Docs::load().unwrap();
        f(&Texts {
            messages: &messages,
            docs: &docs,
            locale,
        })
    }

    #[test]
    fn engine_titles_lead_with_the_keyword() {
        let site = Site::build(&Catalog::builtin().unwrap()).unwrap();
        for p in &site.engines {
            let title = in_locale(Locale::En, |t| engine_meta(p, t).title);
            let head: String = title.chars().take(60).collect();
            assert!(head.contains("MIDI Note Map"), "{title}");
        }
    }

    #[test]
    fn descriptions_end_on_a_whole_sentence() {
        let site = Site::build(&Catalog::builtin().unwrap()).unwrap();
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
    fn every_page_has_one_h1_title_and_canonical() {
        for (path, html) in rendered() {
            assert_eq!(html.matches("<h1").count(), 1, "{path}");
            assert!(
                html.contains("<title>") && !html.contains("<title></title>"),
                "{path}"
            );
            let canonical = format!(r#"<link rel="canonical" href="{ORIGIN}{}""#, url_of(&path));
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
        known.extend(Locale::ALL.iter().map(|&l| home(l)));
        known.insert(SHELL.css.to_string());
        known.extend(STATIC_ASSETS.iter().map(|s| s.to_string()));
        for (path, html) in &pages {
            for href in html
                .split("href=\"")
                .skip(1)
                .filter_map(|s| s.split('"').next())
            {
                let target = href.split('?').next().unwrap_or(href);
                if target.starts_with('/') {
                    assert!(known.contains(target), "{path} links to missing {href}");
                }
            }
        }
    }

    #[test]
    fn pair_summary_agrees_in_number() {
        let summary =
            |total, counts| in_locale(Locale::En, |t| pair_summary(t, "A", "B", total, counts));
        assert_eq!(
            summary(3, (1, 1, 1)),
            "Of 3 A notes, 1 maps exactly to B, 1 is approximated with the closest available drum, and 1 has no equivalent."
        );
        assert_eq!(
            summary(5, (2, 0, 3)),
            "Of 5 A notes, 2 map exactly to B, 0 are approximated with the closest available drum, and 3 have no equivalent."
        );
    }

    #[test]
    fn pair_pages_name_both_drum_columns() {
        let html = page("convert/ggd-invasion-to-ezdrummer/index.html");
        assert!(html.contains(">GetGood Drums Invasion drum</th>"));
        assert!(html.contains(">EZdrummer 3 drum</th>"));
        assert!(!html.contains(">Drum</th>"));
    }

    #[test]
    fn converter_links_carry_known_distinct_engine_ids() {
        let maps = Catalog::builtin().unwrap();
        let ids: HashSet<&str> = maps.ids().into_iter().collect();
        let mut checked = 0;
        for (path, html) in rendered() {
            for href in html
                .split("href=\"")
                .skip(1)
                .filter_map(|s| s.split('"').next())
                .filter(|h| h.starts_with("/?"))
            {
                let query = href.trim_start_matches("/?").replace("&amp;", "&");
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
        assert_eq!(checked, 86 * 2 + 56);
    }

    #[test]
    fn names_are_escaped_and_intact() {
        let pages = rendered();
        let find = |p: &str| {
            pages
                .iter()
                .find(|(path, _)| path == p)
                .map(|(_, h)| h.clone())
                .unwrap()
        };
        let mm = find("engines/ggd-modernmassive/index.html");
        assert!(mm.contains("Modern &amp; Massive") || mm.contains("Modern &#38; Massive"));
        assert!(!mm.contains("Modern & Massive"));
        let mj = find("engines/solemntones-mjolnir/index.html");
        assert!(mj.contains("Mjölnir"));
    }

    #[test]
    fn descriptions_fit() {
        let site = Site::build(&Catalog::builtin().unwrap()).unwrap();
        let fits = |d: String| d.chars().count() <= DESCRIPTION_MAX;
        in_locale(Locale::En, |t| {
            assert!(site
                .engines
                .iter()
                .all(|p| fits(engine_meta(p, t).description)));
            assert!(site.pairs.iter().all(|p| fits(pair_meta(p, t).description)));
            assert!(fits(index_meta(&site.index, t).description));
        });
    }

    #[test]
    fn polish_faq_renders_the_polish_document_in_polish() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"<html lang="pl">"#));
        let messages = Messages::load().unwrap();
        let heading = messages.get(Locale::Pl, SectionKey::Faq.heading());
        assert_ne!(heading, messages.get(Locale::En, SectionKey::Faq.heading()));
        assert!(html.contains(&format!(">{heading}<")));
        assert!(html.contains("Czy Drumverter jest darmowy?"));
    }

    #[test]
    fn polish_pages_link_the_polish_sections() {
        let html = page("pl/faq/index.html");
        assert!(html.contains(r#"href="/pl/faq/""#));
        assert!(html.contains(r#"href="/pl/terms/""#));
        assert!(html.contains(r#"href="/pl/""#));
    }

    #[test]
    fn every_page_offers_the_language_menu() {
        for (path, html) in rendered() {
            assert!(html.contains(r#"id="language-menu""#), "{path}");
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
        Messages::load().unwrap().format(Locale::Pl, id, &args)
    }

    #[test]
    fn polish_engine_pages_are_written_in_polish_and_link_polish_pages() {
        let html = page("pl/engines/ezdrummer/index.html");
        assert!(html.contains(r#"<html lang="pl">"#));
        assert!(html.contains(&polish(
            MessageId::MapsEngineHeading,
            ("engine", "EZdrummer 3")
        )));
        assert!(html.contains(r#"href="/pl/?to=ezdrummer""#));
        assert!(html.contains(r#"href="/pl/engines/""#));
    }

    #[test]
    fn polish_note_map_index_links_polish_engine_and_pair_pages() {
        let html = page("pl/engines/index.html");
        assert!(html.contains(r#"href="/pl/engines/ezdrummer/""#));
        assert!(html.contains(r#"href="/pl/convert/"#));
        assert!(!html.contains(r#"href="/convert/"#));
    }

    #[test]
    fn the_polish_note_map_index_names_the_remaining_engines_in_polish() {
        let messages = Messages::load().unwrap();
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
        assert!(html.contains(r#"href="/pl/?from="#));
        assert!(html.contains(&polish(
            MessageId::MapsMoreFrom,
            ("engine", "Addictive Drums 2")
        )));
    }

    #[test]
    fn translated_pages_list_their_alternates() {
        let html = page("pl/faq/index.html");
        for (tag, path) in [("en", "/faq/"), ("pl", "/pl/faq/"), ("x-default", "/faq/")] {
            let link =
                format!(r#"<link rel="alternate" hreflang="{tag}" href="{ORIGIN}{path}" />"#);
            assert!(html.contains(&link), "{link}");
        }
        assert!(page("engines/ezdrummer/index.html").contains(&format!(
            r#"<link rel="alternate" hreflang="pl" href="{ORIGIN}/pl/engines/ezdrummer/" />"#
        )));
    }

    #[test]
    fn a_polish_page_offers_english_and_an_english_page_offers_polish() {
        assert!(page("pl/faq/index.html").contains(r#"data-offer="en""#));
        assert!(page("faq/index.html").contains(r#"data-offer="pl""#));
    }

    #[test]
    fn english_section_descriptions_fit() {
        let messages = Messages::load().unwrap();
        for &k in SectionKey::ALL {
            assert!(
                messages.get(Locale::En, k.description()).chars().count() <= DESCRIPTION_MAX,
                "{}",
                k.key()
            );
        }
    }
}
