use std::{
    path::{Path, PathBuf},
    process::ExitCode,
};

use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand};
use midiremap_core::{
    convert, parse_preset, part_summaries, Catalog, ChannelScope, Conversion, Damage, EngineId,
    EngineMap, Mapping, MissingDrums, Overrides, Part, PartSummary, Parts, Position, Selection,
    Unrecognized,
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
    /// Channels to convert: auto (channel 10, else the file's one part with notes, else ask), all, or 1-16
    #[arg(long, value_name = "CHANNEL", default_value_t)]
    channel: ChannelScope,
    /// The drum parts to convert instead, as track:channel items counted from 1, such as
    /// 1:10,2:1; every other part stays as it is
    #[arg(
        long,
        value_name = "PARTS",
        value_delimiter = ',',
        conflicts_with = "channel"
    )]
    parts: Option<Vec<Part>>,
    /// A preset exported from the web app (<name>-drumverter.json); its engines must match
    #[arg(long, value_name = "FILE")]
    preset: Option<PathBuf>,
    /// Drums the target lacks: nearest (play on the closest drum) or drop (leave out;
    /// another way of playing the same drum still stands in)
    #[arg(long, value_name = "MODE", default_value_t)]
    missing: MissingDrums,
    /// Notes the source layout does not recognize: remove (leave out) or keep (write out
    /// unchanged); the report lists them either way
    #[arg(long, value_name = "MODE", default_value_t)]
    unrecognized: Unrecognized,
}

fn build_catalog(user_map: Option<PathBuf>) -> Result<Catalog> {
    let mut catalog = Catalog::builtin();
    if let Some(path) = user_map {
        let json = std::fs::read_to_string(&path)
            .with_context(|| format!("cannot read user map {}", path.display()))?;
        catalog = catalog
            .with_user_json(&json)
            .with_context(|| format!("invalid user map {}", path.display()))?;
    }
    Ok(catalog)
}

fn read_preset(
    path: &Path,
    catalog: &Catalog,
    src: &EngineMap,
    tgt: &EngineMap,
) -> Result<Overrides> {
    let json = std::fs::read_to_string(path)
        .with_context(|| format!("cannot read preset {}", path.display()))?;
    let loaded = parse_preset(&json, catalog)
        .with_context(|| format!("invalid preset {}", path.display()))?;
    let preset = loaded.preset;
    if (&preset.src, &preset.tgt) != (&EngineId::from(src), &EngineId::from(tgt)) {
        anyhow::bail!(
            "preset {} is for {} → {}, not {} → {}",
            path.display(),
            preset.src.as_str(),
            preset.tgt.as_str(),
            src.id(),
            tgt.id()
        );
    }
    for skipped in &loaded.skipped {
        eprintln!("skipped: {skipped}");
    }
    Ok(preset.overrides)
}

fn run_list(user_map: Option<PathBuf>) -> Result<()> {
    let catalog = build_catalog(user_map)?;
    for id in catalog.ids() {
        println!("{id}");
    }
    Ok(())
}

/// The exit code of a conversion that wrote its output from a damaged file.
const EXIT_DAMAGED: u8 = 3;
/// The exit code of a conversion that wrote nothing: it needs to be told which parts are
/// the drums.
const EXIT_ASK_PARTS: u8 = 4;

