use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    canon::Canon, catalog::Catalog, engine_map::EngineId, non_blank::NonBlank, note::Note,
    overrides::Overrides,
};

const PRESET_FORMAT: &str = "drumverter-preset";
const PRESET_VERSION: u64 = 1;

/// A preset's name: text that is not blank, its spacing kept.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(transparent)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(type = r#"string & { readonly __brand: "PresetName" }"#)
)]
pub struct PresetName(NonBlank);

impl PresetName {
    pub fn as_str(&self) -> &str {
        self.0.as_str()
    }
}

/// A named set of note edits for one engine pair, as the web app saves and exports it, its
/// engines resolved to the catalog's current ids.
#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct SavedPreset {
    pub name: PresetName,
    pub src: EngineId,
    pub tgt: EngineId,
    #[serde(flatten)]
    pub overrides: Overrides,
}

/// A parsed preset and the edits it had to skip.
#[derive(Serialize, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct LoadedPreset {
    #[serde(flatten)]
    pub preset: SavedPreset,
    pub skipped: Vec<SkippedEdit>,
}

/// An edit a preset file holds but this build cannot read; the rest of the preset still
/// loads.
#[derive(thiserror::Error, Serialize, Debug, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum SkippedEdit {
    /// A drum edit whose key is no drum.
    #[error("unknown drum '{key}'")]
    UnknownDrum { key: String },
    /// A drum edit whose value is no note.
    #[error("{key}: not a note ({value})")]
    NotANote { key: String, value: String },
    /// A source edit whose key is no note.
    #[error("{key}: not a note")]
    NotASourceNote { key: String },
    /// A source edit whose value is no drum.
    #[error("{note}: not a drum ({value})")]
    NotADrum { note: Note, value: String },
}

