use std::{borrow::Borrow, collections::BTreeSet};

use midiremap_core::{Canon, Outcome};

use crate::{
    converter_step::ConverterStep,
    i18n::{Docs, Locale, Messages, Phrase, Plain},
    routes::{href, label, local_href, LocalPath, NavTarget, SitePath},
};

const LIST_SEPARATOR: &str = ", ";

pub fn drum_list(drums: &BTreeSet<Canon>) -> String {
    drums
        .iter()
        .map(|drum| drum.label())
        .collect::<Vec<_>>()
        .join(LIST_SEPARATOR)
}

pub struct NavItem<'a> {
    pub label: &'a str,
    pub href: LocalPath,
    pub current: bool,
    pub converter: bool,
}

/// The site's messages and documents in one locale.
pub struct Texts<'a> {
    pub messages: &'a Messages,
    pub docs: &'a Docs,
    pub locale: Locale,
}

impl<'a> Texts<'a> {
    pub fn get(&self, id: Plain) -> &'a str {
        self.messages.get(self.locale, id)
    }

    /// A converter step's title, the converter's own.
    pub fn step(&self, step: impl Borrow<ConverterStep>) -> &'a str {
        self.get(match step.borrow() {
            ConverterStep::File => Plain::StepFile,
            ConverterStep::Engines => Plain::StepEngines,
            ConverterStep::Convert => Plain::StepConvert,
        })
    }

    pub fn say(&self, phrase: Phrase) -> String {
        self.messages.say(self.locale, phrase)
    }

    /// How the pair table names the outcome of a row.
    pub fn status(&self, outcome: &Outcome) -> &'a str {
        self.get(match outcome {
            Outcome::Direct { .. } => Plain::MapsStatusExact,
            Outcome::Fallback { .. } => Plain::MapsStatusApproximated,
            Outcome::Dropped { .. } => Plain::MapsStatusDropped,
        })
    }

    pub fn plays(&self, sources: &BTreeSet<Canon>) -> String {
        self.say(Phrase::maps_changes_plays(drum_list(sources)))
    }

    pub fn no_drum_for(&self, target: &str, sources: &BTreeSet<Canon>) -> String {
        self.say(Phrase::maps_changes_dropped(drum_list(sources), target))
    }

    pub fn path(&self, english: SitePath) -> LocalPath {
        english.in_locale(self.locale)
    }

    pub fn link(&self, english: &str) -> LocalPath {
        local_href(english, self.locale, self.docs)
    }

    pub fn links(&self, targets: &[NavTarget], current: Option<NavTarget>) -> Vec<NavItem<'a>> {
        targets
            .iter()
            .map(|&t| NavItem {
                label: self.get(label(t)),
                href: href(t, self.locale, self.docs),
                current: current == Some(t),
                converter: t == NavTarget::Converter,
            })
            .collect()
    }
}
