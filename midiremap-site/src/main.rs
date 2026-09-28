mod content;
mod pages;
mod render;
mod sitemap;

use std::{fs, path::PathBuf, process::ExitCode};

use clap::Parser;
use midiremap_core::Catalog;

use crate::pages::Site;

#[derive(Parser)]
#[command(about = "Generate Drumverter's static engine and conversion pages")]
struct Args {
    out_dir: PathBuf,
}

#[derive(thiserror::Error, Debug)]
pub enum SiteError {
    #[error("unknown engine id: {0}")]
    UnknownEngine(String),
    #[error("no app stylesheet linked from {0}; run the app build first")]
    MissingStylesheet(PathBuf),
    #[error("slug collision: {0}")]
    SlugCollision(String),
    #[error(transparent)]
    Render(#[from] askama::Error),
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

fn run(args: Args) -> Result<Site, SiteError> {
    let index = args.out_dir.join("index.html");
    let html = fs::read_to_string(&index).map_err(|source| SiteError::Io {
        path: index.clone(),
        source,
    })?;
    let css = stylesheet_href(&html).ok_or(SiteError::MissingStylesheet(index))?;
    let site = Site::build(&Catalog::builtin())?;
    for (rel, html) in render::render_site(&site, css)? {
        write(args.out_dir.join(rel), &html)?;
    }
    write(args.out_dir.join("sitemap.xml"), &sitemap::sitemap(&site))?;
    write(args.out_dir.join("robots.txt"), &sitemap::robots())?;
    Ok(site)
}

fn main() -> ExitCode {
    let args = Args::parse();
    let out_dir = args.out_dir.clone();
    match run(args) {
        Ok(site) => {
            println!(
                "wrote {} engine pages, {} pair pages, {} content pages, index, sitemap and robots.txt to {}",
                site.engines.len(),
                site.pairs.len(),
                site.content.len(),
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

    #[test]
    fn finds_the_built_stylesheet_and_skips_web_fonts() {
        let html = r#"<link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index-a1.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-b2.css">"#;
        assert_eq!(stylesheet_href(html), Some("/assets/index-b2.css"));
        assert_eq!(
            stylesheet_href(r#"<link rel="stylesheet" href="https://x/y.css">"#),
            None
        );
    }
}
