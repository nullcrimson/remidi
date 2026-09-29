use std::collections::{BTreeSet, HashMap};

use fluent_bundle::{concurrent::FluentBundle, FluentArgs, FluentResource};

use crate::{content::Block, ftl_vars, pages::NOTE_MAPS};

include!(concat!(env!("OUT_DIR"), "/i18n.rs"));

#[derive(thiserror::Error, Debug)]
pub enum I18nError {
    #[error("locales/{locale}/app.ftl: {detail}")]
    Ftl {
        locale: &'static str,
        detail: String,
    },
    #[error("app/src/content/docs/{locale}.json: {detail}")]
    Docs {
        locale: &'static str,
        detail: String,
    },
}

/// Every locale's UI messages, checked against English's ids and variables; the ones
/// without variables are kept formatted.
pub struct Messages(PerLocale<PlainTexts>);

fn matches_english(ftl: &str) -> Result<(), String> {
    let mut found: HashMap<&str, BTreeSet<&str>> = ftl_vars::message_vars(ftl)
        .map_err(|e| format!("{e:?}"))?
        .into_iter()
        .collect();
    for &id in MessageId::ALL {
        let vars = found
            .remove(id.id())
            .ok_or_else(|| format!("missing '{}'", id.id()))?;
        let expected: BTreeSet<&str> = id.vars().iter().copied().collect();
        if vars != expected {
            return Err(format!(
                "'{}' uses {vars:?}, English uses {expected:?}",
                id.id()
            ));
        }
    }
    match found.keys().next() {
        Some(extra) => Err(format!("'{extra}' is not an English message")),
        None => Ok(()),
    }
}

fn bundle(locale: Locale, ftl: &str) -> Result<FluentBundle<FluentResource>, String> {
    let res = FluentResource::try_new(ftl.to_owned()).map_err(|(_, e)| format!("{e:?}"))?;
    let tag = locale.lang_tag().parse().map_err(|e| format!("{e}"))?;
    let mut bundle = FluentBundle::new_concurrent(vec![tag]);
    bundle.set_use_isolating(false);
    bundle.add_resource(res).map_err(|e| format!("{e:?}"))?;
    Ok(bundle)
}

fn format(
    bundle: &FluentBundle<FluentResource>,
    id: &str,
    vars: &[&str],
) -> Result<String, String> {
    let pattern = bundle
        .get_message(id)
        .and_then(|m| m.value())
        .ok_or_else(|| format!("'{id}' has no value"))?;
    let mut args = FluentArgs::new();
    vars.iter().for_each(|v| args.set(*v, "x"));
    let mut errors = vec![];
    let text = bundle.format_pattern(pattern, Some(&args), &mut errors);
    match errors.as_slice() {
        [] => Ok(text.into_owned()),
        _ => Err(format!("'{id}': {errors:?}")),
    }
}

impl Messages {
    fn check(locale: Locale, ftl: &str) -> Result<PlainTexts, I18nError> {
        let err = |detail: String| I18nError::Ftl {
            locale: locale.code(),
            detail,
        };
        matches_english(ftl).map_err(err)?;
        let bundle = bundle(locale, ftl).map_err(err)?;
        for &id in MessageId::ALL.iter().filter(|id| !id.vars().is_empty()) {
            format(&bundle, id.id(), id.vars()).map_err(err)?;
        }
        PlainTexts::try_new(|id| format(&bundle, id.id(), &[]).map_err(err))
    }

    pub fn load() -> Result<Self, I18nError> {
        PerLocale::try_new(|l| Self::check(l, l.ftl())).map(Self)
    }

    pub fn get(&self, locale: Locale, id: Plain) -> &str {
        self.0.get(locale).get(id)
    }
}

/// Every locale's guide, FAQ and legal documents, by section.
pub struct Docs(PerLocale<HashMap<SectionKey, Vec<Block>>>);

