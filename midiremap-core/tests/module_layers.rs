use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

const ALLOWED_USES: [(&str, &[&str]); 24] = [
    (
        "ableton",
        &[
            "engine_map",
            "file",
            "non_blank",
            "note",
            "packing",
            "table",
            "translate",
        ],
    ),
    ("canon", &["family", "idx"]),
    ("catalog", &["engine_map"]),
    ("channel", &["idx", "midi"]),
    (
        "conversion",
        &["channel", "midi", "report", "rewrite", "table", "translate"],
    ),
    ("daw_map", &["ableton", "engine_map", "note", "packing"]),
    (
        "engine_map",
        &["canon", "family", "non_blank", "note", "resolution"],
    ),
    ("family", &[]),
    ("file", &[]),
    ("fit", &["catalog", "channel", "engine_map", "midi", "note"]),
    ("idx", &[]),
    ("midi", &[]),
    ("non_blank", &[]),
    ("note", &[]),
    ("overrides", &["canon", "note"]),
    ("packing", &[]),
    (
        "plan",
        &[
            "canon",
            "engine_map",
            "note",
            "overrides",
            "resolution",
            "translate",
        ],
    ),
    ("preset", &["canon", "non_blank", "note", "overrides"]),
    ("report", &["canon", "note", "resolution", "translate"]),
    ("resolution", &["canon", "note"]),
    ("rewrite", &["channel", "midi", "note", "report", "table"]),
    ("sample", &["canon", "channel", "engine_map", "idx", "midi"]),
    ("table", &["canon", "note", "resolution", "translate"]),
    (
        "translate",
        &["canon", "engine_map", "note", "overrides", "resolution"],
    ),
];

fn allowed() -> BTreeMap<&'static str, BTreeSet<&'static str>> {
    ALLOWED_USES
        .iter()
        .map(|(module, uses)| (*module, uses.iter().copied().collect()))
        .collect()
}

struct Source {
    module: String,
    in_folder: bool,
    code: String,
}

fn source_files(dir: &Path, found: &mut Vec<Source>, folder: Option<&str>) {
    for entry in fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        let stem = path.file_stem().unwrap().to_str().unwrap().to_owned();
        let module = folder.map_or(stem, str::to_owned);
        if path.is_dir() {
            source_files(&path, found, Some(&module));
        } else if module != "lib" {
            found.push(Source {
                module,
                in_folder: folder.is_some(),
                code: shipped(&fs::read_to_string(&path).unwrap()),
            });
        }
    }
}

fn sources() -> Vec<Source> {
    let mut found = Vec::new();
    source_files(
        &Path::new(env!("CARGO_MANIFEST_DIR")).join("src"),
        &mut found,
        None,
    );
    found
}

fn shipped(text: &str) -> String {
    let end = text
        .match_indices("#[cfg(test)]")
        .find(|(at, tag)| text[at + tag.len()..].trim_start().starts_with("mod "))
        .map_or(text.len(), |(at, _)| at);
    text[..end]
        .lines()
        .filter(|line| !line.trim_start().starts_with("//"))
        .collect::<Vec<_>>()
        .join("\n")
}

fn leading_name(text: &str) -> &str {
    let text = text.trim_start();
    let end = text
        .find(|c: char| !c.is_alphanumeric() && c != '_')
        .unwrap_or(text.len());
    &text[..end]
}

fn group_names(group: &str) -> Vec<&str> {
    let mut names = Vec::new();
    let mut depth = 0_usize;
    let mut start = 1;
    for (at, c) in group.char_indices() {
        match c {
            '{' => depth += 1,
            '}' if depth == 1 => {
                names.push(leading_name(&group[start..at]));
                break;
            }
            '}' => depth -= 1,
            ',' if depth == 1 => {
                names.push(leading_name(&group[start..at]));
                start = at + 1;
            }
            _ => {}
        }
    }
    names.retain(|name| !name.is_empty());
    names
}

