use std::{collections::HashSet, env, fs, path::PathBuf};

fn main() {
    let dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("cargo sets CARGO_MANIFEST_DIR"))
        .join("../engines");
    println!("cargo:rerun-if-changed={}", dir.display());

    let mut paths: Vec<PathBuf> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("cannot read {}: {e}", dir.display()))
        .map(|entry| entry.expect("readable engines entry").path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "toml"))
        .collect();
    paths.sort();

    let mut ids = HashSet::new();
    let engines: Vec<serde_json::Value> = paths
        .iter()
        .map(|path| {
            let text = fs::read_to_string(path)
                .unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()));
            let engine: serde_json::Value = toml::from_str(&text)
                .unwrap_or_else(|e| panic!("invalid TOML in {}: {e}", path.display()));
            let id = engine
                .get("id")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_else(|| panic!("{} has no string `id`", path.display()));
            assert!(
                ids.insert(id.to_owned()),
                "duplicate engine id {id:?} in {}",
                path.display()
            );
            engine
        })
        .collect();

    let out = PathBuf::from(env::var("OUT_DIR").expect("cargo sets OUT_DIR")).join("engines.json");
    let json = serde_json::to_string(&engines).expect("engines serialize to JSON");
    fs::write(&out, json).unwrap_or_else(|e| panic!("cannot write {}: {e}", out.display()));
}
