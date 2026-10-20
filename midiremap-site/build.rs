#[path = "src/ftl_vars.rs"]
mod ftl_vars;

use std::{
    collections::BTreeSet,
    env, fs,
    path::{Path, PathBuf},
};

use heck::{ToSnakeCase, ToUpperCamelCase};
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
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
enum Closing {
    Panel,
    Link,
}

#[derive(Deserialize)]
struct Section {
    key: String,
    slug: String,
    closing: Closing,
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
#[serde(rename_all = "camelCase")]
struct Routes {
    converter: String,
    note_maps: String,
    drum_maps: String,
}

#[derive(Deserialize)]
struct Structure {
    routes: Routes,
    sections: Vec<Section>,
    nav: Vec<Target>,
    footer: Vec<Target>,
    popular: Vec<(String, String)>,
}

fn target(t: &Target, keys: &BTreeSet<&str>) -> String {
    match t {
        Target::Route { route } if route == "converter" => "NavTarget::Converter".into(),
        Target::Route { route } if route == "noteMaps" => "NavTarget::NoteMaps".into(),
        Target::Route { route } if route == "drumMaps" => "NavTarget::DrumMaps".into(),
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

fn ftl_files() -> String {
    let variants: Vec<String> = FtlFile::ALL.iter().map(|f| f.variant()).collect();
    let mut out =
        "/// One of a locale's message files; each message lives in the file English gives it.\n"
            .to_owned();
    out += &enumeration("FtlFile", &variants);
    out += "impl FtlFile {\n";
    out += &all(&variants);
    out += &matcher("stem", "&'static str", &FtlFile::ALL, |f| {
        (f.variant(), format!("{:?}", f.stem()))
    });
    out += "}\n";
    out += "impl ::std::fmt::Display for FtlFile {\n    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {\n        write!(f, \"{}.ftl\", self.stem())\n    }\n}\n";
    out
}

fn locale_ftl(locales: &[LocaleEntry]) -> String {
    let arms = list(locales.iter().flat_map(|l| {
        FtlFile::ALL.map(|file| {
            format!(
                "(Self::{}, FtlFile::{}) => {}",
                l.code.to_upper_camel_case(),
                file.variant(),
                source(&format!("locales/{}/{}.ftl", l.code, file.stem()))
            )
        })
    }));
    format!("    pub fn ftl(self, file: FtlFile) -> &'static str {{ match (self, file) {{ {arms} }} }}\n")
}

fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join("..");
    let locales: Vec<LocaleEntry> =
        serde_json::from_str(&read(&root.join("locales/locales.json"))).unwrap();
    let structure: Structure =
        serde_json::from_str(&read(&root.join("content/structure.json"))).unwrap();
    let tip: Tip = serde_json::from_str(&read(&root.join("content/tip.json"))).unwrap();
    let en: Vec<(FtlFile, String)> = FtlFile::ALL
        .into_iter()
        .map(|file| {
            (
                file,
                read(&root.join(format!("locales/en/{}.ftl", file.stem()))),
            )
        })
        .collect();
    let messages: Vec<Message> = en
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
    let plain: Vec<&str> = messages
        .iter()
        .filter(|m| m.vars.is_empty())
        .map(|m| m.id)
        .collect();
    for l in &locales {
        for file in FtlFile::ALL {
            read(&root.join(format!("locales/{}/{}.ftl", l.code, file.stem())));
        }
        read(&root.join(format!("locales/{}/docs.json", l.code)));
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
    out += &locale_ftl(&locales);
    out += &matcher("docs", "&'static str", &locales, |l| {
        (
            l.code.to_upper_camel_case(),
            source(&format!("locales/{}/docs.json", l.code)),
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
    out += &matcher("closing", "Closing", &structure.sections, |s| {
        (
            s.key.to_upper_camel_case(),
            format!("Closing::{:?}", s.closing),
        )
    });
    for part in ["label", "heading", "title", "description"] {
        out += &matcher(part, "Plain", &structure.sections, |s| {
            let id = format!("section-{}-{part}", s.key);
            assert!(
                plain.contains(&id.as_str()),
                "locales/en: '{id}' must have no variables"
            );
            (
                s.key.to_upper_camel_case(),
                format!("Plain::{}", id.to_upper_camel_case()),
            )
        });
    }
    out += "}\n";

    let mut routes = format!(
        "pub const CONVERTER: SitePath = SitePath::fixed({:?});\npub const NOTE_MAPS: SitePath = SitePath::fixed({:?});\npub const DRUM_MAPS: SitePath = SitePath::fixed({:?});\n",
        structure.routes.converter, structure.routes.note_maps, structure.routes.drum_maps
    );
    routes += "#[derive(Copy, Clone, Debug, PartialEq, Eq)]\npub enum NavTarget { Converter, NoteMaps, DrumMaps, Section(SectionKey) }\n";
    routes += &format!(
        "pub const NAV: &[NavTarget] = &[{}];\n",
        list(structure.nav.iter().map(|t| target(t, &keys)))
    );
    routes += &format!(
        "pub const FOOTER: &[NavTarget] = &[{}];\n",
        list(structure.footer.iter().map(|t| target(t, &keys)))
    );
    routes += &format!(
        "pub const POPULAR: &[(&str, &str)] = &[{}];\n",
        list(
            structure
                .popular
                .iter()
                .map(|(src, tgt)| format!("({src:?}, {tgt:?})"))
        )
    );

    out += &format!(
        "pub const TIP_HREF: &str = {:?};
",
        tip.other
    );

    let message_variants: Vec<String> = messages
        .iter()
        .map(|m| m.id.to_upper_camel_case())
        .collect();
    out += &enumeration("MessageId", &message_variants);
    out += "impl MessageId {\n";
    out += &all(&message_variants);
    out += &matcher("id", "&'static str", &messages, |m| {
        (m.id.to_upper_camel_case(), format!("{:?}", m.id))
    });
    out += &matcher("vars", "&'static [&'static str]", &messages, |m| {
        (m.id.to_upper_camel_case(), format!("&{:?}", m.vars))
    });
    out += &matcher("file", "FtlFile", &messages, |m| {
        (
            m.id.to_upper_camel_case(),
            format!("FtlFile::{}", m.file.variant()),
        )
    });
    out += "}\n";
    out += &ftl_files();
    out += &plain_texts(&plain);

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("i18n.rs"), out).unwrap();
    fs::write(out_dir.join("routes.rs"), routes).unwrap();
}