fn names_after_crate(code: &str) -> BTreeSet<&str> {
    code.match_indices("crate::")
        .flat_map(|(at, path)| {
            let rest = &code[at + path.len()..];
            if rest.starts_with('{') {
                group_names(rest)
            } else {
                vec![leading_name(rest)]
            }
        })
        .collect()
}

fn crate_paths() -> BTreeMap<String, BTreeSet<String>> {
    let mut paths: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for source in sources() {
        let names = names_after_crate(&source.code)
            .into_iter()
            .filter(|name| *name != source.module)
            .map(str::to_owned)
            .collect::<Vec<_>>();
        paths.entry(source.module).or_default().extend(names);
    }
    paths
}

fn uses() -> BTreeMap<String, BTreeSet<String>> {
    let paths = crate_paths();
    let modules: BTreeSet<String> = paths.keys().cloned().collect();
    paths
        .into_iter()
        .map(|(module, names)| (module, &names & &modules))
        .collect()
}

fn reaches(table: &BTreeMap<&str, BTreeSet<&str>>, from: &str, to: &str) -> bool {
    let mut seen = BTreeSet::new();
    let mut next = vec![from];
    while let Some(module) = next.pop() {
        for used in table.get(module).into_iter().flatten() {
            if *used == to {
                return true;
            }
            if seen.insert(*used) {
                next.push(used);
            }
        }
    }
    false
}

#[test]
fn no_module_reaches_another_through_the_crate_root() {
    let paths = crate_paths();
    let through_root: Vec<String> = paths
        .iter()
        .flat_map(|(module, names)| {
            names
                .iter()
                .filter(|name| !paths.contains_key(*name))
                .map(move |name| format!("{module} -> crate::{name}"))
        })
        .collect();
    assert!(
        through_root.is_empty(),
        "name the module, so the table sees the use: {through_root:?}"
    );
}

#[test]
fn no_module_file_reaches_a_sibling_through_super() {
    let through_super: Vec<String> = sources()
        .into_iter()
        .filter(|source| !source.in_folder && source.code.contains("super::"))
        .map(|source| source.module)
        .collect();
    assert!(
        through_super.is_empty(),
        "write `crate::`, so the table sees the use: {through_super:?}"
    );
}

#[test]
fn every_module_is_in_the_table_of_allowed_uses() {
    let table = allowed();
    let unlisted: Vec<String> = uses()
        .into_keys()
        .filter(|module| !table.contains_key(module.as_str()))
        .collect();
    assert!(
        unlisted.is_empty(),
        "add these modules to ALLOWED_USES: {unlisted:?}"
    );
}

#[test]
fn no_module_reaches_itself_along_the_table() {
    let table = allowed();
    let circular: Vec<&str> = table
        .keys()
        .copied()
        .filter(|module| reaches(&table, module, module))
        .collect();
    assert!(
        circular.is_empty(),
        "these modules use themselves through others: {circular:?}"
    );
}

#[test]
fn the_table_allows_no_use_that_no_module_makes() {
    let found = uses();
    let unused: Vec<String> = allowed()
        .into_iter()
        .flat_map(|(module, names)| {
            let used = found.get(module).cloned().unwrap_or_default();
            names
                .into_iter()
                .filter(move |name| !used.contains(*name))
                .map(move |name| format!("{module} -> {name}"))
        })
        .collect();
    assert!(
        unused.is_empty(),
        "take these uses out of ALLOWED_USES: {unused:?}"
    );
}

#[test]
fn modules_use_each_other_only_along_the_table() {
    let table = allowed();
    let outside: Vec<String> = uses()
        .into_iter()
        .flat_map(|(module, used)| {
            let allowed = table.get(module.as_str()).cloned().unwrap_or_default();
            used.into_iter()
                .filter(move |name| !allowed.contains(name.as_str()))
                .map(move |name| format!("{module} -> {name}"))
        })
        .collect();
    assert!(outside.is_empty(), "uses outside ALLOWED_USES: {outside:?}");
}
