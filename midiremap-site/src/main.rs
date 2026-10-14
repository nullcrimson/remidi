mod content;
mod ftl_vars;
mod i18n;
mod manifest;
mod pages;
#[cfg(test)]
mod parity;
mod render;
mod routes;
mod shell;
mod sitemap;

use std::{
    fs,
    path::{Path, PathBuf},
    process::ExitCode,
};

use clap::Parser;
use midiremap_core::{Catalog, MapError};

use crate::{
    i18n::{Docs, I18nError, Locale, Messages},
    manifest::{AppBuild, ManifestError},
    pages::{BuildError, Site},
    render::RenderError,
    routes::home,
    shell::ShellError,
};

const FILTER_JS: &str = include_str!("../static/filter.js");

#[derive(Parser)]
#[command(about = "Generate Drumverter's static engine and conversion pages")]
struct Args {
    out_dir: PathBuf,
}

#[derive(thiserror::Error, Debug)]
pub enum SiteError {
    #[error(transparent)]
    Build(#[from] BuildError),
    #[error(transparent)]
    Manifest(#[from] ManifestError),
    #[error(transparent)]
    Shell(#[from] ShellError),
    #[error("the builtin engine maps are broken")]
    Catalog(#[from] MapError),
    #[error(transparent)]
    Render(#[from] RenderError),
    #[error(transparent)]
    I18n(#[from] I18nError),
    #[error("cannot write {path}: {source}")]
    Write {
        path: PathBuf,
        source: std::io::Error,
    },
}

fn write(path: PathBuf, contents: &str) -> Result<(), SiteError> {
    let io = |source| SiteError::Write {
        path: path.clone(),
        source,
    };
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(io)?;
    }
    fs::write(&path, contents).map_err(io)
}

fn run(out_dir: &Path) -> Result<usize, SiteError> {
    let AppBuild {
        index_html,
        manifest,
    } = AppBuild::read(out_dir)?;
    let site = Site::build(&Catalog::builtin()?)?;
    let messages = Messages::load()?;
    let docs = Docs::load()?;
    let pages = render::render_site(&site, &manifest, &messages, &docs)?;
    let written = pages.len();
    for (rel, page) in pages {
        write(out_dir.join(rel), &page)?;
    }
    for &l in Locale::ALL {
        write(
            out_dir.join(home(l).file()),
            &shell::localize_shell(&index_html, l, &messages, &docs, &site.popular)?,
        )?;
    }
    write(out_dir.join("filter.js"), FILTER_JS)?;
    write(out_dir.join("sitemap.xml"), &sitemap::sitemap(&site, &docs))?;
    write(out_dir.join("robots.txt"), &sitemap::robots())?;
    Ok(written)
}

fn main() -> ExitCode {
    let Args { out_dir } = Args::parse();
    match run(&out_dir) {
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
