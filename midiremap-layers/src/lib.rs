//! Which modules of a crate use which, read from its source, for a test that holds the crate
//! to a table of allowed uses.

use std::{
    collections::{BTreeMap, BTreeSet},
    fmt, fs,
    path::Path,
};

use proc_macro2::{TokenStream, TokenTree};
use syn::{
    visit::{self, Visit},
    Attribute, Item, ItemUse, Macro, Meta, UseTree,
};
use walkdir::WalkDir;

/// The modules each module may use.
pub type Table = [(&'static str, &'static [&'static str])];

/// One way a crate leaves its table of allowed uses.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Breach {
    /// `module` reaches `name` through `crate::` although `name` is no module.
    ThroughRoot { module: String, name: String },
    /// A module file outside a folder reaches a sibling through `super::`.
    ThroughSuper { module: String },
    /// A module the table has no row for.
    Unlisted { module: String },
    /// A row of the table for a module the crate does not have.
    NoModule { module: String },
    /// A module the table lets reach itself through others.
    Circular { module: String },
    /// A use the table does not allow.
    Outside { module: String, name: String },
}

impl fmt::Display for Breach {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ThroughRoot { module, name } => write!(
                f,
                "{module} -> crate::{name}: name the module, so the table sees the use"
            ),
            Self::ThroughSuper { module } => write!(
                f,
                "{module} writes super::; write crate::, so the table sees the use"
            ),
            Self::Unlisted { module } => write!(f, "{module} has no row in the table"),
            Self::NoModule { module } => {
                write!(f, "the table has a row for {module}, which is no module")
            }
            Self::Circular { module } => write!(f, "{module} uses itself through others"),
            Self::Outside { module, name } => write!(f, "{module} -> {name} is outside the table"),
        }
    }
}

/// What each module of a crate names after `crate::`, and whether it writes `super::`.
#[derive(Default)]
pub struct Layers {
    modules: BTreeMap<String, Module>,
}

#[derive(Default)]
struct Module {
    names: BTreeSet<String>,
    through_super: bool,
}

impl Layers {
    /// Reads every module under `src`: a file, or a folder taken as one module. The crate
    /// roots `lib.rs` and `main.rs` are left out, and so is every `#[cfg(test)]` item.
    pub fn read(src: &Path) -> Self {
        WalkDir::new(src)
            .min_depth(1)
            .into_iter()
            .map(|entry| entry.expect("a source entry is readable").into_path())
            .filter(|path| path.extension().is_some_and(|e| e == "rs"))
            .filter_map(|path| Some((module_of(src, &path)?, path)))
            .fold(
                Self::default(),
                |mut layers, ((module, in_folder), path)| {
                    let code = fs::read_to_string(path).expect("a source file is readable");
                    layers.add(&module, in_folder, &code);
                    layers
                },
            )
    }

    /// Adds the code of one file of `module`; a file in the module's own folder may write
    /// `super::`.
    pub fn add(&mut self, module: &str, in_folder: bool, code: &str) {
        let file = syn::parse_file(code).expect("a source file parses");
        let mut paths = Paths::default();
        paths.visit_file(&file);
        let entry = self.modules.entry(module.to_owned()).or_default();
        paths.after_crate.remove(module);
        entry.names.extend(paths.after_crate);
        entry.through_super |= paths.through_super && !in_folder;
    }

    /// Every way the crate leaves `table`, in order.
    pub fn check(&self, table: &Table) -> Vec<Breach> {
        let allowed: BTreeMap<&str, BTreeSet<&str>> = table
            .iter()
            .map(|&(module, uses)| (module, uses.iter().copied().collect()))
            .collect();
        let mut breaches: Vec<Breach> = self
            .modules
            .iter()
            .flat_map(|(module, found)| self.module_breaches(module, found, &allowed))
            .chain(
                allowed
                    .keys()
                    .filter(|module| !self.modules.contains_key(**module))
                    .map(|module| Breach::NoModule {
                        module: (*module).to_owned(),
                    }),
            )
            .chain(
                allowed
                    .keys()
                    .filter(|module| reaches(&allowed, module, module))
                    .map(|module| Breach::Circular {
                        module: (*module).to_owned(),
                    }),
            )
            .collect();
        breaches.sort();
        breaches
    }

    fn module_breaches(
        &self,
        module: &str,
        found: &Module,
        allowed: &BTreeMap<&str, BTreeSet<&str>>,
    ) -> Vec<Breach> {
        let owned = |name: &str| (module.to_owned(), name.to_owned());
        let uses: BTreeSet<&str> = found
            .names
            .iter()
            .map(String::as_str)
            .filter(|name| self.modules.contains_key(*name))
            .collect();
        let row = allowed.get(module);
        let through_root = found
            .names
            .iter()
            .filter(|name| !self.modules.contains_key(*name))
            .map(|name| {
                let (module, name) = owned(name);
                Breach::ThroughRoot { module, name }
            });
        let through_super = found.through_super.then(|| Breach::ThroughSuper {
            module: module.to_owned(),
        });
        let unlisted = row.is_none().then(|| Breach::Unlisted {
            module: module.to_owned(),
        });
        let outside = uses
            .iter()
            .filter(|name| row.is_some_and(|row| !row.contains(*name)))
            .map(|name| {
                let (module, name) = owned(name);
                Breach::Outside { module, name }
            });
        through_root
            .chain(through_super)
            .chain(unlisted)
            .chain(outside)
            .collect()
    }
}

