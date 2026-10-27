use std::path::Path;

use midiremap_testkit::layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("content", &["converter_step"]),
    ("converter_step", &[]),
    ("fixtures", &["i18n", "pages"]),
    ("ftl_vars", &[]),
    ("i18n", &["content", "ftl_vars"]),
    ("llms", &["i18n", "meta", "pages", "routes", "texts"]),
    ("manifest", &[]),
    ("meta", &["i18n", "pages", "routes", "texts"]),
    ("pages", &["i18n", "routes"]),
    ("parity", &["content", "fixtures", "i18n"]),
    (
        "render",
        &[
            "content",
            "converter_step",
            "i18n",
            "manifest",
            "meta",
            "pages",
            "routes",
            "schema",
            "texts",
        ],
    ),
    ("routes", &["i18n"]),
    (
        "schema",
        &["content", "converter_step", "i18n", "routes", "texts"],
    ),
    ("shell", &["i18n", "pages", "routes", "schema", "texts"]),
    ("sitemap", &["i18n", "pages", "routes"]),
    ("texts", &["converter_step", "i18n", "routes"]),
];

#[test]
fn modules_use_each_other_only_along_the_table() {
    let breaches =
        Layers::read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("src")).check(ALLOWED_USES);
    let found: Vec<String> = breaches.iter().map(ToString::to_string).collect();
    assert!(found.is_empty(), "{found:#?}");
}
