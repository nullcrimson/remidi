use std::path::Path;

use midiremap_layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("canon", &["idx"]),
    (
        "convert",
        &["canon", "inspect", "mapping", "midi", "note", "parts"],
    ),
    ("engine", &["canon", "non_blank", "note", "spread"]),
    (
        "files",
        &[
            "canon",
            "engine",
            "mapping",
            "midi",
            "non_blank",
            "note",
            "xml",
        ],
    ),
    ("idx", &[]),
    ("inspect", &["canon", "engine", "midi", "note", "parts"]),
    ("mapping", &["canon", "engine", "note", "spread"]),
    ("midi", &["idx", "note"]),
    ("non_blank", &[]),
    ("note", &[]),
    ("parts", &["midi", "note"]),
    ("proofs", &["canon", "engine", "mapping", "note", "spread"]),
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