const ROOTS: [&str; 2] = ["lib", "main"];

/// The module the source file `file` under `src` belongs to, and whether the file is in the
/// module's own folder; `None` for a crate root.
fn module_of(src: &Path, file: &Path) -> Option<(String, bool)> {
    let mut steps = file
        .strip_prefix(src)
        .expect("a source file is under its source folder")
        .iter();
    let module = Path::new(steps.next()?)
        .file_stem()?
        .to_str()
        .expect("a source name is UTF-8");
    let in_folder = steps.next().is_some();
    (in_folder || !ROOTS.contains(&module)).then(|| (module.to_owned(), in_folder))
}

fn reaches(table: &BTreeMap<&str, BTreeSet<&str>>, from: &str, to: &str) -> bool {
    let mut seen = BTreeSet::new();
    let mut next = vec![from];
    while let Some(module) = next.pop() {
        for &used in table.get(module).into_iter().flatten() {
            if used == to {
                return true;
            }
            if seen.insert(used) {
                next.push(used);
            }
        }
    }
    false
}

#[derive(Default)]
struct Paths {
    after_crate: BTreeSet<String>,
    through_super: bool,
}

impl Paths {
    fn use_tree(&mut self, tree: &UseTree) {
        match tree {
            UseTree::Path(p) if p.ident == "crate" => self.after_crate.extend(first_names(&p.tree)),
            UseTree::Path(p) if p.ident == "super" => self.through_super = true,
            UseTree::Group(g) => g.items.iter().for_each(|t| self.use_tree(t)),
            _ => {}
        }
    }

    fn tokens(&mut self, stream: TokenStream) {
        let trees: Vec<TokenTree> = stream.into_iter().collect();
        for (at, tree) in trees.iter().enumerate() {
            match tree {
                TokenTree::Group(group) => self.tokens(group.stream()),
                TokenTree::Ident(head) => {
                    if let [TokenTree::Punct(a), TokenTree::Punct(b), TokenTree::Ident(name), ..] =
                        &trees[at + 1..]
                    {
                        if a.as_char() == ':' && b.as_char() == ':' {
                            if head == "crate" {
                                self.after_crate.insert(name.to_string());
                            } else if head == "super" {
                                self.through_super = true;
                            }
                        }
                    }
                }
                TokenTree::Punct(_) | TokenTree::Literal(_) => {}
            }
        }
    }
}

impl<'ast> Visit<'ast> for Paths {
    fn visit_item(&mut self, item: &'ast Item) {
        if !attrs(item).iter().any(is_cfg_test) {
            visit::visit_item(self, item);
        }
    }

    fn visit_item_use(&mut self, item: &'ast ItemUse) {
        self.use_tree(&item.tree);
    }

    fn visit_path(&mut self, path: &'ast syn::Path) {
        let mut segments = path.segments.iter();
        match segments.next() {
            Some(first) if first.ident == "crate" => {
                if let Some(name) = segments.next() {
                    self.after_crate.insert(name.ident.to_string());
                }
            }
            Some(first) if first.ident == "super" => self.through_super = true,
            _ => {}
        }
        visit::visit_path(self, path);
    }

    fn visit_macro(&mut self, mac: &'ast Macro) {
        visit::visit_macro(self, mac);
        self.tokens(mac.tokens.clone());
    }
}

fn first_names(tree: &UseTree) -> Vec<String> {
    match tree {
        UseTree::Path(p) => vec![p.ident.to_string()],
        UseTree::Name(n) => vec![n.ident.to_string()],
        UseTree::Rename(r) => vec![r.ident.to_string()],
        UseTree::Glob(_) => vec!["*".to_owned()],
        UseTree::Group(g) => g.items.iter().flat_map(first_names).collect(),
    }
}

fn attrs(item: &Item) -> &[Attribute] {
    match item {
        Item::Const(i) => &i.attrs,
        Item::Enum(i) => &i.attrs,
        Item::ExternCrate(i) => &i.attrs,
        Item::Fn(i) => &i.attrs,
        Item::ForeignMod(i) => &i.attrs,
        Item::Impl(i) => &i.attrs,
        Item::Macro(i) => &i.attrs,
        Item::Mod(i) => &i.attrs,
        Item::Static(i) => &i.attrs,
        Item::Struct(i) => &i.attrs,
        Item::Trait(i) => &i.attrs,
        Item::TraitAlias(i) => &i.attrs,
        Item::Type(i) => &i.attrs,
        Item::Union(i) => &i.attrs,
        Item::Use(i) => &i.attrs,
        _ => &[],
    }
}

