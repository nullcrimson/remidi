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

struct Translation {
    plain: PlainTexts,
    bundle: FluentBundle<FluentResource>,
}

/// Every locale's UI messages, checked against English's ids and variables; the ones
/// without variables are kept formatted.
pub struct Messages(PerLocale<Translation>);

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
    fn check(locale: Locale, ftl: &str) -> Result<Translation, I18nError> {
        let err = |detail: String| I18nError::Ftl {
            locale: locale.code(),
            detail,
        };
        matches_english(ftl).map_err(err)?;
        let bundle = bundle(locale, ftl).map_err(err)?;
        for &id in MessageId::ALL.iter().filter(|id| !id.vars().is_empty()) {
            format(&bundle, id.id(), id.vars()).map_err(err)?;
        }
        let plain = PlainTexts::try_new(|id| format(&bundle, id.id(), &[]).map_err(err))?;
        Ok(Translation { plain, bundle })
    }

    pub fn load() -> Result<Self, I18nError> {
        PerLocale::try_new(|l| Self::check(l, l.ftl())).map(Self)
    }

    pub fn get(&self, locale: Locale, id: Plain) -> &str {
        self.0.get(locale).plain.get(id)
    }

    /// `id` in `locale` with `args`; `load` proved every message has a value.
    pub fn format(&self, locale: Locale, id: MessageId, args: &FluentArgs) -> String {
        let Translation { bundle, .. } = self.0.get(locale);
        bundle
            .get_message(id.id())
            .and_then(|m| m.value())
            .map(|p| {
                bundle
                    .format_pattern(p, Some(args), &mut vec![])
                    .into_owned()
            })
            .unwrap_or_default()
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

/// The path prefix of `locale`'s pages: empty for English, `/pl` for Polish.
pub fn base(locale: Locale) -> String {
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
        NavTarget::NoteMaps => format!("{}{NOTE_MAPS}", base(locale)),
        NavTarget::Section(k) if docs.has(locale, k) => format!("{}/{}/", base(locale), k.slug()),
        NavTarget::Section(k) => format!("/{}/", k.slug()),
    }
}

/// A static page, as the language menu and `hreflang` see it.
pub enum Page<'a> {
    /// A document section, which a locale may lack.
    Section(SectionKey),
    /// A page every locale has, by its English path.
    Everywhere(&'a str),
}

/// The same page in `to`, or `to`'s converter when the page has no version there.
pub fn page_in(page: &Page, to: Locale, docs: &Docs) -> String {
    match page {
        Page::Section(k) if docs.has(to, *k) => href(NavTarget::Section(*k), to, docs),
        Page::Section(_) => home(to),
        Page::Everywhere(path) => format!("{}{path}", base(to)),
    }
}

/// The versions of `page` for `hreflang`: each locale that has it, then `x-default`.
pub fn alternates(page: &Page, docs: &Docs) -> Vec<(&'static str, String)> {
    Locale::ALL
        .iter()
        .filter(|&&l| match page {
            Page::Section(k) => docs.has(l, *k),
            Page::Everywhere(_) => true,
        })
        .map(|&l| (l.lang_tag(), page_in(page, l, docs)))
        .chain([("x-default", page_in(page, Locale::En, docs))])
        .collect()
}

/// The converter's versions for `hreflang`.
pub fn converter_alternates() -> Vec<(&'static str, String)> {
    Locale::ALL
        .iter()
        .map(|&l| (l.lang_tag(), home(l)))
        .chain([("x-default", home(Locale::En))])
        .collect()
}

