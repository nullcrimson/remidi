use askama::Template;
use midiremap_core::PlanStatus;

use crate::{
    content::{Block, ContentPage, Link, CONTENT},
    pages::{EnginePage, IndexPage, PairPage, Site, ORIGIN},
};

pub const DESCRIPTION_MAX: usize = 155;

pub struct Meta {
    pub title: String,
    pub description: String,
    pub canonical: String,
}

pub const TITLE_NAME_MAX: usize = 40;

const DANGLING: [char; 9] = [' ', ',', '.', ':', ';', '&', '(', '-', '/'];

pub fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    let head: String = s.chars().take(max.saturating_sub(1)).collect();
    let mut cut = head.rfind(' ').map_or(head.as_str(), |i| &head[..i]);
    if cut.matches('(').count() > cut.matches(')').count() {
        cut = cut.rfind('(').map_or(cut, |i| &cut[..i]);
    }
    format!("{}…", cut.trim_end_matches(DANGLING))
}

fn fit(first: &[String], rest: &[String], max: usize) -> String {
    let Some(mut out) = first.iter().find(|s| s.chars().count() <= max).cloned() else {
        return first.last().map_or_else(String::new, |s| truncate(s, max));
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

pub fn engine_meta(p: &EnginePage) -> Meta {
    let n = &p.engine.name;
    let title = if n.chars().count() <= TITLE_NAME_MAX {
        format!("{} Note Map & Drum Mapping | Drumverter", with_midi(n))
    } else {
        format!("MIDI Note Map: {n} | Drumverter")
    };
    Meta {
        title,
        description: fit(
            &[
                format!(
                    "{n} drum MIDI note map: all {} notes with drum names in C-1 and C-2 octave conventions.",
                    p.total
                ),
                format!("{n} drum MIDI note map with C-1 and C-2 note names."),
            ],
            &[format!("Convert {} to any engine, free.", with_midi(n))],
            DESCRIPTION_MAX,
        ),
        canonical: format!("{ORIGIN}{}", p.engine.href()),
    }
}

fn agree<'a>(n: usize, one: &'a str, many: &'a str) -> &'a str {
    if n == 1 {
        one
    } else {
        many
    }
}

pub fn pair_summary(
    src: &str,
    tgt: &str,
    total: usize,
    exact: usize,
    approximated: usize,
    dropped: usize,
) -> String {
    format!(
        "Of {total} {src} notes, {exact} {} exactly to {tgt}, {approximated} {} approximated with the closest available drum, and {dropped} {} no equivalent.",
        agree(exact, "maps", "map"),
        agree(approximated, "is", "are"),
        agree(dropped, "has", "have"),
    )
}

fn pair_heading(p: &PairPage) -> String {
    format!("Convert {} to {}", with_midi(&p.src.name), p.tgt.name)
}

pub fn pair_meta(p: &PairPage) -> Meta {
    let (s, t) = (&p.src.name, &p.tgt.name);
    Meta {
        title: format!("{} | Drumverter", pair_heading(p)),
        description: fit(
            &[format!(
                "Convert {s} drum MIDI to {t}: {} {} exactly, {} approximated, {} dropped.",
                p.exact,
                agree(p.exact, "note maps", "notes map"),
                p.approximated,
                p.dropped
            )],
            &["Free in-browser converter.".to_string()],
            DESCRIPTION_MAX,
        ),
        canonical: format!("{ORIGIN}/convert/{}/", p.slug),
    }
}

pub fn index_meta(p: &IndexPage) -> Meta {
    Meta {
        title: format!(
            "Drum MIDI Note Maps for {} Drum Engines | Drumverter",
            p.all.len()
        ),
        description: fit(
            &[format!(
                "Drum MIDI note maps for {} drum engines, plus conversion tables between GetGood Drums, EZdrummer, Superior Drummer, Addictive Drums and more.",
                p.all.len()
            )],
            &[],
            DESCRIPTION_MAX,
        ),
        canonical: format!("{ORIGIN}/engines/"),
    }
}

pub fn content_meta(p: &ContentPage) -> Meta {
    Meta {
        title: p.section.title.clone(),
        description: p.section.description.clone(),
        canonical: format!("{ORIGIN}{}", p.section.href()),
    }
}

pub struct NavItem {
    pub label: String,
    pub href: String,
    pub current: bool,
}

/// What the static pages take from the app's built `index.html`: its stylesheet, its
/// content security policy (escaped attribute text) and its analytics beacon `<script>`
/// element, both written as they are.
pub struct Shell<'a> {
    pub css: &'a str,
    pub csp: &'a str,
    pub beacon: &'a str,
}

/// What every page shares: the app shell, header nav, footer and optional schema.
pub struct Frame {
    pub css: String,
    pub csp: String,
    pub beacon: String,
    pub nav: Vec<NavItem>,
    pub footer: Vec<Link>,
    pub trademark: String,
    pub json_ld: Option<String>,
}

impl Frame {
    fn new(shell: &Shell, current: Option<&str>, json_ld: Option<String>) -> Self {
        Self {
            css: shell.css.to_string(),
            csp: shell.csp.to_string(),
            beacon: shell.beacon.to_string(),
            nav: CONTENT
                .nav
                .iter()
                .map(|l| NavItem {
                    label: l.label.clone(),
                    href: l.href.clone(),
                    current: current == Some(l.href.as_str()),
                })
                .collect(),
            footer: CONTENT.footer_links(),
            trademark: CONTENT.trademark.clone(),
            json_ld,
        }
    }
}

const NOTE_MAPS: Option<&str> = Some("/engines/");

#[derive(Template)]
#[template(path = "engine.html")]
struct EngineHtml<'a> {
    meta: Meta,
    frame: Frame,
    page: &'a EnginePage,
}

