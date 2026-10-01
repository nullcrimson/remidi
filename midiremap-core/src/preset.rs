use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

use crate::{
    canon::Canon,
    note::Note,
    overrides::{CanonNote, Overrides, SrcNote},
};

/// The `format` tag of a preset file.
pub const PRESET_FORMAT: &str = "drumverter-preset";
/// The newest preset file version this build reads.
pub const PRESET_VERSION: u64 = 1;

/// A named set of note edits for one engine pair, as the web app saves and exports it.
#[derive(Debug, PartialEq, Eq)]
pub struct SavedPreset {
    pub name: String,
    pub src: String,
    pub tgt: String,
    pub edits: BTreeMap<Canon, Note>,
    pub src_edits: BTreeMap<Note, Option<Canon>>,
}

/// A parsed preset and the edits it had to skip, described for a person.
#[derive(Debug, PartialEq, Eq)]
pub struct LoadedPreset {
    pub preset: SavedPreset,
    pub skipped: Vec<String>,
}

#[derive(thiserror::Error, Debug)]
pub enum PresetError {
    #[error("not a preset file")]
    Parse(#[source] serde_json::Error),
    #[error("not a Drumverter preset (format is '{0}')")]
    Format(String),
    #[error("preset version {0} is not supported by this version of Drumverter")]
    Version(u64),
    #[error("preset has a blank {0}")]
    Blank(&'static str),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawPreset {
    format: String,
    version: u64,
    name: String,
    src: String,
    tgt: String,
    #[serde(default)]
    edits: BTreeMap<String, Value>,
    #[serde(default)]
    src_edits: BTreeMap<String, Value>,
}

fn non_blank(value: String, field: &'static str) -> Result<String, PresetError> {
    if value.trim().is_empty() {
        Err(PresetError::Blank(field))
    } else {
        Ok(value)
    }
}

/// Reads a preset file; an edit it cannot read is skipped and described, never fatal.
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
            (Err(_), _) => skipped.push(format!("unknown drum '{key}'")),
            (Ok(_), Err(_)) => skipped.push(format!("{key}: not a note ({value})")),
            (Ok(canon), Ok(note)) => {
                edits.insert(canon, note);
            }
        }
    }
    let mut src_edits = BTreeMap::new();
    for (key, value) in raw.src_edits {
        let Ok(note) = key.parse::<Note>() else {
            skipped.push(format!("{key}: not a note"));
            continue;
        };
        match value {
            Value::Null => {
                src_edits.insert(note, None);
            }
            Value::String(s) => match s.parse::<Canon>() {
                Ok(canon) => {
                    src_edits.insert(note, Some(canon));
                }
                Err(_) => skipped.push(format!("{key}: unknown drum '{s}'")),
            },
            other => skipped.push(format!("{key}: not a drum ({other})")),
        }
    }
    Ok(LoadedPreset {
        preset: SavedPreset {
            name: non_blank(raw.name, "name")?,
            src: non_blank(raw.src, "src")?,
            tgt: non_blank(raw.tgt, "tgt")?,
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
    fn rejects_other_files_and_versions() {
        assert!(matches!(parse_preset("nope"), Err(PresetError::Parse(_))));
        assert!(matches!(
            parse_preset(r#"{"name":"N"}"#),
            Err(PresetError::Parse(_))
        ));
        assert!(matches!(
            parse_preset(r#"{"format":"other","version":1,"name":"N","src":"a","tgt":"b"}"#),
            Err(PresetError::Format(f)) if f == "other"
        ));
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":2,"name":"N","src":"a","tgt":"b"}"#
            ),
            Err(PresetError::Version(2))
        ));
        assert!(matches!(
            parse_preset(
                r#"{"format":"drumverter-preset","version":1,"name":" ","src":"a","tgt":"b"}"#
            ),
            Err(PresetError::Blank("name"))
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
        assert_eq!(
            loaded.skipped,
            [
                "unknown drum 'bogus.drum'",
                "hat.closed: not a note (\"x\")",
                "snare1.hit: not a note (200)",
                "25: unknown drum 'nope.drum'",
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
