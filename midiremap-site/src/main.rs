mod content;
mod ftl_vars;
mod i18n;
mod pages;
#[cfg(test)]
mod parity;
mod render;
mod shell;
mod sitemap;

use std::{
    fs,
    path::{Path, PathBuf},
    process::ExitCode,
};

use clap::Parser;
use midiremap_core::Catalog;

use crate::{
    i18n::{home, Docs, I18nError, Locale, Messages},
    pages::{page_file, Site},
    render::Shell,
};

const FILTER_JS: &str = include_str!("../static/filter.js");
const LOCALE_JS: &str = include_str!("../static/locale.js");

#[derive(Parser)]
#[command(about = "Generate Drumverter's static engine and conversion pages")]
struct Args {
    out_dir: PathBuf,
}

#[derive(thiserror::Error, Debug)]
pub enum SiteError {
    #[error("unknown engine id: {0}")]
    UnknownEngine(String),
    #[error("no {what} in {}; run the app build first", path.display())]
    MissingFromIndex { what: &'static str, path: PathBuf },
    #[error("no {0} marker in the app's index.html")]
    MissingMarker(&'static str),
    #[error("slug collision: {0}")]
    SlugCollision(String),
    #[error(transparent)]
    Render(#[from] askama::Error),
    #[error(transparent)]
    I18n(#[from] I18nError),
    #[error("cannot write {path}: {source}")]
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
}

fn write(path: PathBuf, contents: &str) -> Result<(), SiteError> {
    let io = |source| SiteError::Io {
        path: path.clone(),
        source,
    };
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(io)?;
    }
    fs::write(&path, contents).map_err(io)
}

/// The app's own stylesheet, as the Vite build links it from `index.html`.
fn stylesheet_href(index_html: &str) -> Option<&str> {
    index_html
        .split("<link")
        .skip(1)
        .filter_map(|tag| tag.split('>').next())
        .filter(|tag| tag.contains(r#"rel="stylesheet""#))
        .filter_map(|tag| tag.split(r#"href=""#).nth(1)?.split('"').next())
        .find(|href| href.starts_with('/') && href.ends_with(".css"))
}

/// The built `index.html`'s content security policy, as HTML-escaped attribute text.
fn content_security_policy(index_html: &str) -> Option<&str> {
    index_html
        .split("<meta")
        .skip(1)
        .filter_map(|tag| tag.split('>').next())
        .filter(|tag| tag.contains(r#"http-equiv="Content-Security-Policy""#))
        .find_map(|tag| tag.split(r#"content=""#).nth(1)?.split('"').next())
}

/// The built `index.html`'s Cloudflare Web Analytics `<script>` element.
fn beacon(index_html: &str) -> Option<&str> {
    index_html.match_indices("<script").find_map(|(at, _)| {
        let rest = &index_html[at..];
        let open = rest.find('>')?;
        let end = rest.find("</script>")? + "</script>".len();
        rest[..open]
            .contains("data-cf-beacon")
            .then(|| &rest[..end])
    })
}

fn app_shell<'a>(index_html: &'a str, path: &Path) -> Result<Shell<'a>, SiteError> {
    let missing = |what| SiteError::MissingFromIndex {
        what,
        path: path.to_path_buf(),
    };
    Ok(Shell {
        css: stylesheet_href(index_html).ok_or_else(|| missing("stylesheet"))?,
        csp: content_security_policy(index_html)
            .ok_or_else(|| missing("content security policy"))?,
        beacon: beacon(index_html).ok_or_else(|| missing("analytics beacon"))?,
    })
}

fn run(args: Args) -> Result<usize, SiteError> {
    let index = args.out_dir.join("index.html");
    let html = fs::read_to_string(&index).map_err(|source| SiteError::Io {
        path: index.clone(),
        source,
    })?;
    let shell = app_shell(&html, &index)?;
    let site = Site::build(&Catalog::builtin())?;
    let messages = Messages::load()?;
    let docs = Docs::load()?;
    let pages = render::render_site(&site, &shell, &messages, &docs)?;
    let written = pages.len();
    for (rel, page) in pages {
        write(args.out_dir.join(rel), &page)?;
    }
    for &l in Locale::ALL {
        write(
            args.out_dir.join(page_file(&home(l))),
            &shell::localize_shell(&html, l, &messages)?,
        )?;
    }
    write(args.out_dir.join("filter.js"), FILTER_JS)?;
    write(args.out_dir.join("locale.js"), LOCALE_JS)?;
    write(
        args.out_dir.join("sitemap.xml"),
        &sitemap::sitemap(&site, &docs),
    )?;
    write(args.out_dir.join("robots.txt"), &sitemap::robots())?;
    Ok(written)
}

fn main() -> ExitCode {
    let args = Args::parse();
    let out_dir = args.out_dir.clone();
    match run(args) {
        Ok(pages) => {
            println!(
                "wrote {pages} static pages and {} converter pages in {} languages, sitemap and robots.txt to {}",
                Locale::ALL.len(),
                Locale::ALL.len(),
                out_dir.display()
            );
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const INDEX: &str = r#"<head>
    <meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;; font-src &#39;self&#39;">
    <meta charset="UTF-8" />
    <link href="https://example.com/fonts.css" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index-a1.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-b2.css">
  </head>
  <body>
    <script type="application/ld+json">{}</script>
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon='{"token": "t"}'
    ></script>
  </body>"#;

    #[test]
    fn reads_the_shell_from_the_built_index() {
        let shell = app_shell(INDEX, Path::new("index.html")).unwrap();
        assert_eq!(shell.css, "/assets/index-b2.css");
        assert_eq!(
            shell.csp,
            "default-src &#39;self&#39;; font-src &#39;self&#39;"
        );
        assert!(shell.beacon.starts_with("<script\n      defer"));
        assert!(shell.beacon.contains(r#"data-cf-beacon='{"token": "t"}'"#));
        assert!(shell.beacon.ends_with("></script>"));
    }

    #[test]
    fn a_shell_part_missing_from_the_index_is_an_error() {
        let path = Path::new("index.html");
        let without = |part: &str| INDEX.replace(part, "");
        for (part, what) in [
            ("/assets/index-b2.css", "stylesheet"),
            ("Content-Security-Policy", "content security policy"),
            ("data-cf-beacon", "analytics beacon"),
        ] {
            let err = app_shell(&without(part), path).err().unwrap();
            assert!(err.to_string().contains(what), "{err}");
        }
    }

    #[test]
    fn only_a_local_stylesheet_counts() {
        assert_eq!(
            stylesheet_href(r#"<link rel="stylesheet" href="https://x/y.css">"#),
            None
        );
    }
}
