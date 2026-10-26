use std::path::Path;

use midiremap_testkit::layers::{Layers, Table};

const ALLOWED_USES: &Table = &[
    ("content", &["converter_step"]),
    ("converter_step", &[]),
    ("fixtures", &["i18n", "pages"]),
    ("ftl_vars", &[]),
    ("i18n", &["content", "ftl_vars"]),
    ("llms", &["i18n", "pages", "render", "routes"]),
    ("manifest", &[]),
    ("pages", &["routes"]),
    ("parity", &["content", "fixtures", "i18n"]),
    (
        "render",
        &[
            "content",
            "converter_step",
            "i18n",
            "manifest",
            "pages",
            "routes",
        ],
    ),
    ("routes", &["i18n"]),
    ("shell", &["content", "i18n", "pages", "routes"]),
    ("sitemap", &["i18n", "pages", "routes"]),
];

#[test]
fn modules_use_each_other_only_along_the_table() {
    let breaches =
        Layers::read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("src")).check(ALLOWED_USES);
    let found: Vec<String> = breaches.iter().map(ToString::to_string).collect();
    assert!(found.is_empty(), "{found:#?}");
}
