#[path = "src/ftl_vars.rs"]
mod ftl_vars;

use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs,
    path::{Path, PathBuf},
};

use heck::{ToShoutySnakeCase, ToSnakeCase, ToUpperCamelCase};
use serde::Deserialize;

#[derive(Copy, Clone, Debug)]
enum FtlFile {
    App,
    Site,
}

impl FtlFile {
    const ALL: [Self; 2] = [Self::App, Self::Site];

    fn variant(self) -> String {
        format!("{self:?}")
    }

    fn stem(self) -> String {
        self.variant().to_snake_case()
    }
}

struct Message<'a> {
    id: &'a str,
    vars: Vec<&'a str>,
    file: FtlFile,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocaleEntry {
    code: String,
    prefix: String,
    lang_tag: String,
    native_name: String,
    reviewed: bool,
}

#[derive(Deserialize)]
struct Section {
    key: String,
    slug: String,
    closing: String,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum Target {
    Route { route: String },
    Section { section: String },
}

#[derive(Deserialize)]
struct Tip {
    other: String,
}

#[derive(Deserialize)]
struct Structure {
    routes: BTreeMap<String, String>,
    sections: Vec<Section>,
    nav: Vec<Target>,
    footer: Vec<Target>,
    popular: Vec<(String, String)>,
}

impl Structure {
    fn target(&self, t: &Target) -> String {
        match t {
            Target::Route { route } if self.routes.contains_key(route) => {
                format!("NavTarget::{}", route.to_upper_camel_case())
            }
            Target::Route { route } => panic!("structure.json: unknown route '{route}'"),
            Target::Section { section } if self.sections.iter().any(|s| &s.key == section) => {
                format!(
                    "NavTarget::Section(SectionKey::{})",
                    section.to_upper_camel_case()
                )
            }
            Target::Section { section } => panic!("structure.json: unknown section '{section}'"),
        }
    }
}

/// What the site's code is generated from: the locales, the site's structure, the tip link
/// and English's message files.
struct Inputs {
    locales: Vec<LocaleEntry>,
    structure: Structure,
    tip: Tip,
    english: Vec<(FtlFile, String)>,
}

impl Inputs {
    fn read(root: &Path) -> Self {
        let json = |rel: &str| read(&root.join(rel));
        let locales: Vec<LocaleEntry> =
            serde_json::from_str(&json("locales/locales.json")).unwrap();
        assert!(
            locales.iter().any(|l| l.code == "en" && l.reviewed),
            "locales.json: en must be reviewed, since x-default points at it"
        );
        for l in &locales {
            for file in FtlFile::ALL {
                json(&format!("locales/{}/{}.ftl", l.code, file.stem()));
            }
            json(&format!("locales/{}/docs.json", l.code));
        }
        Self {
            structure: serde_json::from_str(&json("content/structure.json")).unwrap(),
            tip: serde_json::from_str(&json("content/tip.json")).unwrap(),
            english: FtlFile::ALL
                .into_iter()
                .map(|file| (file, json(&format!("locales/en/{}.ftl", file.stem()))))
                .collect(),
            locales,
        }
    }

    /// English's messages, in file order, each defined once.
    fn messages(&self) -> Vec<Message<'_>> {
        let messages: Vec<Message> = self
            .english
            .iter()
            .flat_map(|&(file, ref ftl)| {
                ftl_vars::message_vars(ftl)
                    .unwrap_or_else(|e| panic!("en/{}.ftl: {e:?}", file.stem()))
                    .into_iter()
                    .map(move |(id, vars)| Message {
                        id,
                        vars: vars.into_iter().collect(),
                        file,
                    })
            })
            .collect();
        let mut ids = BTreeSet::new();
        for m in &messages {
            assert!(ids.insert(m.id), "locales/en: '{}' is defined twice", m.id);
        }
        messages
    }
}