impl Docs {
    fn parse(locale: Locale, json: &str) -> Result<HashMap<SectionKey, Vec<Block>>, I18nError> {
        let err = |detail: String| I18nError::Docs {
            locale: locale.code(),
            detail,
        };
        let raw: HashMap<String, Vec<Block>> =
            serde_json::from_str(json).map_err(|e| err(e.to_string()))?;
        raw.into_iter()
            .map(|(k, b)| {
                SectionKey::ALL
                    .iter()
                    .find(|s| s.key() == k)
                    .map(|&s| (s, b))
                    .ok_or_else(|| err(format!("unknown section '{k}'")))
            })
            .collect()
    }

    pub fn load() -> Result<Self, I18nError> {
        PerLocale::try_new(|l| Self::parse(l, l.docs())).map(Self)
    }

    #[cfg(test)]
    pub fn with_sections(keys: &[SectionKey]) -> Self {
        Self(PerLocale::try_new(|_| Ok(keys.iter().map(|&k| (k, vec![])).collect())).unwrap())
    }

    pub fn blocks(&self, locale: Locale, key: SectionKey) -> Option<&[Block]> {
        self.0.get(locale).get(&key).map(Vec::as_slice)
    }

    pub fn has(&self, locale: Locale, key: SectionKey) -> bool {
        self.blocks(locale, key).is_some()
    }
}

fn base(locale: Locale) -> String {
    match locale.prefix() {
        "" => String::new(),
        p => format!("/{p}"),
    }
}

/// The converter's address in `locale`.
pub fn home(locale: Locale) -> String {
    format!("{}/", base(locale))
}

/// Where a nav or footer link goes from a `locale` page: a section the locale lacks
/// links to the English page.
pub fn href(target: NavTarget, locale: Locale, docs: &Docs) -> String {
    match target {
        NavTarget::Converter => home(locale),
        NavTarget::NoteMaps => NOTE_MAPS.to_owned(),
        NavTarget::Section(k) if docs.has(locale, k) => format!("{}/{}/", base(locale), k.slug()),
        NavTarget::Section(k) => format!("/{}/", k.slug()),
    }
}

/// The label a nav or footer link shows.
pub fn label(target: NavTarget) -> Plain {
    match target {
        NavTarget::Converter => Plain::NavConverter,
        NavTarget::NoteMaps => Plain::NavNoteMaps,
        NavTarget::Section(k) => k.label(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn with_edit_more(replacement: &str) -> String {
        Locale::En
            .ftl()
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
    fn english_links_point_at_routes_and_section_slugs() {
        let docs = Docs::with_sections(&[SectionKey::Guide]);
        assert_eq!(href(NavTarget::Converter, Locale::En, &docs), "/");
        assert_eq!(href(NavTarget::NoteMaps, Locale::En, &docs), NOTE_MAPS);
        assert_eq!(
            href(NavTarget::Section(SectionKey::Guide), Locale::En, &docs),
            "/how-it-works/"
        );
    }

    #[test]
    fn load_rejects_missing_ids() {
        assert!(Messages::check(Locale::En, "trademark = x\n").is_err());
    }

    #[test]
    fn load_rejects_an_extra_id() {
        let extra = format!("{}\nnot-in-english = x\n", Locale::En.ftl());
        assert!(Messages::check(Locale::En, &extra).is_err());
    }

    #[test]
    fn load_rejects_a_renamed_variable() {
        let renamed = with_edit_more("edit-more = +{ $renamed } more");
        assert!(Messages::check(Locale::En, &renamed).is_err());
    }

    #[test]
    fn load_rejects_a_dropped_variable() {
        let dropped = with_edit_more("edit-more = more");
        assert!(Messages::check(Locale::En, &dropped).is_err());
    }

    #[test]
    fn docs_reject_an_unknown_section() {
        assert!(Docs::parse(Locale::En, r#"{ "nope": [] }"#).is_err());
    }
}
