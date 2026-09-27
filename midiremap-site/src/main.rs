mod notes;
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

fn run(args: Args) -> Result<Site, SiteError> {
    let site = Site::build(&Catalog::builtin())?;
    for (rel, html) in render::render_site(&site)? {
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
                "wrote {} engine pages, {} pair pages, index, sitemap and robots.txt to {}",
                site.engines.len(),
                site.pairs.len(),
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
