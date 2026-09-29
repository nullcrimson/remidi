use askama::Template;
use serde_json::json;

use crate::{
    content::script_json,
    i18n::{home, Locale, Messages, Plain},
    pages::ORIGIN,
    SiteError,
};

const HEAD: (&str, &str) = ("<!--app-head-->", "<!--/app-head-->");
const NOSCRIPT: (&str, &str) = ("<!--app-noscript-->", "<!--/app-noscript-->");

#[derive(Template)]
#[template(path = "app_head.html")]
struct AppHead<'a> {
    title: &'a str,
    description: &'a str,
    og_description: &'a str,
    twitter_description: &'a str,
    image_alt: &'a str,
    origin: &'static str,
    canonical: String,
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
pub fn localize_shell(index_html: &str, locale: Locale, m: &Messages) -> Result<String, SiteError> {
    let get = |id| m.get(locale, id);
    let canonical = format!("{ORIGIN}{}", home(locale));
    let head = AppHead {
        title: get(Plain::ConverterTitle),
        description: get(Plain::ConverterDescription),
        og_description: get(Plain::ConverterOgDescription),
        twitter_description: get(Plain::ConverterTwitterDescription),
        image_alt: get(Plain::ConverterImageAlt),
        origin: ORIGIN,
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
    let missing = |what| SiteError::MissingMarker(what);
    let html = replace_region(index_html, HEAD, &head).ok_or_else(|| missing(HEAD.0))?;
    let html = replace_region(&html, NOSCRIPT, &noscript).ok_or_else(|| missing(NOSCRIPT.0))?;
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

    const MARKED: &str = "<html lang=\"en\"><head><!--app-head--><title>Drumverter</title><!--/app-head--></head><body><!--app-noscript--><!--/app-noscript--></body></html>";

    #[test]
    fn the_english_shell_carries_todays_head_and_noscript_text() {
        let out = localize_shell(MARKED, Locale::En, &Messages::load().unwrap()).unwrap();
        assert!(out.contains("<title>Drumverter — free drum MIDI remapper &#38; converter</title>"));
        assert!(out.contains(
            r#"<meta property="og:image:alt" content="Drumverter — drum MIDI converter and remapper" />"#
        ));
        assert!(out.contains(r#""@type":"SoftwareApplication""#));
        assert!(out.contains("enable JavaScript to use the converter"));
        assert!(out.contains(r#"<div id="load-failed" hidden"#));
        assert_eq!(out.matches("application/ld+json").count(), 1);
    }

    #[test]
    fn localizing_twice_gives_the_same_page() {
        let m = Messages::load().unwrap();
        let once = localize_shell(MARKED, Locale::En, &m).unwrap();
        assert_eq!(localize_shell(&once, Locale::En, &m).unwrap(), once);
    }

    #[test]
    fn a_shell_without_markers_is_an_error() {
        assert!(localize_shell("<html></html>", Locale::En, &Messages::load().unwrap()).is_err());
    }
}
