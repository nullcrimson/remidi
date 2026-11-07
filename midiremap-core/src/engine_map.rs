use std::{
    collections::{HashMap, HashSet},
    sync::LazyLock,
};

use serde::{Deserialize, Serialize};

use crate::{
    canon::{Canon, CanonEntry, OpenLevel},
    non_blank::NonBlank,
    note::Note,
    open_levels::OpenLevels,
    resolution::{self, MissingDrums, Outcome},
};

/// The note General MIDI plays its open hi-hat on; the open hi-hat an engine plays there is the
/// one its vendor means as the normal open hat.
const GM_OPEN_HAT: Note = Note::ALL[46];

#[derive(Deserialize)]
struct RawEntry {
    note: Note,
    canon: Canon,
    #[serde(default)]
    primary: bool,
}

#[derive(Deserialize)]
struct RawMap {
    id: String,
    name: String,
    #[serde(default)]
    short_name: Option<NonBlank>,
    #[serde(default)]
    vendor: Option<NonBlank>,
    #[serde(default)]
    aliases: Vec<String>,
    #[serde(default)]
    variant: Option<RawVariant>,
    #[serde(default)]
    grooves_from: Option<Note>,
    #[serde(default)]
    open_hat_level: Option<OpenLevel>,
    notes: Vec<RawEntry>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawVariant {
    of: String,
}

/// What makes an engine another mapping of a base engine: the base's id and how the mapping
/// differs, such as `Mapping 'GM'`.
#[derive(Debug)]
pub(crate) struct Variant {
    of: String,
    label: String,
}

impl Variant {
    /// The id of the engine this one is another mapping of.
    pub(crate) fn of(&self) -> &str {
        &self.of
    }

    /// How the mapping differs from the base engine's, such as `Mapping 'GM'`.
    pub(crate) fn label(&self) -> &str {
        &self.label
    }
}

/// An engine's id, as the catalog names it.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(transparent)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(type = r#"string & { readonly __brand: "EngineId" }"#)
)]
pub struct EngineId(String);

impl EngineId {
    pub(crate) fn new(id: &str) -> Self {
        Self(id.to_owned())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<&EngineMap> for EngineId {
    fn from(engine: &EngineMap) -> Self {
        Self::new(engine.id())
    }
}

/// One engine's note layout: which drum each note plays, and which note plays each drum.
#[derive(Debug)]
pub struct EngineMap {
    id: String,
    name: String,
    short_name: Option<NonBlank>,
    vendor: Option<NonBlank>,
    aliases: Vec<String>,
    variant: Option<Variant>,
    grooves_from: Option<Note>,
    open_levels: Option<OpenLevels>,
    to_canon: HashMap<Note, Canon>,
    from_canon: HashMap<Canon, Note>,
}

#[derive(Serialize)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Drum {
    pub note: Note,
    #[serde(flatten)]
    pub entry: CanonEntry,
}

impl Drum {
    /// The drum `canon` on `note`.
    pub fn new(note: Note, canon: Canon) -> Self {
        Self {
            note,
            entry: canon.into(),
        }
    }
}

impl EngineMap {
    /// The core drums as a kit of their own: each on its own note, its one open hi-hat its
    /// normal open hat.
    pub fn core_kit() -> &'static Self {
        static KIT: LazyLock<EngineMap> = LazyLock::new(|| {
            let notes = Note::ALL.into_iter().zip(Canon::CORE_KIT);
            build(RawMap {
                id: "core".to_owned(),
                name: "core".to_owned(),
                short_name: None,
                vendor: None,
                aliases: Vec::new(),
                variant: None,
                grooves_from: None,
                open_hat_level: Canon::CORE_KIT
                    .iter()
                    .find_map(|c| c.opening())
                    .map(|(level, _)| level),
                notes: notes
                    .map(|(note, canon)| RawEntry {
                        note,
                        canon,
                        primary: true,
                    })
                    .collect(),
            })
            .expect("the core kit plays each core drum once")
        });
        &KIT
    }

    /// Reads a user map in the same shape as the builtin `engines/*.toml`, as JSON.
    pub fn from_json(s: &str) -> Result<Self, MapError> {
        build(serde_json::from_str(s).map_err(MapError::Parse)?)
    }

    /// The stable id presets and links use, such as `ezdrummer`.
    pub fn id(&self) -> &str {
        &self.id
    }

    /// The engine's full name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// The drum a source note plays.
    pub fn decode(&self, note: Note) -> Option<Canon> {
        self.to_canon.get(&note).copied()
    }

