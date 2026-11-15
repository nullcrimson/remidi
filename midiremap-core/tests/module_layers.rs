use std::path::Path;

use midiremap_layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("canon", &["idx"]),
    ("catalog", &["engine_map"]),
    ("channel", &["midi", "note"]),
    (
        "conversion",
        &["channel", "fit", "midi", "report", "rewrite", "translate"],
    ),
    (
        "daw",
        &[
            "canon",
            "engine_map",
            "midi",
            "note",
            "preset",
            "translate",
            "xml",
        ],
    ),
    (
        "engine_map",
        &[
            "canon",
            "non_blank",
            "note",
            "open_levels",
            "resolution",
            "spread",
        ],
    ),
    (
        "fit",
        &["canon", "catalog", "channel", "engine_map", "midi", "note"],
    ),
    ("idx", &[]),
    ("midi", &["idx", "note"]),
    ("non_blank", &[]),
    ("note", &[]),
    ("open_levels", &["canon"]),
    ("overrides", &["canon", "note"]),
    ("plan", &["canon", "note", "resolution", "translate"]),
    (
        "preset",
        &[
            "canon",
            "catalog",
            "engine_map",
            "non_blank",
            "note",
            "overrides",
        ],
    ),
    (
        "proofs",
        &[
            "canon",
            "catalog",
            "engine_map",
            "note",
            "open_levels",
            "overrides",
            "resolution",
            "spread",
            "translate",
        ],
    ),
    ("report", &["canon", "note", "resolution"]),
    ("resolution", &["canon", "note", "spread"]),
    (
        "rewrite",
        &["channel", "midi", "note", "report", "translate"],
    ),
    ("sample", &["canon", "engine_map", "midi", "resolution"]),
    ("spread", &["canon"]),
    (
        "translate",
        &[
            "canon",
            "engine_map",
            "note",
            "overrides",
            "resolution",
            "spread",
        ],
    ),
    ("xml", &[]),
];

#[test]
fn modules_use_each_other_only_along_the_table() {
    let breaches =
        Layers::read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("src")).check(ALLOWED_USES);
    let found: Vec<String> = breaches.iter().map(ToString::to_string).collect();
    assert!(found.is_empty(), "{found:#?}");
}
