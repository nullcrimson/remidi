use std::collections::{BTreeSet, HashMap};

use fluent_bundle::{concurrent::FluentBundle, FluentArgs, FluentError, FluentResource};
use fluent_syntax::parser::ParserError;

use crate::{content::Block, ftl_vars};

include!(concat!(env!("OUT_DIR"), "/i18n.rs"));

#[derive(thiserror::Error, Debug)]
pub enum I18nError {
    #[error("locales/{locale}/{file}: {errors:?}")]
    FtlSyntax {
        locale: &'static str,
        file: FtlFile,
        errors: Vec<ParserError>,
    },
    #[error("locales/{locale}: {source}")]
    LanguageTag {
        locale: &'static str,
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("locales/{locale}/{file}: {errors:?}")]
    FtlDuplicates {
        locale: &'static str,
        file: FtlFile,
        errors: Vec<FluentError>,
    },
    #[error("locales/{locale}: '{id}' is in both {first} and {second}")]
    DuplicateMessage {
        locale: &'static str,
        id: String,
        first: FtlFile,
        second: FtlFile,
    },
    #[error("locales/{locale}/{file}: missing '{id}'")]
    MissingMessage {
        locale: &'static str,
        file: FtlFile,
        id: &'static str,
    },
    #[error("locales/{locale}/{file}: '{id}' uses {found:?}, English uses {expected:?}")]
    VariablesDiffer {
        locale: &'static str,
        file: FtlFile,
        id: &'static str,
        found: BTreeSet<String>,
        expected: BTreeSet<&'static str>,
    },
    #[error("locales/{locale}/{file}: '{id}' is not an English message of this file")]
    ExtraMessage {
        locale: &'static str,
        file: FtlFile,
        id: String,
    },
    #[error("locales/{locale}: '{id}' has no value")]
    NoValue {
        locale: &'static str,
        id: &'static str,
    },
    #[error("locales/{locale}: '{id}': {errors:?}")]
    Formatting {
        locale: &'static str,
        id: &'static str,
        errors: Vec<FluentError>,
    },
    #[error("locales/{locale}/docs.json: {source}")]
    DocsSyntax {
        locale: &'static str,
        source: serde_json::Error,
    },
    #[error("locales/{locale}/docs.json: unknown section '{key}'")]
    UnknownSection { locale: &'static str, key: String },
}

struct Translation {
    plain: PlainTexts,
    bundle: FluentBundle<FluentResource>,
}

/// Every locale's UI messages, from each of its [`FtlFile`]s, checked against
/// English's ids, files and variables; the ones without variables are kept formatted.
pub struct Messages(PerLocale<Translation>);

type FoundVars<'a> = HashMap<&'a str, BTreeSet<&'a str>>;

fn file_matches_english(
    locale: &'static str,
    file: FtlFile,
    mut found: FoundVars,
) -> Result<(), I18nError> {
    for &id in MessageId::ALL.iter().filter(|id| id.file() == file) {
        let vars = found.remove(id.id()).ok_or(I18nError::MissingMessage {
            locale,
            file,
            id: id.id(),
        })?;
        let expected: BTreeSet<&'static str> = id.vars().iter().copied().collect();
        if vars != expected {
            return Err(I18nError::VariablesDiffer {
                locale,
                file,
                id: id.id(),
                found: vars.into_iter().map(str::to_owned).collect(),
                expected,
            });
        }
    }
    match found.keys().next() {
        Some(extra) => Err(I18nError::ExtraMessage {
            locale,
            file,
            id: (*extra).to_owned(),
        }),
        None => Ok(()),
    }
}

fn matches_english<'a>(locale: Locale, ftl: impl Fn(FtlFile) -> &'a str) -> Result<(), I18nError> {
    let locale = locale.code();
    let mut owner: HashMap<&str, FtlFile> = HashMap::new();
    let mut found = Vec::new();
    for &file in FtlFile::ALL {
        let vars: FoundVars = ftl_vars::message_vars(ftl(file))
            .map_err(|errors| I18nError::FtlSyntax {
                locale,
                file,
                errors,
            })?
            .into_iter()
            .collect();
        for &id in vars.keys() {
            if let Some(first) = owner.insert(id, file) {
                return Err(I18nError::DuplicateMessage {
                    locale,
                    id: id.to_owned(),
                    first,
                    second: file,
                });
            }
        }
        found.push((file, vars));
    }
    found
        .into_iter()
        .try_for_each(|(file, vars)| file_matches_english(locale, file, vars))
}