    /// The note that plays a drum on this engine.
    pub fn encode(&self, canon: Canon) -> Option<Note> {
        self.from_canon.get(&canon).copied()
    }

    /// Where a drum lands on this engine with no edits: what the converter writes for it.
    pub fn resolve(&self, canon: Canon, missing: MissingDrums) -> Outcome {
        resolution::resolve(canon, &self.from_canon, missing)
    }

    pub(crate) fn decodings(&self) -> impl Iterator<Item = (Note, Canon)> + '_ {
        self.to_canon.iter().map(|(&note, &canon)| (note, canon))
    }

    pub(crate) fn encodings(&self) -> impl Iterator<Item = (Canon, Note)> + '_ {
        self.from_canon.iter().map(|(&canon, &note)| (canon, note))
    }

    pub fn display_name(&self) -> &str {
        self.short_name
            .as_ref()
            .map_or(&self.name, NonBlank::as_str)
    }

    /// Who makes the engine, when the map says so.
    pub fn vendor(&self) -> Option<&str> {
        self.vendor.as_ref().map(NonBlank::as_str)
    }

    /// The first note that starts the engine's own grooves instead of a drum, when it has
    /// such keys.
    pub fn grooves_from(&self) -> Option<Note> {
        self.grooves_from
    }

    /// Former ids that still find this engine.
    pub(crate) fn aliases(&self) -> &[String] {
        &self.aliases
    }

    /// How far the main hi-hat opens, when the engine names its normal open hat.
    pub(crate) fn open_levels(&self) -> Option<&OpenLevels> {
        self.open_levels.as_ref()
    }

    /// What makes this engine another mapping of a base engine, when it is one.
    pub(crate) fn variant(&self) -> Option<&Variant> {
        self.variant.as_ref()
    }

    pub fn drums(&self) -> Vec<Drum> {
        listing(self.encodings().map(|(canon, note)| (note, canon)))
    }

    pub fn source_notes(&self) -> Vec<Drum> {
        listing(self.decodings())
    }
}

fn listing(pairs: impl Iterator<Item = (Note, Canon)>) -> Vec<Drum> {
    let mut out: Vec<Drum> = pairs.map(|(note, canon)| Drum::new(note, canon)).collect();
    out.sort_by_key(|d| d.note);
    out
}

#[derive(thiserror::Error, Debug)]
pub enum MapError {
    #[error("duplicate primary for {0:?}")]
    DuplicatePrimary(Canon),
    #[error("engine {engine} lists note {note} twice")]
    DuplicateNote { engine: String, note: Note },
    #[error("engine {engine} plays a drum on {note}, where its grooves start")]
    DrumAtGrooveKey { engine: String, note: Note },
    #[error("parse error")]
    Parse(#[source] serde_json::Error),
    #[error("alias {0} is already an engine id or another engine's alias")]
    AliasCollision(String),
    #[error("{variant} is a variant of {of}, which is no engine")]
    UnknownVariantBase { variant: String, of: String },
    #[error("{0} is a variant of an engine that is itself a variant")]
    VariantOfVariant(String),
    #[error("{0} is a variant, but its name ends on no label in parentheses")]
    UnlabelledVariant(String),
    #[error("engine {engine} names {open_hat} its open hi-hat, but plays no such hi-hat")]
    OpenHatLevelNotPlayed { engine: String, open_hat: Canon },
    #[error(
        "engine {engine} names {open_hat} its open hi-hat, which its note {} already says",
        GM_OPEN_HAT
    )]
    OpenHatLevelRedundant { engine: String, open_hat: Canon },
}

/// The text in the parentheses that end `name`, such as `Mapping 'GM'` in
/// `GGD Invasion (Mapping 'GM')`.
fn trailing_label(name: &str) -> Option<&str> {
    name.strip_suffix(')')
        .and_then(|rest| rest.rsplit_once('('))
        .map(|(_, label)| label.trim())
        .filter(|label| !label.is_empty())
}

fn variant(raw: Option<RawVariant>, id: &str, name: &str) -> Result<Option<Variant>, MapError> {
    raw.map(|RawVariant { of }| {
        trailing_label(name)
            .map(|label| Variant {
                of,
                label: label.to_owned(),
            })
            .ok_or_else(|| MapError::UnlabelledVariant(id.to_owned()))
    })
    .transpose()
}