fn is_cfg_test(attr: &Attribute) -> bool {
    attr.path().is_ident("cfg")
        && matches!(&attr.meta, Meta::List(list) if list.tokens.to_string() == "test")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn layers(files: &[(&str, bool, &str)]) -> Layers {
        let mut layers = Layers::default();
        for &(module, in_folder, code) in files {
            layers.add(module, in_folder, code);
        }
        layers
    }

    fn breach(module: &str, name: &str) -> (String, String) {
        (module.to_owned(), name.to_owned())
    }

    fn module_of_file(file: &str) -> Option<(String, bool)> {
        module_of(Path::new("src"), &Path::new("src").join(file))
    }

    #[test]
    fn a_file_is_its_own_module() {
        assert_eq!(module_of_file("note.rs"), Some(("note".to_owned(), false)));
    }

    #[test]
    fn a_file_in_a_folder_belongs_to_the_folder() {
        assert_eq!(
            module_of_file("daw/formats/cubase.rs"),
            Some(("daw".to_owned(), true))
        );
    }

    #[test]
    fn a_crate_root_is_no_module() {
        assert_eq!(module_of_file("lib.rs"), None);
    }

    #[test]
    fn a_crate_inside_its_table_has_no_breach() {
        let found = layers(&[("a", false, "use crate::b::X;"), ("b", false, "")]);
        assert_eq!(found.check(&[("a", &["b"]), ("b", &[])]), []);
    }

    /// The breaches of a module `a` with the code `code` that may use nothing, beside a
    /// module `b`.
    fn uses_of_b(code: &str) -> Vec<Breach> {
        layers(&[("a", false, code), ("b", false, "")]).check(&[("a", &[]), ("b", &[])])
    }

    fn outside_b() -> [Breach; 1] {
        let (module, name) = breach("a", "b");
        [Breach::Outside { module, name }]
    }

    #[test]
    fn a_use_in_a_group_is_seen() {
        assert_eq!(uses_of_b("use crate::{b::X};"), outside_b());
    }

    #[test]
    fn a_renamed_use_is_seen() {
        assert_eq!(uses_of_b("use crate::b as d;"), outside_b());
    }

    #[test]
    fn a_path_in_code_is_seen() {
        assert_eq!(uses_of_b("fn f() { crate::b::g(); }"), outside_b());
    }

    #[test]
    fn a_path_in_a_macro_is_seen() {
        assert_eq!(
            uses_of_b(r#"fn f() { println!("{}", crate::b::I); }"#),
            outside_b()
        );
    }

    #[test]
    fn a_string_naming_a_module_is_no_use() {
        assert_eq!(uses_of_b(r#"const S: &str = "crate::b";"#), []);
    }

    #[test]
    fn a_test_item_is_no_use() {
        assert_eq!(
            uses_of_b(
                "#[cfg(test)] mod tests { use crate::b; } #[cfg(test)] fn t() { crate::b::f(); }"
            ),
            []
        );
    }

    #[test]
    fn a_use_outside_the_table_is_a_breach() {
        let found = layers(&[("a", false, "use crate::b::X;"), ("b", false, "")]);
        let (module, name) = breach("a", "b");
        assert_eq!(
            found.check(&[("a", &[]), ("b", &[])]),
            [Breach::Outside { module, name }]
        );
    }

    #[test]
    fn reaching_an_item_through_the_crate_root_is_a_breach() {
        let found = layers(&[("a", false, "use crate::Thing;")]);
        let (module, name) = breach("a", "Thing");
        assert_eq!(
            found.check(&[("a", &[])]),
            [Breach::ThroughRoot { module, name }]
        );
    }

    #[test]
    fn super_is_a_breach_only_outside_a_folder() {
        let found = layers(&[("a", true, "use super::x;"), ("b", false, "use super::y;")]);
        assert_eq!(
            found.check(&[("a", &[]), ("b", &[])]),
            [Breach::ThroughSuper {
                module: "b".to_owned()
            }]
        );
    }

    #[test]
    fn a_module_without_a_row_is_a_breach() {
        let found = layers(&[("a", false, "")]);
        assert_eq!(
            found.check(&[]),
            [Breach::Unlisted {
                module: "a".to_owned()
            }]
        );
    }

    #[test]
    fn a_row_for_a_module_the_crate_lacks_is_a_breach() {
        let found = layers(&[("a", false, "")]);
        assert_eq!(
            found.check(&[("a", &[]), ("gone", &[])]),
            [Breach::NoModule {
                module: "gone".to_owned()
            }]
        );
    }

    #[test]
    fn a_cycle_in_the_table_is_a_breach_for_each_module_on_it() {
        let found = layers(&[
            ("a", false, "use crate::b::X;"),
            ("b", false, "use crate::a::Y;"),
        ]);
        assert_eq!(
            found.check(&[("a", &["b"]), ("b", &["a"])]),
            [
                Breach::Circular {
                    module: "a".to_owned()
                },
                Breach::Circular {
                    module: "b".to_owned()
                }
            ]
        );
    }
}
