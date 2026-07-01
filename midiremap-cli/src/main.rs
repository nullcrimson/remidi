use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand};
use midiremap_core::{BuiltinMaps, Conversion, DefaultFallbacks, LayeredMaps, MapProvider};

#[derive(Parser)]
#[command(
    name = "midiremap",
    version,
    about = "Remap drum MIDI between sample-engine note layouts"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Convert(ConvertArgs),
    List {
        #[arg(long, value_name = "FILE")]
        user_map: Option<PathBuf>,
    },
}

#[derive(Args)]
struct ConvertArgs {
    input: PathBuf,
    src: String,
    tgt: String,
    output: PathBuf,
    #[arg(long, value_name = "FILE")]
    user_map: Option<PathBuf>,
}

fn build_provider(user_map: Option<PathBuf>) -> Result<LayeredMaps<BuiltinMaps>> {
    let mut provider = LayeredMaps::new(BuiltinMaps::new());
    if let Some(path) = user_map {
        let json = std::fs::read_to_string(&path)
            .with_context(|| format!("cannot read user map {}", path.display()))?;
        provider = provider
            .with_user_json(&json)
            .with_context(|| format!("invalid user map {}", path.display()))?;
    }
    Ok(provider)
}

fn run_list(user_map: Option<PathBuf>) -> Result<()> {
    let provider = build_provider(user_map)?;
    let mut ids = provider.ids();
    ids.sort_unstable();
    for id in ids {
        println!("{id}");
    }
    Ok(())
}

fn run_convert(a: ConvertArgs) -> Result<()> {
    let provider = build_provider(a.user_map)?;

    let src = provider
        .get(&a.src)
        .with_context(|| format!("unknown source engine '{}'", a.src))?;
    let tgt = provider
        .get(&a.tgt)
        .with_context(|| format!("unknown target engine '{}'", a.tgt))?;

    let mid =
        std::fs::read(&a.input).with_context(|| format!("cannot read {}", a.input.display()))?;

    let fb = DefaultFallbacks;
    let conv = Conversion::new(src, tgt, &fb);
    let out = conv.run(&mid).context("remap failed")?;

    std::fs::write(&a.output, &out.bytes)
        .with_context(|| format!("cannot write {}", a.output.display()))?;
    eprintln!("{}", serde_json::to_string_pretty(&out.report)?);
    Ok(())
}

fn main() -> Result<()> {
    match Cli::parse().command {
        Command::Convert(a) => run_convert(a),
        Command::List { user_map } => run_list(user_map),
    }
}