#[derive(thiserror::Error, Debug)]
pub enum PresetError {
    #[error("not a preset file")]
    Parse(#[source] serde_json::Error),
    #[error("not a preset (format is '{0}')")]
    Format(String),
    #[error("preset version {0} is not supported")]
    Version(u64),
    #[error("unknown source engine '{0}'")]
    UnknownSource(String),
    #[error("unknown target engine '{0}'")]
    UnknownTarget(String),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPreset {
    format: String,
    version: u64,
    name: PresetName,
    src: NonBlank,
    tgt: NonBlank,
    #[serde(default)]
    edits: BTreeMap<String, Value>,
    #[serde(default)]
    src_edits: BTreeMap<String, Value>,
}

/// Reads a preset file, its engines resolved through `catalog`; an edit it cannot read is
/// skipped and listed, never fatal.
pub fn parse_preset(json: &str, catalog: &Catalog) -> Result<LoadedPreset, PresetError> {
    let raw: RawPreset = serde_json::from_str(json).map_err(PresetError::Parse)?;
    if raw.format != PRESET_FORMAT {
        return Err(PresetError::Format(raw.format));
    }
    if raw.version != PRESET_VERSION {
        return Err(PresetError::Version(raw.version));
    }
    let engine = |id: NonBlank, unknown: fn(String) -> PresetError| {
        catalog
            .canonical_id(id.as_str())
            .map(EngineId::new)
            .ok_or_else(|| unknown(id.into()))
    };
    let src = engine(raw.src, PresetError::UnknownSource)?;
    let tgt = engine(raw.tgt, PresetError::UnknownTarget)?;
    let mut skipped = Vec::new();
    let mut edits = BTreeMap::new();
    for (key, value) in raw.edits {
        match (key.parse::<Canon>(), Note::deserialize(&value)) {
            (Err(_), _) => skipped.push(SkippedEdit::UnknownDrum { key }),
            (Ok(_), Err(_)) => skipped.push(SkippedEdit::NotANote {
                key,
                value: value.to_string(),
            }),
            (Ok(canon), Ok(note)) => {
                edits.insert(canon, note);
            }
        }
    }
    let mut src_edits = BTreeMap::new();
    for (key, value) in raw.src_edits {
        let Ok(note) = key.parse::<Note>() else {
            skipped.push(SkippedEdit::NotASourceNote { key });
            continue;
        };
        match Option::<Canon>::deserialize(&value) {
            Ok(canon) => {
                src_edits.insert(note, canon);
            }
            Err(_) => skipped.push(SkippedEdit::NotADrum {
                note,
                value: value.to_string(),
            }),
        }
    }
    Ok(LoadedPreset {
        preset: SavedPreset {
            name: raw.name,
            src,
            tgt,
            overrides: Overrides::new(edits, src_edits),
        },
        skipped,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::note::n;

    const FIXTURE: &str = include_str!("../tests/golden/my-kit.drumverter.json");

    fn catalog() -> &'static Catalog {
        Catalog::shared()
    }

    #[test]
    fn resolves_an_engine_alias_to_its_id() {
        let catalog = Catalog::builtin()
            .with_user_json(
                r#"{"id":"custom","name":"Custom","aliases":["old_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#,
            )
            .unwrap();
        let json = FIXTURE.replace("ggd_invasion", "old_kit");
        let p = parse_preset(&json, &catalog).unwrap().preset;
        assert_eq!(p.src.as_str(), "custom");
    }

    #[test]
    fn names_an_unknown_target_engine() {
        let json = FIXTURE.replace("ezdrummer", "gone_engine");
        assert!(matches!(
            parse_preset(&json, catalog()),
            Err(PresetError::UnknownTarget(id)) if id == "gone_engine"
        ));
    }

    #[test]
    fn serializes_as_the_app_reads_it() {
        let loaded = parse_preset(
            &FIXTURE.replace("\"kick.main\": 35", "\"bogus.drum\": 35"),
            catalog(),
        )
        .unwrap();
        assert_eq!(
            serde_json::to_value(&loaded).unwrap(),
            serde_json::json!({
                "name": "My kit",
                "src": "ggd_invasion",
                "tgt": "ezdrummer",
                "edits": { "china.1.hit": 52 },
                "srcEdits": { "24": "snare1.hit", "60": null },
                "skipped": [{ "kind": "unknownDrum", "key": "bogus.drum" }],
            })
        );
    }

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    fn with(edits: &str, src_edits: &str) -> String {
        format!(
            r#"{{"format":"drumverter-preset","version":1,"name":"N","src":"ggd_invasion","tgt":"ezdrummer","edits":{edits},"srcEdits":{src_edits}}}"#
        )
    }

    #[test]
    fn reads_the_file_the_app_exports() {
        let loaded = parse_preset(FIXTURE, catalog()).unwrap();
        assert!(loaded.skipped.is_empty());
        let p = loaded.preset;
        assert_eq!(
            (p.name.as_str(), p.src.as_str(), p.tgt.as_str()),
            ("My kit", "ggd_invasion", "ezdrummer")
        );
        assert_eq!(
            p.overrides.target(),
            &BTreeMap::from([(k("kick.main"), n(35)), (k("china.1.hit"), n(52))])
        );
        assert_eq!(
            p.overrides.source(),
            &BTreeMap::from([(n(24), Some(k("snare1.hit"))), (n(60), None)])
        );
    }

    #[test]
    fn turns_into_target_overrides() {
        let ov = parse_preset(FIXTURE, catalog()).unwrap().preset.overrides;
        assert_eq!(
            ov.target(),
            &BTreeMap::from([(k("kick.main"), n(35)), (k("china.1.hit"), n(52))])
        );
    }

    #[test]
    fn turns_into_source_overrides() {
        let ov = parse_preset(FIXTURE, catalog()).unwrap().preset.overrides;
        assert_eq!(
            ov.source(),
            &BTreeMap::from([(n(24), Some(k("snare1.hit"))), (n(60), None)])
        );
    }

    #[test]
    fn edits_default_to_empty() {
        let p = parse_preset(
            r#"{"format":"drumverter-preset","version":1,"name":"N","src":"ggd_invasion","tgt":"ezdrummer"}"#,
            catalog(),
        )
        .unwrap()
        .preset;
        assert_eq!(p.overrides, Overrides::default());
    }

    #[test]
    fn a_file_without_the_preset_fields_is_not_a_preset() {
        assert!(matches!(
            parse_preset(r#"{"name":"N"}"#, catalog()),
            Err(PresetError::Parse(_))
        ));
    }

    #[test]
    fn another_format_is_rejected_by_name() {
        assert!(matches!(
            parse_preset(
                r#"{"format":"other","version":1,"name":"N","src":"ggd_invasion","tgt":"ezdrummer"}"#,
                catalog()
            ),
            Err(PresetError::Format(f)) if f == "other"
        ));
    }

    #[test]
    fn a_newer_version_is_rejected() {
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":2,"name":"N","src":"ggd_invasion","tgt":"ezdrummer"}"#,
                catalog()
            ),
            Err(PresetError::Version(2))
        ));
    }

    #[test]
    fn a_blank_name_is_rejected() {
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":1,"name":" ","src":"ggd_invasion","tgt":"ezdrummer"}"#,
                catalog()
            ),
            Err(PresetError::Parse(_))
        ));
    }

    #[test]
    fn an_unreadable_file_keeps_the_parse_cause() {
        let err = parse_preset("nope", catalog()).unwrap_err();
        assert_eq!(err.to_string(), "not a preset file");
        assert!(std::error::Error::source(&err).is_some());
    }

    #[test]
    fn keeps_only_the_target_edits_it_can_read() {
        let loaded = load_with_unreadable_edits();
        assert_eq!(
            loaded.preset.overrides.target(),
            &BTreeMap::from([(k("kick.main"), n(35))])
        );
    }

    #[test]
    fn keeps_only_the_source_edits_it_can_read() {
        let loaded = load_with_unreadable_edits();
        assert_eq!(
            loaded.preset.overrides.source(),
            &BTreeMap::from([(n(24), Some(k("snare1.hit")))])
        );
    }

    fn load_with_unreadable_edits() -> LoadedPreset {
        parse_preset(
            &with(
                r#"{"kick.main":35,"bogus.drum":40,"snare1.hit":200,"hat.closed":"x"}"#,
                r#"{"24":"snare1.hit","999":"kick.main","25":"nope.drum","26":7}"#,
            ),
            catalog(),
        )
        .unwrap()
    }

    #[test]
    fn names_the_edits_it_skips() {
        let loaded = load_with_unreadable_edits();
        let skipped: Vec<String> = loaded.skipped.iter().map(ToString::to_string).collect();
        assert_eq!(
            skipped,
            [
                "unknown drum 'bogus.drum'",
                "hat.closed: not a note (\"x\")",
                "snare1.hit: not a note (200)",
                "25: not a drum (\"nope.drum\")",
                "26: not a drum (7)",
                "999: not a note",
            ]
        );
    }

    #[test]
    fn accepts_a_drum_key_alias() {
        let p = parse_preset(&with(r#"{"ride.1.bow":51}"#, "{}"), catalog())
            .unwrap()
            .preset;
        assert_eq!(
            p.overrides.target(),
            &BTreeMap::from([(k("ride.1"), n(51))])
        );
    }
}
