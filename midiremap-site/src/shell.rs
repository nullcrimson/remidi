use askama::Template;
use serde_json::json;

use crate::{
    content::script_json,
    i18n::{Docs, Locale, Messages, Plain},
    routes::{alternates, home, og_image_url, Alternate, CONVERTER_PAGE},
};

/// What stops the built `index.html` from being localized.
#[derive(thiserror::Error, Debug)]
pub enum ShellError {
    #[error("no {0} marker in the app's index.html")]
    MissingMarker(&'static str),
    #[error(transparent)]
    Render(#[from] askama::Error),
}

const HEAD: (&str, &str) = ("<!--app-head-->", "<!--/app-head-->");
const NOSCRIPT: (&str, &str) = ("<!--app-noscript-->", "<!--/app-noscript-->");
const TITLE: (&str, &str) = ("<!--app-title-->", "<!--/app-title-->");

#[derive(Template)]
#[template(source = r#"<h1 class="sr-only">{{ title }}</h1>"#, ext = "html")]
struct AppTitle<'a> {
    title: &'a str,
}

#[derive(Template)]
#[template(path = "app_head.html")]
struct AppHead<'a> {
    title: &'a str,
    description: &'a str,
    og_description: &'a str,
    twitter_description: &'a str,
    image_alt: &'a str,
    og_image: String,
    canonical: String,
    alternates: Vec<Alternate>,
    json_ld: String,
}

#[derive(Template)]
#[template(path = "app_noscript.html")]
struct AppNoscript<'a> {
    title: &'a str,
    noscript: &'a str,
    load_failed: &'a str,
    load_failed_reload: &'a str,
}

fn replace_region(html: &str, (open, close): (&str, &str), with: &str) -> Option<String> {
    let start = html.find(open)? + open.len();
    let end = start + html[start..].find(close)?;
    Some(format!(
        "{}{}{}",
        &html[..start],
        with.trim_end(),
        &html[end..]
    ))
}

