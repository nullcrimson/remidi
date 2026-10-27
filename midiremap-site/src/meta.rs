use crate::{
    i18n::{Phrase, Plain, SectionKey},
    pages::{EnginePage, IndexPage, PairPage, PairSummary, Tally},
    routes::{href, LocalPath, NavTarget, SitePath, DRUM_MAPS, NOTE_MAPS, SITE_NAME},
    texts::Texts,
};

pub const DESCRIPTION_MAX: usize = 155;
/// A page's name, search snippet and canonical address.
pub struct Meta {
    pub name: String,
    pub description: String,
    pub canonical: String,
}

impl Meta {
    /// The page's title: its name and the site's.
    pub fn title(&self) -> String {
        format!("{} | {SITE_NAME}", self.name)
    }
}

const TITLE_NAME_MAX: usize = 40;

pub fn fit(first: &str, fallbacks: &[String], rest: &[String], max: usize) -> String {
    let Some(mut out) = std::iter::once(first)
        .chain(fallbacks.iter().map(String::as_str))
        .find(|s| s.chars().count() <= max)
        .map(str::to_owned)
    else {
        return std::iter::once(first)
            .chain(fallbacks.iter().map(String::as_str))
            .min_by_key(|s| s.chars().count())
            .unwrap_or(first)
            .to_owned();
    };
    for sentence in rest {
        if out.chars().count() + 1 + sentence.chars().count() <= max {
            out = format!("{out} {sentence}");
        }
    }
    out
}

pub fn with_midi(name: &str) -> String {
    if name.ends_with("MIDI") {
        name.to_string()
    } else {
        format!("{name} MIDI")
    }
}

pub fn engine_meta(p: &EnginePage, texts: &Texts) -> Meta {
    let n = p.engine.name.as_str();
    let midi = with_midi(n);
    let name = if n.chars().count() <= TITLE_NAME_MAX {
        texts.say(Phrase::maps_engine_title(midi.as_str()))
    } else {
        texts.say(Phrase::maps_engine_title_long_name(n))
    };
    Meta {
        name,
        description: fit(
            &texts.say(Phrase::maps_engine_description(n, p.total)),
            &[texts.say(Phrase::maps_engine_description_short(n))],
            &[
                texts.get(Plain::MapsEngineDescriptionDrumMaps).to_owned(),
                texts.say(Phrase::maps_engine_description_more(midi.as_str())),
            ],
            DESCRIPTION_MAX,
        ),
        canonical: p.engine.href().in_locale(texts.locale).url(),
    }
}

fn conversion_meta(src: &str, tgt: &str, tally: Tally, path: SitePath, texts: &Texts) -> Meta {
    Meta {
        name: texts.say(Phrase::maps_pair_title(with_midi(src), tgt)),
        description: fit(
            &texts.say(Phrase::maps_pair_description(
                tally.approximated,
                tally.dropped,
                tally.exact,
                src,
                tgt,
            )),
            &[texts.say(Phrase::maps_pair_description_short(src, tgt))],
            &[texts.get(Plain::MapsPairDescriptionMore).to_owned()],
            DESCRIPTION_MAX,
        ),
        canonical: path.in_locale(texts.locale).url(),
    }
}

pub fn pair_meta(p: &PairPage, texts: &Texts) -> Meta {
    conversion_meta(&p.src.name, &p.tgt.name, p.tally, p.link.href(), texts)
}

pub fn summary_meta(p: &PairSummary, texts: &Texts) -> Meta {
    conversion_meta(
        &p.link.src_name,
        &p.link.tgt_name,
        p.tally,
        p.link.href(),
        texts,
    )
}

pub fn section_meta(k: SectionKey, texts: &Texts) -> Meta {
    content_meta(
        texts.get(k.title()).to_owned(),
        texts.get(k.description()).to_owned(),
        &href(NavTarget::Section(k), texts.locale, texts.docs),
    )
}

pub fn content_meta(name: String, description: String, path: &LocalPath) -> Meta {
    Meta {
        name,
        description,
        canonical: path.url(),
    }
}

/// A listing page's meta: its title and description for `count` entries, at `path`.
fn listing_meta(
    texts: &Texts,
    title: fn(usize) -> Phrase<'static>,
    description: fn(usize) -> Phrase<'static>,
    count: usize,
    path: SitePath,
) -> Meta {
    content_meta(
        texts.say(title(count)),
        fit(&texts.say(description(count)), &[], &[], DESCRIPTION_MAX),
        &path.in_locale(texts.locale),
    )
}

pub fn index_meta(p: &IndexPage, texts: &Texts) -> Meta {
    listing_meta(
        texts,
        Phrase::maps_index_title,
        Phrase::maps_index_description,
        p.all.len(),
        NOTE_MAPS,
    )
}

pub fn drum_maps_meta(p: &IndexPage, texts: &Texts) -> Meta {
    listing_meta(
        texts,
        Phrase::drum_maps_title,
        Phrase::drum_maps_description,
        p.all.len(),
        DRUM_MAPS,
    )
}
