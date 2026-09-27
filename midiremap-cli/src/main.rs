use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand};
use midiremap_core::{convert, Catalog, ChannelScope, Mapping, Overrides};

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
    /// Channels to convert: auto (10 if used, else all), all, or 1-16
    #[arg(long, value_name = "CHANNEL", default_value = "auto")]
    channel: ChannelScope,
    /// Note edits as JSON, in the same shape the web app saves
    #[arg(long, value_name = "FILE")]
    overrides: Option<PathBuf>,
}

fn build_catalog(user_map: Option<PathBuf>) -> Result<Catalog> {
    let mut provider = Catalog::builtin();
    if let Some(path) = user_map {
        let json = std::fs::read_to_string(&path)
            .with_context(|| format!("cannot read user map {}", path.display()))?;
        provider = provider
            .with_user_json(&json)
            .with_context(|| format!("invalid user map {}", path.display()))?;
    }
    Ok(provider)
}

fn read_overrides(path: Option<PathBuf>) -> Result<Overrides> {
    let Some(path) = path else {
        return Ok(Overrides::default());
    };
    let json = std::fs::read_to_string(&path)
        .with_context(|| format!("cannot read overrides {}", path.display()))?;
    serde_json::from_str(&json).with_context(|| format!("invalid overrides {}", path.display()))
}

fn run_list(user_map: Option<PathBuf>) -> Result<()> {
    let provider = build_catalog(user_map)?;
    let mut ids = provider.ids();
    ids.sort_unstable();
    for id in ids {
        println!("{id}");
    }
    Ok(())
}

fn run_convert(a: ConvertArgs) -> Result<()> {
    let provider = build_catalog(a.user_map)?;

    let src = provider
        .get(&a.src)
        .with_context(|| format!("unknown source engine '{}'", a.src))?;
    let tgt = provider
        .get(&a.tgt)
        .with_context(|| format!("unknown target engine '{}'", a.tgt))?;

    let mid =
        std::fs::read(&a.input).with_context(|| format!("cannot read {}", a.input.display()))?;

    let overrides = read_overrides(a.overrides)?;
    let out =
        convert(&mid, &Mapping::new(src, tgt, &overrides), a.channel).context("remap failed")?;

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

#[cfg(test)]
mod tests {
    use super::*;

    fn channel(args: &[&str]) -> Result<ChannelScope, clap::Error> {
        let base = ["midiremap", "convert", "in.mid", "a", "b", "out.mid"];
        let cli = Cli::try_parse_from(base.iter().chain(args))?;
        match cli.command {
            Command::Convert(a) => Ok(a.channel),
            Command::List { .. } => unreachable!("parsed convert"),
        }
    }

    #[test]
    fn channel_defaults_to_auto() {
        assert_eq!(channel(&[]).unwrap(), ChannelScope::Auto);
    }

    #[test]
    fn channel_accepts_all_and_numbers() {
        assert_eq!(channel(&["--channel", "all"]).unwrap(), ChannelScope::All);
        assert_eq!(
            channel(&["--channel", "10"]).unwrap(),
            "10".parse::<ChannelScope>().unwrap()
        );
    }

    #[test]
    fn channel_rejects_out_of_range() {
        for bad in ["0", "17", "drums"] {
            assert!(channel(&["--channel", bad]).is_err(), "{bad}");
        }
    }
}
