use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand};
use midiremap_core::{
    convert, parse_preset, Catalog, ChannelScope, Mapping, MissingDrums, Overrides,
};

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
    /// Channels to convert: auto (tracks with channel-10 hits, else every track), all, or 1-16
    #[arg(long, value_name = "CHANNEL", default_value = "auto")]
    channel: ChannelScope,
    /// Note edits as JSON: {"tgt":[{"canon":"kick.main","note":35}],
    /// "src":[{"note":24,"canon":"snare1.hit"}]}; a null canon silences a source note
    #[arg(long, value_name = "FILE", conflicts_with = "preset")]
    overrides: Option<PathBuf>,
    /// A preset exported from the web app (.drumverter.json); its engines must match
    #[arg(long, value_name = "FILE")]
    preset: Option<PathBuf>,
    /// Drums the target lacks: nearest (play on the closest drum) or drop (leave out;
    /// another way of playing the same drum still stands in)
    #[arg(long, value_name = "MODE", default_value = "nearest")]
    missing: MissingDrums,
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

fn read_preset(path: &PathBuf, catalog: &Catalog, src: &str, tgt: &str) -> Result<Overrides> {
    let json = std::fs::read_to_string(path)
        .with_context(|| format!("cannot read preset {}", path.display()))?;
    let loaded =
        parse_preset(&json).with_context(|| format!("invalid preset {}", path.display()))?;
    let preset = loaded.preset;
    let resolve = |id: &str| catalog.canonical_id(id).unwrap_or(id).to_owned();
    let (p_src, p_tgt) = (resolve(&preset.src), resolve(&preset.tgt));
    if (p_src.as_str(), p_tgt.as_str()) != (src, tgt) {
        anyhow::bail!(
            "preset {} is for {p_src} → {p_tgt}, not {src} → {tgt}",
            path.display()
        );
    }
    for skipped in &loaded.skipped {
        eprintln!("skipped: {skipped}");
    }
    Ok(preset.overrides())
}

fn run_list(user_map: Option<PathBuf>) -> Result<()> {
    let provider = build_catalog(user_map)?;
    for id in provider.ids() {
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

    let overrides = match &a.preset {
        Some(path) => read_preset(path, &provider, src.id(), tgt.id())?,
        None => read_overrides(a.overrides)?,
    };
    let out = convert(
        &mid,
        &Mapping::new(src, tgt, &overrides, a.missing),
        a.channel,
    )
    .context("remap failed")?;

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
