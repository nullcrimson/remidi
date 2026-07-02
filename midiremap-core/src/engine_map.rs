use std::collections::{HashMap, HashSet};

use serde::Deserialize;

use crate::canon::Canon;

pub trait Decoder {
    fn decode(&self, note: u8) -> Option<Canon>;
}

pub trait Encoder {
    fn encode(&self, canon: Canon) -> Option<u8>;
}

#[derive(Deserialize)]
struct RawEntry {
    note: u16,
    canon: Canon,
    #[serde(default)]
    primary: bool,
}

#[derive(Deserialize)]
struct RawMap {
    id: String,
    name: String,
    notes: Vec<RawEntry>,
}

#[derive(Debug)]
pub struct EngineMap {
    pub id: String,
    pub name: String,
    to_canon: HashMap<u8, Canon>,
    from_canon: HashMap<Canon, u8>,
}

impl Decoder for EngineMap {
    fn decode(&self, note: u8) -> Option<Canon> {
        self.to_canon.get(&note).copied()
    }
}

impl Encoder for EngineMap {
    fn encode(&self, canon: Canon) -> Option<u8> {
        self.from_canon.get(&canon).copied()
    }
}

pub struct Drum {
    pub note: u8,
    pub canon: Canon,
    pub label: String,
    pub family: &'static str,
}

impl EngineMap {
    pub fn drums(&self) -> Vec<Drum> {
        let mut out: Vec<Drum> = self
            .from_canon
            .iter()
            .map(|(&canon, &note)| Drum {
                note,
                canon,
                label: canon.label(),
                family: canon.family(),
            })
            .collect();
        out.sort_by_key(|d| d.note);
        out
    }

    pub fn source_notes(&self) -> Vec<Drum> {
        let mut out: Vec<Drum> = self
            .to_canon
            .iter()
            .map(|(&note, &canon)| Drum {
                note,
                canon,
                label: canon.label(),
                family: canon.family(),
            })
            .collect();
        out.sort_by_key(|d| d.note);
        out
    }
}

#[derive(thiserror::Error, Debug, PartialEq)]
pub enum MapError {
    #[error("note {0} out of range 0..=127")]
    NoteOutOfRange(u16),
    #[error("duplicate primary for {0:?}")]
    DuplicatePrimary(Canon),
    #[error("parse error: {0}")]
    Parse(String),
}

fn build(raw: RawMap) -> Result<EngineMap, MapError> {
    let mut to_canon = HashMap::new();
    let mut from_canon: HashMap<Canon, u8> = HashMap::new();
    let mut primaries: HashSet<Canon> = HashSet::new();

    for e in raw.notes {
        let note = u8::try_from(e.note)
            .ok()
            .filter(|n| *n <= 127)
            .ok_or(MapError::NoteOutOfRange(e.note))?;
        to_canon.insert(note, e.canon);

        if e.primary {
            if !primaries.insert(e.canon) {
                return Err(MapError::DuplicatePrimary(e.canon));
            }
            from_canon.insert(e.canon, note);
        } else {
            from_canon.entry(e.canon).or_insert(note);
        }
    }

    Ok(EngineMap {
        id: raw.id,
        name: raw.name,
        to_canon,
        from_canon,
    })
}

pub fn from_toml(s: &str) -> Result<EngineMap, MapError> {
    let raw: RawMap = toml::from_str(s).map_err(|e| MapError::Parse(e.to_string()))?;
    build(raw)
}

pub fn from_json(s: &str) -> Result<EngineMap, MapError> {
    let raw: RawMap = serde_json::from_str(s).map_err(|e| MapError::Parse(e.to_string()))?;
    build(raw)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::{KickKind, SnareArtic};

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
        assert_eq!(m.decode(24), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(m.decode(23), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(m.decode(26), Some(Canon::Snare(1, SnareArtic::Hit)));
        assert_eq!(m.decode(99), None);
    }

    #[test]
    fn encode_uses_primary_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.encode(Canon::Kick(KickKind::Main)), Some(24));
        assert_eq!(m.encode(Canon::Snare(1, SnareArtic::Hit)), Some(26));
    }

    #[test]
    fn drums_lists_encodable_pieces_sorted_by_note() {
        let m = from_toml(SAMPLE).unwrap();
        let d = m.drums();
        assert_eq!(d.len(), 2);
        assert_eq!(d[0].note, 24);
        assert_eq!(d[0].label, "Kick");
        assert_eq!(d[0].family, "Kick");
        assert_eq!(d[1].note, 26);
        assert_eq!(d[1].family, "Snare");
    }

    #[test]
    fn source_notes_lists_every_decodable_note_sorted() {
        let m = from_toml(SAMPLE).unwrap();
        let notes = m.source_notes();
        assert_eq!(
            notes.iter().map(|d| d.note).collect::<Vec<_>>(),
            vec![23, 24, 26]
        );
        assert_eq!(notes[0].canon, Canon::Kick(KickKind::Main));
        assert_eq!(notes[2].canon, Canon::Snare(1, SnareArtic::Hit));
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
            Err(MapError::DuplicatePrimary(Canon::Kick(KickKind::Main)))
        ));
    }

    #[test]
    fn note_above_127_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            notes = [ { note = 200, canon = "kick.main", primary = true } ]
        "#;
        assert!(matches!(from_toml(bad), Err(MapError::NoteOutOfRange(200))));
    }
}