/// The converter's built `index.html` in `locale`: its title, descriptions, social cards,
/// schema, no-script text and load-failure notice written from that locale's messages.
pub fn localize_shell(
    index_html: &str,
    locale: Locale,
    m: &Messages,
    docs: &Docs,
) -> Result<String, ShellError> {
    let get = |id| m.get(locale, id);
    let canonical = home(locale).url();
    let head = AppHead {
        title: get(Plain::ConverterTitle),
        description: get(Plain::ConverterDescription),
        og_description: get(Plain::ConverterOgDescription),
        twitter_description: get(Plain::ConverterTwitterDescription),
        image_alt: get(Plain::ConverterImageAlt),
        og_image: og_image_url(),
        alternates: alternates(&CONVERTER_PAGE, docs),
        json_ld: script_json(&json!({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Drumverter",
            "description": get(Plain::ConverterAppDescription),
            "url": canonical,
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        })),
        canonical,
    }
    .render()?;
    let noscript = AppNoscript {
        title: get(Plain::ConverterTitle),
        noscript: get(Plain::ConverterNoscript),
        load_failed: get(Plain::LoadFailed),
        load_failed_reload: get(Plain::LoadFailedReload),
    }
    .render()?;
    let html = replace_region(index_html, HEAD, &head).ok_or(ShellError::MissingMarker(HEAD.0))?;
    let html =
        replace_region(&html, NOSCRIPT, &noscript).ok_or(ShellError::MissingMarker(NOSCRIPT.0))?;
    let title = AppTitle {
        title: get(Plain::ConverterTitle),
    }
    .render()?;
    let html = replace_region(&html, TITLE, &title).ok_or(ShellError::MissingMarker(TITLE.0))?;
    Ok(html.replacen(
        r#"<html lang="en">"#,
        &format!(r#"<html lang="{}">"#, locale.lang_tag()),
        1,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::i18n::{Locale, Messages};

    const MARKED: &str = "<html lang=\"en\"><head><!--app-head--><title>Drumverter</title><!--/app-head--></head><body><div id=\"root\"><!--app-title--><!--/app-title--></div><!--app-noscript--><!--/app-noscript--></body></html>";

    fn english_shell() -> String {
        localize_shell(
            MARKED,
            Locale::En,
            &Messages::load().unwrap(),
            &Docs::load().unwrap(),
        )
        .unwrap()
    }

    #[test]
    fn the_english_shell_carries_todays_title() {
        let out = english_shell();
        assert!(out.contains("<title>Drumverter — free drum MIDI remapper &#38; converter</title>"));
    }

    #[test]
    fn the_english_shell_carries_the_share_image_description() {
        let out = english_shell();
        assert!(out.contains(
            r#"<meta property="og:image:alt" content="Drumverter — drum MIDI converter and remapper" />"#
        ));
    }

    #[test]
    fn the_english_shell_carries_the_software_application_schema() {
        let out = english_shell();
        assert!(out.contains(r#""@type":"SoftwareApplication""#));
    }

    #[test]
    fn the_english_shell_carries_the_noscript_text() {
        let out = english_shell();
        assert!(out.contains("enable JavaScript to use the converter"));
    }

    #[test]
    fn the_english_shell_carries_the_load_failure_notice() {
        let out = english_shell();
        assert!(out.contains(r#"<div id="load-failed" hidden"#));
    }

    #[test]
    fn the_english_shell_carries_one_structured_data_block() {
        let out = english_shell();
        assert_eq!(out.matches("application/ld+json").count(), 1);
    }

    #[test]
    fn the_english_shell_carries_a_heading_the_app_replaces_on_mount() {
        let m = Messages::load().unwrap();
        let en = localize_shell(MARKED, Locale::En, &m, &Docs::load().unwrap()).unwrap();
        assert!(en.contains(r#"<div id="root"><!--app-title--><h1 class="sr-only">Drumverter — free drum MIDI remapper &#38; converter</h1><!--/app-title--></div>"#));
    }

    #[test]
    fn the_polish_shell_carries_a_heading_the_app_replaces_on_mount() {
        let m = Messages::load().unwrap();
        let pl = localize_shell(MARKED, Locale::Pl, &m, &Docs::load().unwrap()).unwrap();
        assert!(pl.contains(&format!(
            r#"<h1 class="sr-only">{}</h1>"#,
            m.get(Locale::Pl, Plain::ConverterTitle)
        )));
    }

    #[test]
    fn localizing_twice_gives_the_same_page() {
        let m = Messages::load().unwrap();
        let once = localize_shell(MARKED, Locale::En, &m, &Docs::load().unwrap()).unwrap();
        assert_eq!(
            localize_shell(&once, Locale::En, &m, &Docs::load().unwrap()).unwrap(),
            once
        );
    }

    #[test]
    fn the_polish_shell_declares_polish() {
        let m = Messages::load().unwrap();
        let pl = localize_shell(MARKED, Locale::Pl, &m, &Docs::load().unwrap()).unwrap();
        assert!(pl.contains(r#"<html lang="pl">"#));
    }

    #[test]
    fn the_polish_shell_has_its_canonical() {
        let m = Messages::load().unwrap();
        let pl = localize_shell(MARKED, Locale::Pl, &m, &Docs::load().unwrap()).unwrap();
        assert!(pl.contains(r#"<link rel="canonical" href="https://drumverter.com/pl/" />"#));
    }

    #[test]
    fn the_polish_shell_has_its_title() {
        let m = Messages::load().unwrap();
        let pl = localize_shell(MARKED, Locale::Pl, &m, &Docs::load().unwrap()).unwrap();
        assert!(pl.contains(&format!(
            "<title>{}</title>",
            m.get(Locale::Pl, Plain::ConverterTitle)
        )));
    }

    #[test]
    fn every_shell_lists_every_version_and_the_default() {
        let out = english_shell();
        assert_eq!(
            out.matches(r#"rel="alternate" hreflang="#).count(),
            Locale::ALL.len() + 1
        );
    }

    #[test]
    fn the_english_shell_points_the_default_version_at_the_root() {
        let out = english_shell();
        assert!(out.contains(r#"hreflang="x-default" href="https://drumverter.com/""#));
    }

    #[test]
    fn the_polish_shell_carries_the_polish_load_failure_notice() {
        let m = Messages::load().unwrap();
        let pl = localize_shell(MARKED, Locale::Pl, &m, &Docs::load().unwrap()).unwrap();
        assert!(pl.contains(m.get(Locale::Pl, Plain::LoadFailed)));
    }

    #[test]
    fn a_shell_without_markers_is_an_error() {
        assert!(localize_shell(
            "<html></html>",
            Locale::En,
            &Messages::load().unwrap(),
            &Docs::load().unwrap()
        )
        .is_err());
    }
}