fn run_convert(a: ConvertArgs) -> Result<ExitCode> {
    let catalog = build_catalog(a.user_map)?;

    let src = catalog
        .get(&a.src)
        .with_context(|| format!("unknown source engine '{}'", a.src))?;
    let tgt = catalog
        .get(&a.tgt)
        .with_context(|| format!("unknown target engine '{}'", a.tgt))?;

    let mid =
        std::fs::read(&a.input).with_context(|| format!("cannot read {}", a.input.display()))?;

    let overrides = match &a.preset {
        Some(path) => read_preset(path, &catalog, src, tgt)?,
        None => Overrides::default(),
    };
    let selection: Selection = match a.parts {
        Some(parts) => Parts::try_from(parts).context("invalid --parts")?.into(),
        None => a.channel.into(),
    };
    let conversion = convert(
        &mid,
        &Mapping::new(src, tgt, &overrides, a.missing).with_unrecognized(a.unrecognized),
        selection,
    )
    .context("remap failed")?;
    let out = match conversion {
        Conversion::Done(out) => out,
        Conversion::Ask { parts, damage } => {
            eprintln!(
                "{} has notes on several parts and none on channel 10, so nothing was converted; \
                 name the drum parts among them with --parts, as in --parts {}:",
                a.input.display(),
                listed(parts.iter())
            );
            for summary in part_summaries(&mid, Some(src))? {
                eprintln!("  {}", summary_line(&summary));
            }
            print_damage(&a.input, &damage, "nothing was converted");
            return Ok(ExitCode::from(EXIT_ASK_PARTS));
        }
    };

    std::fs::write(&a.output, &out.bytes)
        .with_context(|| format!("cannot write {}", a.output.display()))?;
    eprintln!("{}", serde_json::to_string_pretty(&out.report)?);
    if !out.offers.is_empty() {
        eprintln!("left as they are, beside the channel-10 drums of their track:");
        for offer in &out.offers {
            eprintln!("  {}", summary_line(offer));
        }
        eprintln!(
            "to convert them too, pass --parts {}",
            listed(out.picked.iter().chain(out.offers.iter().map(|o| &o.part)))
        );
    }
    if out.damage.is_empty() {
        return Ok(ExitCode::SUCCESS);
    }
    print_damage(&a.input, &out.damage, "what it still held was converted");
    Ok(ExitCode::from(EXIT_DAMAGED))
}

fn listed<'a>(parts: impl Iterator<Item = &'a Part>) -> String {
    parts.map(ToString::to_string).collect::<Vec<_>>().join(",")
}

fn summary_line(s: &PartSummary) -> String {
    let name = s.track_name.as_deref().unwrap_or("unnamed track");
    let plays = s.plays.as_ref().map_or_else(String::new, |plays| {
        let drums: Vec<String> = plays
            .drums
            .iter()
            .map(|d| format!("{} {}", d.canon, d.hits))
            .collect();
        format!("; plays {}; {} unknown", drums.join(", "), plays.unknown)
    });
    format!("{} \"{name}\": {} hits{plays}", s.part, s.hits)
}

fn print_damage(input: &Path, damage: &[Damage], outcome: &str) {
    if damage.is_empty() {
        return;
    }
    eprintln!("{} is damaged; {outcome}:", input.display());
    for d in damage {
        eprintln!("  {}", damage_line(d));
    }
}

fn damage_line(damage: &Damage) -> String {
    match damage {
        Damage::TrackCut {
            track,
            at,
            events_read,
        } => {
            let at = match at {
                Position::Bar(bar) => format!("bar {bar}"),
                Position::Tick(tick) => format!("tick {tick}"),
            };
            format!("track {track} stops after {events_read} events, at {at}; the rest of it is missing")
        }
        Damage::TracksMissing { declared, read } => {
            format!("the file says it has {declared} tracks; only {read} could be read")
        }
    }
}

fn main() -> Result<ExitCode> {
    match Cli::parse().command {
        Command::Convert(a) => run_convert(a),
        Command::List { user_map } => run_list(user_map).map(|()| ExitCode::SUCCESS),
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
    fn channel_accepts_all() {
        assert_eq!(channel(&["--channel", "all"]).unwrap(), ChannelScope::All);
    }

    #[test]
    fn channel_accepts_numbers() {
        assert_eq!(
            channel(&["--channel", "10"]).unwrap(),
            "10".parse::<ChannelScope>().unwrap()
        );
    }

    #[test]
    fn channel_rejects_a_value_the_scope_parser_rejects() {
        assert!("0".parse::<ChannelScope>().is_err());
        assert!(channel(&["--channel", "0"]).is_err());
    }
}
