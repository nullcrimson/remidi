use std::path::Path;

use midiremap_layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("canon", &[]),
    ("convert", &["canon", "inspect", "mapping", "midi", "parts"]),
    ("engine", &["canon", "non_blank", "spread"]),
    (
        "files",
        &["canon", "engine", "mapping", "midi", "non_blank", "xml"],
    ),
    ("inspect", &["canon", "engine", "midi", "parts"]),
    ("mapping", &["canon", "engine", "spread"]),
    ("midi", &[]),
    ("non_blank", &[]),
    ("parts", &["midi"]),
    ("proofs", &["canon", "engine", "mapping", "spread"]),
    ("spread", &["canon"]),
    ("xml", &[]),
];

#[test]
fn modules_use_each_other_only_along_the_table() {
    let breaches =
        Layers::read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("src")).check(ALLOWED_USES);
    let found: Vec<String> = breaches.iter().map(ToString::to_string).collect();
    assert!(found.is_empty(), "{found:#?}");
}
