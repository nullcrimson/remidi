use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    canon::Canon,
    non_blank::NonBlank,
    note::Note,
    overrides::{CanonNote, Overrides, SrcNote},
};

const PRESET_FORMAT: &str = "drumverter-preset";
const PRESET_VERSION: u64 = 1;

/// A named set of note edits for one engine pair, as the web app saves and exports it.
#[derive(Debug, PartialEq, Eq)]
pub struct SavedPreset {
    pub name: NonBlank,
    pub src: NonBlank,
    pub tgt: NonBlank,
    pub edits: BTreeMap<Canon, Note>,
    pub src_edits: BTreeMap<Note, Option<Canon>>,
}

/// A parsed preset and the edits it had to skip.
#[derive(Debug, PartialEq, Eq)]
pub struct LoadedPreset {
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
    #[error("not a Drumverter preset (format is '{0}')")]
    Format(String),
    #[error("preset version {0} is not supported by this version of Drumverter")]
    Version(u64),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPreset {
    format: String,
    version: u64,
    name: NonBlank,
    src: NonBlank,
    tgt: NonBlank,
    #[serde(default)]
    edits: BTreeMap<String, Value>,
    #[serde(default)]
    src_edits: BTreeMap<String, Value>,
}

/// Reads a preset file; an edit it cannot read is skipped and listed, never fatal.
pub fn parse_preset(json: &str) -> Result<LoadedPreset, PresetError> {
    let raw: RawPreset = serde_json::from_str(json).map_err(PresetError::Parse)?;
    if raw.format != PRESET_FORMAT {
        return Err(PresetError::Format(raw.format));
    }
    if raw.version != PRESET_VERSION {
        return Err(PresetError::Version(raw.version));
    }
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
            src: raw.src,
            tgt: raw.tgt,
            edits,
            src_edits,
        },
        skipped,
    })
}

impl SavedPreset {
    /// The preset's edits in the shape a [`crate::Mapping`] applies.
    pub fn overrides(&self) -> Overrides {
        Overrides {
            tgt: self
                .edits
                .iter()
                .map(|(&canon, &note)| CanonNote { canon, note })
                .collect(),
            src: self
                .src_edits
                .iter()
                .map(|(&note, &canon)| SrcNote { note, canon })
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::note::n;

    const FIXTURE: &str = include_str!("../../app/test/fixtures/my-kit.drumverter.json");

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    fn with(edits: &str, src_edits: &str) -> String {
        format!(
            r#"{{"format":"drumverter-preset","version":1,"name":"N","src":"a","tgt":"b","edits":{edits},"srcEdits":{src_edits}}}"#
        )
    }

    #[test]
    fn reads_the_file_the_app_exports() {
        let loaded = parse_preset(FIXTURE).unwrap();
        assert!(loaded.skipped.is_empty());
        let p = loaded.preset;
        assert_eq!(
            (p.name.as_str(), p.src.as_str(), p.tgt.as_str()),
            ("My kit", "ggd_invasion", "ezdrummer")
        );
        assert_eq!(
            p.edits,
            BTreeMap::from([(k("kick.main"), n(35)), (k("china.1.hit"), n(52))])
        );
        assert_eq!(
            p.src_edits,
            BTreeMap::from([(n(24), Some(k("snare1.hit"))), (n(60), None)])
        );
    }

    #[test]
    fn turns_into_overrides() {
        let ov = parse_preset(FIXTURE).unwrap().preset.overrides();
        let tgt: Vec<(Canon, Note)> = ov.tgt.iter().map(|e| (e.canon, e.note)).collect();
        let src: Vec<(Note, Option<Canon>)> = ov.src.iter().map(|e| (e.note, e.canon)).collect();
        assert_eq!(tgt, [(k("kick.main"), n(35)), (k("china.1.hit"), n(52))]);
        assert_eq!(src, [(n(24), Some(k("snare1.hit"))), (n(60), None)]);
    }

    #[test]
    fn edits_default_to_empty() {
        let p = parse_preset(
            r#"{"format":"drumverter-preset","version":1,"name":"N","src":"a","tgt":"b"}"#,
        )
        .unwrap()
        .preset;
        assert!(p.edits.is_empty() && p.src_edits.is_empty());
    }

    #[test]
    fn a_file_without_the_preset_fields_is_not_a_preset() {
        assert!(matches!(
            parse_preset(r#"{"name":"N"}"#),
            Err(PresetError::Parse(_))
        ));
    }

    #[test]
    fn another_format_is_rejected_by_name() {
        assert!(matches!(
            parse_preset(r#"{"format":"other","version":1,"name":"N","src":"a","tgt":"b"}"#),
            Err(PresetError::Format(f)) if f == "other"
        ));
    }

    #[test]
    fn a_newer_version_is_rejected() {
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":2,"name":"N","src":"a","tgt":"b"}"#
            ),
            Err(PresetError::Version(2))
        ));
    }

    #[test]
    fn a_blank_name_is_rejected() {
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":1,"name":" ","src":"a","tgt":"b"}"#
            ),
            Err(PresetError::Parse(_))
        ));
    }

    #[test]
    fn an_unreadable_file_keeps_the_parse_cause() {
        let err = parse_preset("nope").unwrap_err();
        assert_eq!(err.to_string(), "not a preset file");
        assert!(std::error::Error::source(&err).is_some());
    }

    #[test]
    fn skips_only_the_edits_it_cannot_read() {
        let loaded = parse_preset(&with(
            r#"{"kick.main":35,"bogus.drum":40,"snare1.hit":200,"hat.closed":"x"}"#,
            r#"{"24":"snare1.hit","999":"kick.main","25":"nope.drum","26":7}"#,
        ))
        .unwrap();
        assert_eq!(
            loaded.preset.edits,
            BTreeMap::from([(k("kick.main"), n(35))])
        );
        assert_eq!(
            loaded.preset.src_edits,
            BTreeMap::from([(n(24), Some(k("snare1.hit")))])
        );
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
        let p = parse_preset(&with(r#"{"ride.1.bow":51}"#, "{}"))
            .unwrap()
            .preset;
        assert_eq!(p.edits, BTreeMap::from([(k("ride.1"), n(51))]));
    }
}