fn build(raw: RawMap) -> Result<EngineMap, MapError> {
    let variant = variant(raw.variant, &raw.id, &raw.name)?;
    let mut to_canon = HashMap::new();
    let mut from_canon: HashMap<Canon, Note> = HashMap::new();
    let mut primaries: HashSet<Canon> = HashSet::new();

    for e in raw.notes {
        let note = e.note;
        if raw.grooves_from.is_some_and(|from| note >= from) {
            return Err(MapError::DrumAtGrooveKey {
                engine: raw.id,
                note,
            });
        }
        if to_canon.insert(note, e.canon).is_some() {
            return Err(MapError::DuplicateNote {
                engine: raw.id,
                note,
            });
        }

        if e.primary {
            if !primaries.insert(e.canon) {
                return Err(MapError::DuplicatePrimary(e.canon));
            }
            from_canon.insert(e.canon, note);
        } else {
            from_canon.entry(e.canon).or_insert(note);
        }
    }

    let open_levels = open_levels(&raw.id, raw.open_hat_level, &to_canon)?;
    Ok(EngineMap {
        id: raw.id,
        name: raw.name,
        short_name: raw.short_name,
        vendor: raw.vendor,
        aliases: raw.aliases,
        variant,
        grooves_from: raw.grooves_from,
        open_levels,
        to_canon,
        from_canon,
    })
}

/// The main hi-hat's open levels, the normal open hat the `declared` level or else the one on
/// [`GM_OPEN_HAT`]; `None` when neither names one.
fn open_levels(
    engine: &str,
    declared: Option<OpenLevel>,
    to_canon: &HashMap<Note, Canon>,
) -> Result<Option<OpenLevels>, MapError> {
    let on_gm_open_hat = to_canon
        .get(&GM_OPEN_HAT)
        .and_then(|c| c.opening())
        .map(|(level, _)| level);
    let main = match (declared, on_gm_open_hat) {
        (Some(level), Some(evident)) if level == evident => {
            return Err(MapError::OpenHatLevelRedundant {
                engine: engine.to_owned(),
                open_hat: Canon::open_main_hat(level),
            })
        }
        (Some(level), _) | (None, Some(level)) => level,
        (None, None) => return Ok(None),
    };
    OpenLevels::new(to_canon.values().filter_map(|c| c.opening()), main)
        .map(Some)
        .ok_or_else(|| MapError::OpenHatLevelNotPlayed {
            engine: engine.to_owned(),
            open_hat: Canon::open_main_hat(main),
        })
}

#[cfg(test)]
pub(crate) fn from_toml(s: &str) -> Result<EngineMap, MapError> {
    let value: serde_json::Value = toml::from_str(s).expect("test map is valid TOML");
    build(serde_json::from_value(value).map_err(MapError::Parse)?)
}