/// A document's internal link, pointed at the same page in `locale`.
pub fn local_href(path: &str, locale: Locale, docs: &Docs) -> String {
    match SectionKey::ALL
        .iter()
        .find(|k| path == format!("/{}/", k.slug()))
    {
        Some(&k) => href(NavTarget::Section(k), locale, docs),
        None => format!("{}{path}", base(locale)),
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

    #[test]
    fn eleven_locales_in_menu_order_each_with_its_own_prefix() {
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
        let prefixes: std::collections::HashSet<&str> =
            Locale::ALL.iter().map(|l| l.prefix()).collect();
        assert_eq!(prefixes.len(), Locale::ALL.len());
    }

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
        let docs = Docs::with_sections(|_| &[SectionKey::Guide]);
        assert_eq!(href(NavTarget::Converter, Locale::En, &docs), "/");
        assert_eq!(href(NavTarget::NoteMaps, Locale::En, &docs), NOTE_MAPS);
        assert_eq!(
            href(NavTarget::Section(SectionKey::Guide), Locale::En, &docs),
            "/how-it-works/"
        );
    }

    #[test]
    fn load_rejects_missing_ids() {
        assert!(Messages::check(Locale::En, "nav-converter = x\n").is_err());
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

    #[test]
    fn a_translated_section_switches_to_its_translation() {
        let docs = Docs::load().unwrap();
        assert_eq!(
            page_in(&Page::Section(SectionKey::Faq), Locale::Pl, &docs),
            "/pl/faq/"
        );
        assert_eq!(
            page_in(&Page::Section(SectionKey::Faq), Locale::En, &docs),
            "/faq/"
        );
    }

    fn polish_without_terms() -> Docs {
        Docs::with_sections(|l| match l {
            Locale::En => &[SectionKey::Faq, SectionKey::Terms],
            _ => &[SectionKey::Faq],
        })
    }

    #[test]
    fn an_untranslated_section_switches_to_the_converter() {
        let docs = polish_without_terms();
        assert_eq!(
            page_in(&Page::Section(SectionKey::Terms), Locale::Pl, &docs),
            "/pl/"
        );
    }

    #[test]
    fn a_document_link_points_at_the_page_in_the_readers_language() {
        let docs = Docs::load().unwrap();
        assert_eq!(local_href("/engines/", Locale::Pl, &docs), "/pl/engines/");
        assert_eq!(local_href("/faq/", Locale::Pl, &docs), "/pl/faq/");
        assert_eq!(local_href("/engines/", Locale::En, &docs), "/engines/");
    }

    #[test]
    fn note_maps_link_to_the_locales_note_maps() {
        let docs = Docs::load().unwrap();
        assert_eq!(href(NavTarget::NoteMaps, Locale::Pl, &docs), "/pl/engines/");
    }

    #[test]
    fn a_note_map_page_switches_to_the_same_page_in_another_locale() {
        let docs = Docs::load().unwrap();
        let page = Page::Everywhere("/engines/ezdrummer/");
        assert_eq!(page_in(&page, Locale::Pl, &docs), "/pl/engines/ezdrummer/");
    }

    #[test]
    fn a_note_map_page_lists_every_locale_and_the_default() {
        let docs = Docs::load().unwrap();
        assert_eq!(
            alternates(&Page::Everywhere("/engines/"), &docs).len(),
            Locale::ALL.len() + 1
        );
    }

    #[test]
    fn messages_format_with_their_arguments() {
        let mut args = FluentArgs::new();
        args.set("engine", "EZdrummer 3");
        assert_eq!(
            Messages::load()
                .unwrap()
                .format(Locale::En, MessageId::MapsConvertTo, &args),
            "Convert to EZdrummer 3"
        );
    }

    #[test]
    fn a_translated_section_lists_its_versions_and_the_default() {
        let docs = Docs::load().unwrap();
        let faq = alternates(&Page::Section(SectionKey::Faq), &docs);
        assert_eq!(faq.len(), Locale::ALL.len() + 1);
        assert_eq!(faq.first(), Some(&("en", "/faq/".to_owned())));
        assert!(faq.contains(&("pl", "/pl/faq/".to_owned())));
        assert!(faq.contains(&("pt-BR", "/pt/faq/".to_owned())));
        assert!(faq.contains(&("zh-Hans", "/zh/faq/".to_owned())));
        assert_eq!(faq.last(), Some(&("x-default", "/faq/".to_owned())));
        assert_eq!(
            alternates(&Page::Section(SectionKey::Terms), &polish_without_terms()).len(),
            2
        );
    }
}
