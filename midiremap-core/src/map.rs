use std::{collections::HashMap, fmt};

use serde::Deserialize;

use crate::canon::Canon;

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
    pub to_canon: HashMap<u8, Canon>,
    pub from_canon: HashMap<Canon, u8>,
}

#[derive(Debug, PartialEq)]
pub enum MapError {
    DuplicatePrimary(Canon),
    NoteOutOfRange(u16),
    Parse(String),
}

impl fmt::Display for MapError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MapError::DuplicatePrimary(c) => write!(f, "duplicate primary for {c:?}"),
            MapError::NoteOutOfRange(n) => write!(f, "note {n} out of range 0..=127"),
            MapError::Parse(e) => write!(f, "parse error: {e}"),
        }
    }
}
impl std::error::Error for MapError {}

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
    use crate::canon::Canon;

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
    fn parses_to_canon_for_every_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.to_canon.get(&24), Some(&Canon::KickMain));
        assert_eq!(m.to_canon.get(&23), Some(&Canon::KickMain));
        assert_eq!(m.to_canon.get(&26), Some(&Canon::SnareCenter));
    }

    #[test]
    fn from_canon_uses_primary_note() {
        let m = from_toml(SAMPLE).unwrap();
        assert_eq!(m.from_canon.get(&Canon::KickMain), Some(&24));
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