pub(crate) fn many_from_json(s: &str) -> Result<Vec<EngineMap>, MapError> {
    let raws: Vec<RawMap> = serde_json::from_str(s).map_err(MapError::Parse)?;
    raws.into_iter().map(build).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{canon::k, family::Family, note::n};

    const SAMPLE: &str = r#"
        id = "demo"
        name = "Demo Kit"
        notes = [
          { note = 24, canon = "kick.main", primary = true },
          { note = 23, canon = "kick.main" },
          { note = 26, canon = "snare1.hit", primary = true },
        ]
    "#;

    #[test]
    fn decodes_every_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.decode(n(24)), Some(k("kick.main")));
        assert_eq!(m.decode(n(23)), Some(k("kick.main")));
        assert_eq!(m.decode(n(26)), Some(k("snare1.hit")));
    }

    #[test]
    fn an_unlisted_note_decodes_to_none() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.decode(n(99)), None);
    }

    #[test]
    fn encode_uses_primary_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.encode(k("kick.main")), Some(n(24)));
        assert_eq!(m.encode(k("snare1.hit")), Some(n(26)));
    }

    #[test]
    fn drums_lists_encodable_pieces_sorted_by_note() {
        let m = from_toml(SAMPLE).unwrap();
        let d = m.drums();
        assert_eq!(d.len(), 2);
        assert_eq!(d[0].note, n(24));
        assert_eq!(d[0].entry.label(), "Kick");
        assert_eq!(d[0].entry.family(), Family::Kick);
        assert_eq!(d[1].note, n(26));
        assert_eq!(d[1].entry.family(), Family::Snare);
    }

    #[test]
    fn a_drum_serializes_its_note_canon_label_and_family() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(
            serde_json::to_value(&m.drums()[0]).unwrap(),
            serde_json::json!({ "note": 24, "canon": "kick.main", "label": "Kick", "family": "Kick" })
        );
    }

    #[test]
    fn source_notes_lists_every_decodable_note_sorted() {
        let m = from_toml(SAMPLE).unwrap();
        let notes = m.source_notes();
        assert_eq!(
            notes.iter().map(|d| d.note).collect::<Vec<_>>(),
            vec![n(23), n(24), n(26)]
        );
        assert_eq!(notes[0].entry.canon(), k("kick.main"));
        assert_eq!(notes[2].entry.canon(), k("snare1.hit"));
    }

    #[test]
    fn display_name_falls_back_to_name() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.display_name(), "Demo Kit");
    }

    #[test]
    fn display_name_prefers_short_name() {
        let m = with_short_name();
        assert_eq!(m.display_name(), "Short");
    }

    #[test]
    fn a_short_name_leaves_the_name_unchanged() {
        let m = with_short_name();
        assert_eq!(m.name(), "Very Long Official Name");
    }

    fn with_short_name() -> EngineMap {
        from_toml(
            r#"
            id = "x"
            name = "Very Long Official Name"
            short_name = "Short"
            notes = [ { note = 36, canon = "kick.main", primary = true } ]
        "#,
        )
        .unwrap()
    }

    #[test]
    fn blank_short_name_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            short_name = "  "
            notes = [ { note = 36, canon = "kick.main", primary = true } ]
        "#;
        assert!(matches!(from_toml(bad), Err(MapError::Parse(_))));
    }

    #[test]
    fn vendor_is_optional() {
        assert_eq!(from_toml(SAMPLE).unwrap().vendor(), None);
    }

    #[test]
    fn vendor_is_read_when_given() {
        let m = from_toml(
            r#"
            id = "x"
            name = "X"
            vendor = "Acme"
            notes = [ { note = 36, canon = "kick.main", primary = true } ]
        "#,
        )
        .unwrap();
        assert_eq!(m.vendor(), Some("Acme"));
    }

    #[test]
    fn blank_vendor_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            vendor = " "
            notes = [ { note = 36, canon = "kick.main", primary = true } ]
        "#;
        assert!(matches!(from_toml(bad), Err(MapError::Parse(_))));
    }

    fn hats(open_hat_level: Option<u8>, on_46: &str) -> Result<EngineMap, MapError> {
        let declared = open_hat_level.map_or(String::new(), |l| format!("open_hat_level = {l}"));
        from_toml(&format!(
            r#"
            id = "hats"
            name = "Hats"
            {declared}
            notes = [
              {{ note = 45, canon = "hat.open1", primary = true }},
              {{ note = 46, canon = "{on_46}", primary = true }},
              {{ note = 47, canon = "hat.open3", primary = true }},
            ]
            "#
        ))
    }

    fn main_level(m: &EngineMap) -> Option<u8> {
        m.open_levels().map(|l| l.main().get())
    }

    #[test]
    fn the_open_hat_on_the_general_midi_open_hat_note_is_the_main_one() {
        assert_eq!(main_level(&hats(None, "hat.open2").unwrap()), Some(2));
        assert_eq!(main_level(&hats(None, "hat.open2.edge").unwrap()), Some(2));
    }

    #[test]
    fn a_declared_open_hat_level_is_the_main_one() {
        assert_eq!(main_level(&hats(Some(3), "hat.open2").unwrap()), Some(3));
        assert_eq!(main_level(&hats(Some(3), "hat.cc").unwrap()), Some(3));
    }

    #[test]
    fn an_engine_without_an_open_main_hat_on_46_or_a_declaration_has_no_main_one() {
        assert_eq!(main_level(&hats(None, "hat.cc").unwrap()), None);
        assert_eq!(main_level(&hats(None, "hat.loose").unwrap()), None);
        assert_eq!(main_level(&hats(None, "aux1.open2").unwrap()), None);
        assert_eq!(main_level(&hats(None, "tom.rack1.hit").unwrap()), None);
    }

    #[test]
    fn a_declared_open_hat_level_the_engine_does_not_play_is_an_error() {
        assert!(matches!(
            hats(Some(4), "hat.cc"),
            Err(MapError::OpenHatLevelNotPlayed { open_hat, .. }) if open_hat == k("hat.open4")
        ));
    }

    #[test]
    fn declaring_the_level_note_46_already_gives_is_an_error() {
        assert!(matches!(
            hats(Some(2), "hat.open2"),
            Err(MapError::OpenHatLevelRedundant { open_hat, .. }) if open_hat == k("hat.open2")
        ));
    }

    #[test]
    fn an_open_hat_level_past_six_does_not_parse() {
        assert!(matches!(hats(Some(7), "hat.cc"), Err(MapError::Parse(_))));
    }

    #[test]
    fn duplicate_primary_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            notes = [
              { note = 24, canon = "kick.main", primary = true },
              { note = 23, canon = "kick.main", primary = true },
            ]
        "#;
        assert!(matches!(
            from_toml(bad),
            Err(MapError::DuplicatePrimary(c)) if c == k("kick.main")
        ));
    }

    #[test]
    fn a_note_listed_twice_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            notes = [
              { note = 36, canon = "kick.main", primary = true },
              { note = 36, canon = "snare1.hit", primary = true },
            ]
        "#;
        let err = from_toml(bad).unwrap_err();
        assert!(matches!(
            &err,
            MapError::DuplicateNote { engine, note } if engine == "x" && *note == n(36)
        ));
        assert_eq!(err.to_string(), "engine x lists note 36 twice");
    }

    fn grooving(grooves_from: &str, drum_note: u8) -> Result<EngineMap, MapError> {
        from_toml(&format!(
            r#"
            id = "x"
            name = "X"
            {grooves_from}
            notes = [{{ note = {drum_note}, canon = "kick.main", primary = true }}]
            "#
        ))
    }

    #[test]
    fn an_engine_names_the_note_its_grooves_start_on() {
        let map = grooving("grooves_from = 60", 36).unwrap();
        assert_eq!(map.grooves_from(), Some(n(60)));
    }

    #[test]
    fn an_engine_without_groove_keys_has_none() {
        assert_eq!(grooving("", 36).unwrap().grooves_from(), None);
    }

    #[test]
    fn a_drum_on_a_groove_key_is_error() {
        let err = grooving("grooves_from = 60", 60).unwrap_err();
        assert!(matches!(
            &err,
            MapError::DrumAtGrooveKey { engine, note } if engine == "x" && *note == n(60)
        ));
        assert_eq!(
            err.to_string(),
            "engine x plays a drum on 60, where its grooves start"
        );
    }

    fn variant_named(name: &str) -> Result<EngineMap, MapError> {
        from_toml(&format!(
            r#"
            id = "x_gm"
            name = "{name}"
            variant = {{ of = "x" }}
            notes = [ {{ note = 36, canon = "kick.main", primary = true }} ]
        "#
        ))
    }

    #[test]
    fn a_variants_label_is_the_parentheses_ending_its_name() {
        let m = variant_named("Kit (Default) (Mapping 'GM')").unwrap();
        assert_eq!(m.variant().map(Variant::label), Some("Mapping 'GM'"));
    }

    #[test]
    fn a_variant_whose_name_ends_on_no_parentheses_is_an_error() {
        assert!(matches!(
            variant_named("Kit GM"),
            Err(MapError::UnlabelledVariant(id)) if id == "x_gm"
        ));
    }

    #[test]
    fn a_variant_whose_name_ends_on_empty_parentheses_is_an_error() {
        assert!(matches!(
            variant_named("Kit ( )"),
            Err(MapError::UnlabelledVariant(_))
        ));
    }

    #[test]
    fn a_variant_may_not_state_its_label_apart_from_its_name() {
        let bad = r#"
            id = "x_gm"
            name = "Kit (Mapping 'GM')"
            variant = { of = "x", label = "Mapping 'GM'" }
            notes = [ { note = 36, canon = "kick.main", primary = true } ]
        "#;
        assert!(matches!(from_toml(bad), Err(MapError::Parse(_))));
    }

    #[test]
    fn an_engine_that_is_no_variant_has_no_label() {
        assert!(from_toml(SAMPLE).unwrap().variant().is_none());
    }

    #[test]
    fn from_json_reads_a_map() {
        let m = EngineMap::from_json(
            r#"{"id":"j","name":"J","notes":[{"note":36,"canon":"kick.main","primary":true}]}"#,
        )
        .unwrap();
        assert_eq!((m.id(), m.name()), ("j", "J"));
    }

    #[test]
    fn from_json_keeps_the_parse_cause() {
        let err = EngineMap::from_json("{").unwrap_err();
        assert_eq!(err.to_string(), "parse error");
        assert!(std::error::Error::source(&err).is_some());
    }
}