fn bundle<'a>(
    locale: Locale,
    ftl: impl Fn(FtlFile) -> &'a str,
) -> Result<FluentBundle<FluentResource>, I18nError> {
    let code = locale.code();
    let tag = locale
        .lang_tag()
        .parse()
        .map_err(|e| I18nError::LanguageTag {
            locale: code,
            source: Box::new(e),
        })?;
    let mut bundle = FluentBundle::new_concurrent(vec![tag]);
    bundle.set_use_isolating(false);
    for &file in FtlFile::ALL {
        let res = FluentResource::try_new(ftl(file).to_owned()).map_err(|(_, errors)| {
            I18nError::FtlSyntax {
                locale: code,
                file,
                errors,
            }
        })?;
        bundle
            .add_resource(res)
            .map_err(|errors| I18nError::FtlDuplicates {
                locale: code,
                file,
                errors,
            })?;
    }
    Ok(bundle)
}

fn format(
    bundle: &FluentBundle<FluentResource>,
    locale: Locale,
    id: &'static str,
    args: &FluentArgs,
) -> Result<String, I18nError> {
    let locale = locale.code();
    let pattern = bundle
        .get_message(id)
        .and_then(|m| m.value())
        .ok_or(I18nError::NoValue { locale, id })?;
    let mut errors = vec![];
    let text = bundle.format_pattern(pattern, Some(args), &mut errors);
    match errors.as_slice() {
        [] => Ok(text.into_owned()),
        _ => Err(I18nError::Formatting { locale, id, errors }),
    }
}

fn placeholder_args<'a>(vars: &[&'a str]) -> FluentArgs<'a> {
    let mut args = FluentArgs::new();
    vars.iter().for_each(|v| args.set(*v, "x"));
    args
}

impl Messages {
    fn check<'a>(
        locale: Locale,
        ftl: impl Fn(FtlFile) -> &'a str + Copy,
    ) -> Result<Translation, I18nError> {
        matches_english(locale, ftl)?;
        let bundle = bundle(locale, ftl)?;
        for &id in MessageId::ALL.iter().filter(|id| !id.vars().is_empty()) {
            format(&bundle, locale, id.id(), &placeholder_args(id.vars()))?;
        }
        let plain = PlainTexts::try_new(|id| format(&bundle, locale, id.id(), &FluentArgs::new()))?;
        Ok(Translation { plain, bundle })
    }

    pub fn load() -> Result<Self, I18nError> {
        PerLocale::try_new(|l| Self::check(l, |file| l.ftl(file))).map(Self)
    }

    pub fn get(&self, locale: Locale, id: Plain) -> &str {
        self.0.get(locale).plain.get(id)
    }

    /// `id` in `locale` with `args`; an argument the message needs but `args` lacks, or
    /// names differently, is an error.
    pub fn format(
        &self,
        locale: Locale,
        id: MessageId,
        args: &FluentArgs,
    ) -> Result<String, I18nError> {
        format(&self.0.get(locale).bundle, locale, id.id(), args)
    }
}

/// Every locale's guide, FAQ and legal documents, by section.
pub struct Docs(PerLocale<HashMap<SectionKey, Vec<Block>>>);

impl Docs {
    fn parse(locale: Locale, json: &str) -> Result<HashMap<SectionKey, Vec<Block>>, I18nError> {
        let locale = locale.code();
        let raw: HashMap<String, Vec<Block>> = serde_json::from_str(json)
            .map_err(|source| I18nError::DocsSyntax { locale, source })?;
        raw.into_iter()
            .map(|(k, b)| {
                SectionKey::ALL
                    .iter()
                    .find(|s| s.key() == k)
                    .map(|&s| (s, b))
                    .ok_or(I18nError::UnknownSection { locale, key: k })
            })
            .collect()
    }

    pub fn load() -> Result<Self, I18nError> {
        PerLocale::try_new(|l| Self::parse(l, l.docs())).map(Self)
    }

    #[cfg(test)]
    pub fn with_sections(keys: impl Fn(Locale) -> &'static [SectionKey]) -> Self {
        Self(PerLocale::try_new(|l| Ok(keys(l).iter().map(|&k| (k, vec![])).collect())).unwrap())
    }

    pub fn blocks(&self, locale: Locale, key: SectionKey) -> Option<&[Block]> {
        self.0.get(locale).get(&key).map(Vec::as_slice)
    }

    pub fn has(&self, locale: Locale, key: SectionKey) -> bool {
        self.blocks(locale, key).is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eleven_locales_in_menu_order() {
        let names: Vec<&str> = Locale::ALL.iter().map(|l| l.native_name()).collect();
        assert_eq!(
            names,
            [
                "English",
                "Español",
                "Português",
                "Deutsch",
                "日本語",
                "Français",
                "Русский",
                "Polski",
                "Italiano",
                "中文",
                "한국어"
            ]
        );
    }

    #[test]
    fn every_locale_has_its_own_prefix() {
        let prefixes: std::collections::HashSet<&str> =
            Locale::ALL.iter().map(|l| l.prefix()).collect();
        assert_eq!(prefixes.len(), Locale::ALL.len());
    }

    fn english(file: FtlFile) -> &'static str {
        Locale::En.ftl(file)
    }