#[derive(Template)]
#[template(path = "pair.html")]
struct PairHtml<'a> {
    meta: Meta,
    frame: Frame,
    heading: String,
    summary: String,
    page: &'a PairPage,
}

#[derive(Template)]
#[template(path = "index.html")]
struct IndexHtml<'a> {
    meta: Meta,
    frame: Frame,
    page: &'a IndexPage,
}

#[derive(Template)]
#[template(path = "content.html")]
struct ContentHtml<'a> {
    meta: Meta,
    frame: Frame,
    page: &'a ContentPage,
}

pub fn render_site(site: &Site, shell: &Shell) -> Result<Vec<(String, String)>, askama::Error> {
    let mut out = vec![(
        "engines/index.html".to_string(),
        IndexHtml {
            meta: index_meta(&site.index),
            frame: Frame::new(shell, NOTE_MAPS, None),
            page: &site.index,
        }
        .render()?,
    )];
    for p in &site.engines {
        out.push((
            format!("engines/{}/index.html", p.engine.slug),
            EngineHtml {
                meta: engine_meta(p),
                frame: Frame::new(shell, NOTE_MAPS, None),
                page: p,
            }
            .render()?,
        ));
    }
    for p in &site.pairs {
        out.push((
            format!("convert/{}/index.html", p.slug),
            PairHtml {
                meta: pair_meta(p),
                frame: Frame::new(shell, NOTE_MAPS, None),
                heading: pair_heading(p),
                summary: pair_summary(
                    &p.src.name,
                    &p.tgt.name,
                    p.rows.len(),
                    p.exact,
                    p.approximated,
                    p.dropped,
                ),
                page: p,
            }
            .render()?,
        ));
    }
    for p in &site.content {
        let href = p.section.href();
        out.push((
            format!("{}/index.html", p.section.slug),
            ContentHtml {
                meta: content_meta(p),
                frame: Frame::new(shell, Some(&href), p.json_ld.clone()),
                page: p,
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

    const STATIC_ASSETS: [&str; 5] = [
        "/favicon.ico",
        "/favicon-32x32.png",
        "/favicon-16x16.png",
        "/apple-touch-icon.png",
        "/site.webmanifest",
    ];

    const SHELL: Shell = Shell {
        css: "/assets/index-test.css",
        csp: "default-src &#39;self&#39;",
        beacon: r#"<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script>"#,
    };

    fn rendered() -> Vec<(String, String)> {
        render_site(&Site::build(&Catalog::builtin()).unwrap(), &SHELL).unwrap()
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
            include_str!("../static/filter.js"),
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
        for (path, html) in rendered() {
            assert!(html.contains(r#"<nav aria-label="Main""#), "{path}");
            assert!(html.contains(r#"<nav aria-label="Site""#), "{path}");
            let expected: &[&str] = if path.starts_with("engines/") || path.starts_with("convert/")
            {
                &["Note maps"]
            } else if path == "faq/index.html" {
                &["FAQ"]
            } else {
                &[]
            };
            assert_eq!(current_nav(&html), expected, "{path}");
        }
    }

    #[test]
    fn footer_links_are_gold_and_centred() {
        let html = page("faq/index.html");
        let footer = html.split("<footer").nth(1).unwrap();
        assert!(footer.contains("justify-center"));
        assert!(footer.contains("text-center"));
        assert_eq!(
            footer.matches("<a ").count(),
            footer.matches(r#"class="prose-link""#).count()
        );
    }

    #[test]
    fn content_pages_render_their_section() {
        let faq = page("faq/index.html");
        assert!(faq.contains(">Frequently asked questions</h1>"));
        assert!(faq.contains("Is Drumverter free?"));
        assert!(faq.contains(r#"<script type="application/ld+json">"#));
        let issue = page("report-an-issue/index.html");
        assert!(issue.contains(r#"href="https://github.com/nullcrimson/remidi/issues""#));
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
    fn truncate_counts_chars_and_cuts_at_words() {
        assert_eq!(truncate("short", 155), "short");
        let long = "Mjölnir ".repeat(40);
        let t = truncate(&long, 155);
        assert!(t.chars().count() <= 155);
        assert!(t.ends_with('…'));
        assert!(!t.contains("Mjöl…"));
    }

    #[test]
    fn truncate_drops_dangling_symbols() {
        assert_eq!(truncate("Convert Modern & Massive", 19), "Convert Modern…");
        assert_eq!(
            truncate("Perfect Drums (Naughty Seal Audio)", 23),
            "Perfect Drums…"
        );
    }

    #[test]
    fn engine_titles_lead_with_the_keyword() {
        let site = Site::build(&Catalog::builtin()).unwrap();
        for p in &site.engines {
            let title = engine_meta(p).title;
            let head: String = title.chars().take(60).collect();
            assert!(head.contains("MIDI Note Map"), "{title}");
        }
    }

    #[test]
    fn descriptions_end_on_a_whole_sentence() {
        let site = Site::build(&Catalog::builtin()).unwrap();
        let descriptions = site
            .engines
            .iter()
            .map(|p| engine_meta(p).description)
            .chain(site.pairs.iter().map(|p| pair_meta(p).description))
            .chain(std::iter::once(index_meta(&site.index).description));
        for d in descriptions {
            assert!(d.ends_with('.'), "{d}");
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
        known.insert("/".to_string());
        known.insert(SHELL.css.to_string());
        known.extend(STATIC_ASSETS.iter().map(|s| s.to_string()));
        for (path, html) in &pages {
            for href in html
                .split("href=\"")
                .skip(1)
                .filter_map(|s| s.split('"').next())
            {
                if href.starts_with('/') && !href.starts_with("/?") {
                    assert!(known.contains(href), "{path} links to missing {href}");
                }
            }
        }
    }

    #[test]
    fn pair_summary_agrees_in_number() {
        assert_eq!(
            pair_summary("A", "B", 3, 1, 1, 1),
            "Of 3 A notes, 1 maps exactly to B, 1 is approximated with the closest available drum, and 1 has no equivalent."
        );
        assert_eq!(
            pair_summary("A", "B", 5, 2, 0, 3),
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
        let maps = Catalog::builtin();
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
        let site = Site::build(&Catalog::builtin()).unwrap();
        for p in &site.engines {
            assert!(engine_meta(p).description.chars().count() <= DESCRIPTION_MAX);
        }
        for p in &site.pairs {
            assert!(pair_meta(p).description.chars().count() <= DESCRIPTION_MAX);
        }
        assert!(index_meta(&site.index).description.chars().count() <= DESCRIPTION_MAX);
    }
}
