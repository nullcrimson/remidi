use std::path::Path;

use midiremap_layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("canon", &["family", "idx"]),
    ("catalog", &["engine_map"]),
    ("channel", &["idx", "note"]),
    (
        "conversion",
        &["channel", "midi", "report", "rewrite", "translate"],
    ),
    (
        "daw",
        &[
            "channel",
            "engine_map",
            "note",
            "preset",
            "translate",
            "xml",
        ],
    ),
    ("engine_map", &["canon", "non_blank", "note", "resolution"]),
    ("family", &[]),
    ("fit", &["catalog", "channel", "engine_map", "midi", "note"]),
    ("idx", &[]),
    ("midi", &[]),
    ("non_blank", &[]),
    ("note", &[]),
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
    ("report", &["canon", "note", "resolution"]),
    ("resolution", &["canon", "note"]),
    (
        "rewrite",
        &["channel", "midi", "note", "report", "translate"],
    ),
    (
        "sample",
        &["canon", "channel", "engine_map", "midi", "resolution"],
    ),
    (
        "translate",
        &["canon", "engine_map", "note", "overrides", "resolution"],
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
