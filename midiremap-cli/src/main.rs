use std::process::exit;

use midiremap_core::{BuiltinMaps, Conversion, DefaultFallbacks, LayeredMaps, MapProvider};

fn die(msg: String) -> ! {
    eprintln!("{msg}");
    exit(1);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Build the catalog: builtin presets, optionally layered with a user map.
    let mut provider = LayeredMaps::new(BuiltinMaps::new());
    if let Some(pos) = args.iter().position(|a| a == "--user-map") {
        let path = args
            .get(pos + 1)
            .unwrap_or_else(|| die("--user-map needs a file path".into()));
        let json = std::fs::read_to_string(path)
            .unwrap_or_else(|e| die(format!("cannot read user map {path}: {e}")));
        provider = provider
            .with_user_json(&json)
            .unwrap_or_else(|e| die(format!("invalid user map: {e}")));
    }

    // --list prints available engine ids and exits.
    if args.iter().any(|a| a == "--list") {
        let mut ids = provider.ids();
        ids.sort_unstable();
        for id in ids {
            println!("{id}");
        }
        return;
    }

    if args.len() < 5 {
        eprintln!(
            "usage: midiremap <in.mid> <src_id> <tgt_id> <out.mid> [--user-map <file.json>]\n       midiremap --list"
        );
        exit(2);
    }
    let (in_path, src_id, tgt_id, out_path) = (&args[1], &args[2], &args[3], &args[4]);

    let src = provider
        .get(src_id)
        .unwrap_or_else(|| die(format!("unknown source engine '{src_id}'")));
    let tgt = provider
        .get(tgt_id)
        .unwrap_or_else(|| die(format!("unknown target engine '{tgt_id}'")));

    let mid = std::fs::read(in_path).unwrap_or_else(|e| die(format!("cannot read {in_path}: {e}")));

    let fb = DefaultFallbacks;
    let conv = Conversion::new(src, tgt, &fb);
    let out = conv
        .run(&mid)
        .unwrap_or_else(|e| die(format!("remap failed: {e}")));

    std::fs::write(out_path, &out.bytes)
        .unwrap_or_else(|e| die(format!("cannot write {out_path}: {e}")));
    eprintln!("{}", serde_json::to_string_pretty(&out.report).unwrap());
}