    fn english_with<'a>(changed: FtlFile, text: &'a str) -> impl Fn(FtlFile) -> &'a str + Copy {
        move |file| if file == changed { text } else { english(file) }
    }

    fn english_with_app<'a>(app: &'a str) -> impl Fn(FtlFile) -> &'a str + Copy {
        english_with(FtlFile::App, app)
    }

    fn with_edit_more(replacement: &str) -> String {
        english(FtlFile::App)
            .lines()
            .map(|l| {
                if l.starts_with("edit-more =") {
                    replacement.to_owned()
                } else {
                    l.to_owned()
                }
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn section_slugs_are_unique() {
        let slugs: std::collections::HashSet<&str> =
            SectionKey::ALL.iter().map(|k| k.slug()).collect();
        assert_eq!(slugs.len(), SectionKey::ALL.len());
    }

    #[test]
    fn english_loads_from_both_files() {
        assert!(Messages::check(Locale::En, english).is_ok());
    }

    #[test]
    fn load_rejects_missing_ids() {
        assert!(matches!(
            Messages::check(Locale::En, english_with_app("nav-converter = x\n")).err(),
            Some(I18nError::MissingMessage {
                file: FtlFile::App,
                ..
            })
        ));
    }

    #[test]
    fn load_rejects_an_extra_id() {
        let extra = format!("{}\nnot-in-english = x\n", english(FtlFile::App));
        assert!(matches!(
            Messages::check(Locale::En, english_with_app(&extra)).err(),
            Some(I18nError::ExtraMessage { .. })
        ));
    }

    #[test]
    fn load_rejects_a_message_in_both_files() {
        let site = format!("{}nav-converter = x\n", english(FtlFile::Site));
        let both = english_with(FtlFile::Site, &site);
        assert!(matches!(
            Messages::check(Locale::En, both).err(),
            Some(I18nError::DuplicateMessage {
                id,
                first: FtlFile::App,
                second: FtlFile::Site,
                ..
            }) if id == "nav-converter"
        ));
    }

    #[test]
    fn load_rejects_a_site_message_in_app_ftl() {
        let app = format!("{}{}", english(FtlFile::App), english(FtlFile::Site));
        let moved = |file| match file {
            FtlFile::App => app.as_str(),
            FtlFile::Site => "",
        };
        assert!(matches!(
            Messages::check(Locale::En, moved).err(),
            Some(I18nError::ExtraMessage {
                file: FtlFile::App,
                ..
            })
        ));
    }

    #[test]
    fn load_rejects_a_renamed_variable() {
        let renamed = with_edit_more("edit-more = +{ $renamed } more");
        assert!(matches!(
            Messages::check(Locale::En, english_with_app(&renamed)).err(),
            Some(I18nError::VariablesDiffer { .. })
        ));
    }

    #[test]
    fn load_rejects_a_dropped_variable() {
        let dropped = with_edit_more("edit-more = more");
        assert!(matches!(
            Messages::check(Locale::En, english_with_app(&dropped)).err(),
            Some(I18nError::VariablesDiffer { .. })
        ));
    }

    #[test]
    fn load_rejects_a_malformed_resource() {
        let malformed = english_with(FtlFile::Site, "maps-breadcrumb = { \n");
        assert!(matches!(
            Messages::check(Locale::En, malformed).err(),
            Some(I18nError::FtlSyntax {
                file: FtlFile::Site,
                ..
            })
        ));
    }

    #[test]
    fn docs_reject_an_unknown_section() {
        assert!(matches!(
            Docs::parse(Locale::En, r#"{ "nope": [] }"#),
            Err(I18nError::UnknownSection { key, .. }) if key == "nope"
        ));
    }

    #[test]
    fn messages_format_with_their_arguments() {
        let mut args = FluentArgs::new();
        args.set("engine", "EZdrummer 3");
        assert_eq!(
            crate::fixtures::messages()
                .format(Locale::En, MessageId::MapsConvertTo, &args)
                .unwrap(),
            "Convert to EZdrummer 3"
        );
    }

    #[test]
    fn a_message_formatted_with_a_misnamed_argument_is_an_error() {
        let mut args = FluentArgs::new();
        args.set("engin", "EZdrummer 3");
        assert!(matches!(
            crate::fixtures::messages().format(Locale::En, MessageId::MapsConvertTo, &args),
            Err(I18nError::Formatting { .. })
        ));
    }

    #[test]
    fn a_message_formatted_without_its_argument_is_an_error() {
        assert!(matches!(
            crate::fixtures::messages().format(
                Locale::En,
                MessageId::MapsConvertTo,
                &FluentArgs::new()
            ),
            Err(I18nError::Formatting { .. })
        ));
    }
}