fn read(path: &Path) -> String {
    println!("cargo::rerun-if-changed={}", path.display());
    fs::read_to_string(path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

fn list(items: impl IntoIterator<Item = String>) -> String {
    items.into_iter().collect::<Vec<_>>().join(", ")
}

fn matcher<T>(name: &str, ret: &str, items: &[T], arm: impl Fn(&T) -> (String, String)) -> String {
    let arms = list(items.iter().map(|x| {
        let (variant, value) = arm(x);
        format!("Self::{variant} => {value}")
    }));
    format!("    pub fn {name}(self) -> {ret} {{ match self {{ {arms} }} }}\n")
}

/// A `Copy` enum of `variants` with `ALL`, every variant in order, and `methods`.
fn enum_type(name: &str, variants: &[String], methods: &[String]) -> String {
    let all = list(variants.iter().map(|v| format!("Self::{v}")));
    format!(
        "#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]\npub enum {name} {{ {} }}\nimpl {name} {{\n    pub const ALL: &'static [Self] = &[{all}];\n{}}}\n",
        variants.join(", "),
        methods.concat()
    )
}

fn source(rel: &str) -> String {
    format!("include_str!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/../{rel}\"))")
}

fn table(name: &str, generics: &str, key: &str, value: &str, keys: &[(String, String)]) -> String {
    let fields = list(keys.iter().map(|(f, _)| format!("{f}: {value}")));
    let build = list(keys.iter().map(|(f, v)| format!("{f}: f({key}::{v})?")));
    let arms = list(keys.iter().map(|(f, v)| format!("{key}::{v} => &self.{f}")));
    format!(
        "struct {name}{generics} {{ {fields} }}\nimpl{generics} {name}{generics} {{\n    fn try_new(mut f: impl FnMut({key}) -> Result<{value}, I18nError>) -> Result<Self, I18nError> {{ Ok(Self {{ {build} }}) }}\n    fn get(&self, key: {key}) -> &{value} {{ match key {{ {arms} }} }}\n}}\n"
    )
}

fn locale_code(locales: &[LocaleEntry]) -> String {
    let variants: Vec<String> = locales
        .iter()
        .map(|l| l.code.to_upper_camel_case())
        .collect();
    let field = |f: fn(&LocaleEntry) -> &str| {
        move |l: &LocaleEntry| (l.code.to_upper_camel_case(), format!("{:?}", f(l)))
    };
    let ftl_arms = list(locales.iter().flat_map(|l| {
        FtlFile::ALL.map(|file| {
            format!(
                "(Self::{}, FtlFile::{}) => {}",
                l.code.to_upper_camel_case(),
                file.variant(),
                source(&format!("locales/{}/{}.ftl", l.code, file.stem()))
            )
        })
    }));
    let methods = [
        matcher("code", "&'static str", locales, field(|l| &l.code)),
        matcher("prefix", "&'static str", locales, field(|l| &l.prefix)),
        matcher("lang_tag", "&'static str", locales, field(|l| &l.lang_tag)),
        matcher("native_name", "&'static str", locales, field(|l| &l.native_name)),
        matcher("reviewed", "bool", locales, |l| {
            (l.code.to_upper_camel_case(), l.reviewed.to_string())
        }),
        format!("    pub fn ftl(self, file: FtlFile) -> &'static str {{ match (self, file) {{ {ftl_arms} }} }}\n"),
        matcher("docs", "&'static str", locales, |l| {
            (
                l.code.to_upper_camel_case(),
                source(&format!("locales/{}/docs.json", l.code)),
            )
        }),
    ];
    let keys: Vec<(String, String)> = locales
        .iter()
        .map(|l| (l.code.to_snake_case(), l.code.to_upper_camel_case()))
        .collect();
    enum_type("Locale", &variants, &methods) + &table("PerLocale", "<T>", "Locale", "T", &keys)
}

fn section_code(sections: &[Section], plain: &[&str]) -> String {
    let variants: Vec<String> = sections
        .iter()
        .map(|s| s.key.to_upper_camel_case())
        .collect();
    let text = |f: fn(&Section) -> &str| {
        move |s: &Section| (s.key.to_upper_camel_case(), format!("{:?}", f(s)))
    };
    let mut methods = vec![
        matcher("key", "&'static str", sections, text(|s| &s.key)),
        matcher("slug", "&'static str", sections, text(|s| &s.slug)),
        matcher("closing", "Closing", sections, |s| {
            (
                s.key.to_upper_camel_case(),
                format!("Closing::{}", s.closing.to_upper_camel_case()),
            )
        }),
    ];
    for part in ["label", "heading", "title", "description"] {
        methods.push(matcher(part, "Plain", sections, |s| {
            let id = format!("section-{}-{part}", s.key);
            assert!(
                plain.contains(&id.as_str()),
                "locales/en: '{id}' must have no variables"
            );
            (
                s.key.to_upper_camel_case(),
                format!("Plain::{}", id.to_upper_camel_case()),
            )
        }));
    }
    enum_type("SectionKey", &variants, &methods)
}

fn plain_texts(plain: &[&str]) -> String {
    let variants: Vec<String> = plain.iter().map(|id| id.to_upper_camel_case()).collect();
    let id = matcher("id", "&'static str", plain, |id| {
        (id.to_upper_camel_case(), format!("{id:?}"))
    });
    let keys: Vec<(String, String)> = plain
        .iter()
        .map(|id| (id.to_snake_case(), id.to_upper_camel_case()))
        .collect();
    enum_type("Plain", &variants, &[id]) + &table("PlainTexts", "", "Plain", "String", &keys)
}

fn ftl_files() -> String {
    let variants: Vec<String> = FtlFile::ALL.iter().map(|f| f.variant()).collect();
    let stem = matcher("stem", "&'static str", &FtlFile::ALL, |f| {
        (f.variant(), format!("{:?}", f.stem()))
    });
    format!(
        "/// One of a locale's message files; each message lives in the file English gives it.\n{}impl ::std::fmt::Display for FtlFile {{\n    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {{\n        write!(f, \"{{}}.ftl\", self.stem())\n    }}\n}}\n",
        enum_type("FtlFile", &variants, &[stem])
    )
}

/// One constructor per message with variables, taking each variable, in name order, under its
/// snake-case name; the site uses some of them, the app's messages among them none.
fn phrases(messages: &[Message]) -> String {
    let constructors: String = messages
        .iter()
        .filter(|m| !m.vars.is_empty())
        .map(|m| {
            let params = list(
                m.vars
                    .iter()
                    .map(|v| format!("{}: impl Into<Arg<'a>>", v.to_snake_case())),
            );
            let args = list(
                m.vars
                    .iter()
                    .map(|v| format!("({v:?}, {}.into())", v.to_snake_case())),
            );
            format!(
                "    pub fn {}({params}) -> Self {{ Self::new(MessageId::{}, [{args}]) }}\n",
                m.id.to_snake_case(),
                m.id.to_upper_camel_case()
            )
        })
        .collect();
    format!("#[allow(dead_code)]\nimpl<'a> Phrase<'a> {{\n{constructors}}}\n")
}

fn message_code(messages: &[Message], plain: &[&str]) -> String {
    let variants: Vec<String> = messages
        .iter()
        .map(|m| m.id.to_upper_camel_case())
        .collect();
    let methods = [
        matcher("id", "&'static str", messages, |m| {
            (m.id.to_upper_camel_case(), format!("{:?}", m.id))
        }),
        matcher("vars", "&'static [&'static str]", messages, |m| {
            (m.id.to_upper_camel_case(), format!("&{:?}", m.vars))
        }),
        matcher("file", "FtlFile", messages, |m| {
            (
                m.id.to_upper_camel_case(),
                format!("FtlFile::{}", m.file.variant()),
            )
        }),
    ];
    enum_type("MessageId", &variants, &methods)
        + &ftl_files()
        + &plain_texts(plain)
        + &phrases(messages)
}

fn routes_code(structure: &Structure) -> String {
    let paths: String = structure
        .routes
        .iter()
        .map(|(route, path)| {
            format!(
                "pub const {}: SitePath = SitePath::fixed({path:?});\n",
                route.to_shouty_snake_case()
            )
        })
        .collect();
    let targets = list(
        structure
            .routes
            .keys()
            .map(|route| route.to_upper_camel_case())
            .chain(["Section(SectionKey)".to_owned()]),
    );
    let nav = |name: &str, targets: &[Target]| {
        format!(
            "pub const {name}: &[NavTarget] = &[{}];\n",
            list(targets.iter().map(|t| structure.target(t)))
        )
    };
    let popular = list(
        structure
            .popular
            .iter()
            .map(|(src, tgt)| format!("({src:?}, {tgt:?})")),
    );
    format!(
        "{paths}#[derive(Copy, Clone, Debug, PartialEq, Eq)]\npub enum NavTarget {{ {targets} }}\n{}{}pub const POPULAR: &[(&str, &str)] = &[{popular}];\n",
        nav("NAV", &structure.nav),
        nav("FOOTER", &structure.footer)
    )
}

fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("..");
    let inputs = Inputs::read(&root);
    let messages = inputs.messages();
    let plain: Vec<&str> = messages
        .iter()
        .filter(|m| m.vars.is_empty())
        .map(|m| m.id)
        .collect();
    let i18n = [
        locale_code(&inputs.locales),
        section_code(&inputs.structure.sections, &plain),
        format!("pub const TIP_HREF: &str = {:?};\n", inputs.tip.other),
        message_code(&messages, &plain),
    ]
    .concat();
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("i18n.rs"), i18n).unwrap();
    fs::write(out_dir.join("routes.rs"), routes_code(&inputs.structure)).unwrap();
}
