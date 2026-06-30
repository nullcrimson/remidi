use std::collections::HashMap;

use serde::Deserialize;

use crate::canon::Canon;

/// engine note -> canonical meaning (reading a *source* performance).
pub trait Decoder {
    fn decode(&self, note: u8) -> Option<Canon>;
}

/// canonical meaning -> engine note (writing a *target* performance).
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

/// A single engine's note layout. Implements both [`Decoder`] and [`Encoder`];
/// which direction a consumer sees is fixed by the trait it depends on.
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
    let mut primaries: HashMap<Canon, ()> = HashMap::new();

    for e in raw.notes {
        if e.note > 127 {
            return Err(MapError::NoteOutOfRange(e.note));
        }
        let note = e.note as u8;
        to_canon.insert(note, e.canon);

        if e.primary {
            if primaries.insert(e.canon, ()).is_some() {
                return Err(MapError::DuplicatePrimary(e.canon));
            }
            // primary always wins the reverse direction
            from_canon.insert(e.canon, note);
        } else {
            // first non-primary wins only if no primary has claimed the slot
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

    const SAMPLE: &str = r#"
        id = "demo"
        name = "Demo Kit"
        notes = [
          { note = 24, canon = "KickMain", primary = true },
          { note = 23, canon = "KickMain" },
          { note = 26, canon = "SnareCenter", primary = true },
        ]
    "#;

    #[test]
    fn decodes_every_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.decode(24), Some(Canon::KickMain));
        assert_eq!(m.decode(23), Some(Canon::KickMain));
        assert_eq!(m.decode(26), Some(Canon::SnareCenter));
        assert_eq!(m.decode(99), None);
    }

    #[test]
    fn encode_uses_primary_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.encode(Canon::KickMain), Some(24));
        assert_eq!(m.encode(Canon::SnareCenter), Some(26));
    }

    #[test]
    fn duplicate_primary_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            notes = [
              { note = 24, canon = "KickMain", primary = true },
              { note = 23, canon = "KickMain", primary = true },
            ]
        "#;
        assert!(matches!(
            from_toml(bad),
            Err(MapError::DuplicatePrimary(Canon::KickMain))
        ));
    }

    #[test]
    fn note_above_127_is_error() {
        let bad = r#"
            id = "x"
            name = "X"
            notes = [ { note = 200, canon = "KickMain", primary = true } ]
        "#;
        assert!(matches!(from_toml(bad), Err(MapError::NoteOutOfRange(200))));
    }
}
