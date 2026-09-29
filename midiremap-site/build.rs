#[path = "src/ftl_vars.rs"]
mod ftl_vars;

use std::{
    collections::BTreeSet,
    env, fs,
    path::{Path, PathBuf},
};

use heck::{ToSnakeCase, ToUpperCamelCase};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocaleEntry {
    code: String,
    prefix: String,
    lang_tag: String,
    native_name: String,
}

#[derive(Deserialize)]
struct Section {
    key: String,
    slug: String,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum Target {
    Route { route: String },
    Section { section: String },
}

#[derive(Deserialize)]
struct Structure {
    sections: Vec<Section>,
    nav: Vec<Target>,
    footer: Vec<Target>,
}

fn target(t: &Target, keys: &BTreeSet<&str>) -> String {
    match t {
        Target::Route { route } if route == "converter" => "NavTarget::Converter".into(),
        Target::Route { route } if route == "noteMaps" => "NavTarget::NoteMaps".into(),
        Target::Route { route } => panic!("structure.json: unknown route '{route}'"),
        Target::Section { section } if keys.contains(section.as_str()) => {
            format!(
                "NavTarget::Section(SectionKey::{})",
                section.to_upper_camel_case()
            )
        }
        Target::Section { section } => panic!("structure.json: unknown section '{section}'"),
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

fn enumeration(name: &str, variants: &[String]) -> String {
    format!(
        "#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]\npub enum {name} {{ {} }}\n",
        variants.join(", ")
    )
}

fn all(variants: &[String]) -> String {
    format!(
        "    pub const ALL: &'static [Self] = &[{}];\n",
        list(variants.iter().map(|v| format!("Self::{v}")))
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

fn per_locale(locales: &[LocaleEntry]) -> String {
    let keys: Vec<(String, String)> = locales
        .iter()
        .map(|l| (l.code.to_snake_case(), l.code.to_upper_camel_case()))
        .collect();
    table("PerLocale", "<T>", "Locale", "T", &keys)
}

fn plain_texts(plain: &[&str]) -> String {
    let variants: Vec<String> = plain.iter().map(|id| id.to_upper_camel_case()).collect();
    let mut out = enumeration("Plain", &variants);
    out += "impl Plain {\n";
    out += &matcher("id", "&'static str", plain, |id| {
        (id.to_upper_camel_case(), format!("{id:?}"))
    });
    out += "}\n";
    let keys: Vec<(String, String)> = plain
        .iter()
        .map(|id| (id.to_snake_case(), id.to_upper_camel_case()))
        .collect();
    out + &table("PlainTexts", "", "Plain", "String", &keys)
}

fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("..");
    let locales: Vec<LocaleEntry> =
        serde_json::from_str(&read(&root.join("locales/locales.json"))).unwrap();
    let structure: Structure =
        serde_json::from_str(&read(&root.join("app/src/content/structure.json"))).unwrap();
    let en = read(&root.join("locales/en/app.ftl"));
    let messages: Vec<(&str, Vec<&str>)> = ftl_vars::message_vars(&en)
        .unwrap_or_else(|e| panic!("en/app.ftl: {e:?}"))
        .into_iter()
        .map(|(id, vars)| (id, vars.into_iter().collect()))
        .collect();
    let plain: Vec<&str> = messages
        .iter()
        .filter(|(_, v)| v.is_empty())
        .map(|(id, _)| *id)
        .collect();
    for l in &locales {
        read(&root.join(format!("locales/{}/app.ftl", l.code)));
        read(&root.join(format!("app/src/content/docs/{}.json", l.code)));
    }
    let keys: BTreeSet<&str> = structure.sections.iter().map(|s| s.key.as_str()).collect();

    let locale_variants: Vec<String> = locales
        .iter()
        .map(|l| l.code.to_upper_camel_case())
        .collect();
    let mut out = enumeration("Locale", &locale_variants);
    out += "impl Locale {\n";
    out += &all(&locale_variants);
    let field = |f: fn(&LocaleEntry) -> &str| {
        move |l: &LocaleEntry| (l.code.to_upper_camel_case(), format!("{:?}", f(l)))
    };
    out += &matcher("code", "&'static str", &locales, field(|l| &l.code));
    out += &matcher("prefix", "&'static str", &locales, field(|l| &l.prefix));
    out += &matcher("lang_tag", "&'static str", &locales, field(|l| &l.lang_tag));
    out += &matcher(
        "native_name",
        "&'static str",
        &locales,
        field(|l| &l.native_name),
    );
    out += &matcher("ftl", "&'static str", &locales, |l| {
        (
            l.code.to_upper_camel_case(),
            source(&format!("locales/{}/app.ftl", l.code)),
        )
    });
    out += &matcher("docs", "&'static str", &locales, |l| {
        (
            l.code.to_upper_camel_case(),
            source(&format!("app/src/content/docs/{}.json", l.code)),
        )
    });
    out += "}\n";
    out += &per_locale(&locales);

    let section_variants: Vec<String> = structure
        .sections
        .iter()
        .map(|s| s.key.to_upper_camel_case())
        .collect();
    out += &enumeration("SectionKey", &section_variants);
    out += "impl SectionKey {\n";
    out += &all(&section_variants);
    out += &matcher("key", "&'static str", &structure.sections, |s| {
        (s.key.to_upper_camel_case(), format!("{:?}", s.key))
    });
    out += &matcher("slug", "&'static str", &structure.sections, |s| {
        (s.key.to_upper_camel_case(), format!("{:?}", s.slug))
    });
    for part in ["label", "heading", "title", "description"] {
        out += &matcher(part, "Plain", &structure.sections, |s| {
            let id = format!("section-{}-{part}", s.key);
            assert!(
                plain.contains(&id.as_str()),
                "en/app.ftl: '{id}' must have no variables"
            );
            (
                s.key.to_upper_camel_case(),
                format!("Plain::{}", id.to_upper_camel_case()),
            )
        });
    }
    out += "}\n";

    out += "#[derive(Copy, Clone, Debug, PartialEq, Eq)]\npub enum NavTarget { Converter, NoteMaps, Section(SectionKey) }\n";
    out += &format!(
        "pub const NAV: &[NavTarget] = &[{}];\n",
        list(structure.nav.iter().map(|t| target(t, &keys)))
    );
    out += &format!(
        "pub const FOOTER: &[NavTarget] = &[{}];\n",
        list(structure.footer.iter().map(|t| target(t, &keys)))
    );

    let message_variants: Vec<String> = messages
        .iter()
        .map(|(id, _)| id.to_upper_camel_case())
        .collect();
    out += &enumeration("MessageId", &message_variants);
    out += "impl MessageId {\n";
    out += &all(&message_variants);
    out += &matcher("id", "&'static str", &messages, |(id, _)| {
        (id.to_upper_camel_case(), format!("{id:?}"))
    });
    out += &matcher("vars", "&'static [&'static str]", &messages, |(id, v)| {
        (id.to_upper_camel_case(), format!("&{v:?}"))
    });
    out += "}\n";
    out += &plain_texts(&plain);

    fs::write(
        PathBuf::from(env::var("OUT_DIR").unwrap()).join("i18n.rs"),
        out,
    )
    .unwrap();
}
