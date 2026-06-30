use std::{path::PathBuf, process::exit};

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
    /// Convert a .mid from one engine's note layout to another.
    Convert(ConvertArgs),
    /// List available engine ids.
    List {
        /// Optional user/override engine map (JSON) to include in the listing.
        #[arg(long, value_name = "FILE")]
        user_map: Option<PathBuf>,
    },
}

#[derive(Args)]
struct ConvertArgs {
    /// Input .mid file.
    input: PathBuf,
    /// Source engine id (see `midiremap list`).
    src: String,
    /// Target engine id.
    tgt: String,
    /// Output .mid file.
    output: PathBuf,
    /// Optional user/override engine map (JSON): adds or overrides an engine.
    #[arg(long, value_name = "FILE")]
    user_map: Option<PathBuf>,
}

fn die(msg: String) -> ! {
    eprintln!("{msg}");
    exit(1);
}

/// Build the catalog: builtin presets, optionally layered with a user map.
fn build_provider(user_map: Option<PathBuf>) -> LayeredMaps<BuiltinMaps> {
    let mut provider = LayeredMaps::new(BuiltinMaps::new());
    if let Some(path) = user_map {
        let json = std::fs::read_to_string(&path)
            .unwrap_or_else(|e| die(format!("cannot read user map {}: {e}", path.display())));
        provider = provider
            .with_user_json(&json)
            .unwrap_or_else(|e| die(format!("invalid user map: {e}")));
    }
    provider
}

fn run_list(user_map: Option<PathBuf>) {
    let provider = build_provider(user_map);
    let mut ids = provider.ids();
    ids.sort_unstable();
    for id in ids {
        println!("{id}");
    }
}

fn run_convert(a: ConvertArgs) {
    let provider = build_provider(a.user_map);

    let src = provider
        .get(&a.src)
        .unwrap_or_else(|| die(format!("unknown source engine '{}'", a.src)));
    let tgt = provider
        .get(&a.tgt)
        .unwrap_or_else(|| die(format!("unknown target engine '{}'", a.tgt)));

    let mid = std::fs::read(&a.input)
        .unwrap_or_else(|e| die(format!("cannot read {}: {e}", a.input.display())));

    let fb = DefaultFallbacks;
    let conv = Conversion::new(src, tgt, &fb);
    let out = conv
        .run(&mid)
        .unwrap_or_else(|e| die(format!("remap failed: {e}")));

    std::fs::write(&a.output, &out.bytes)
        .unwrap_or_else(|e| die(format!("cannot write {}: {e}", a.output.display())));
    eprintln!("{}", serde_json::to_string_pretty(&out.report).unwrap());
}

fn main() {
    match Cli::parse().command {
        Command::Convert(a) => run_convert(a),
        Command::List { user_map } => run_list(user_map),
    }
}
