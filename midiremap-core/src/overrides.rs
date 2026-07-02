use std::collections::HashMap;

use serde::Deserialize;

use crate::{
    canon::Canon,
    engine_map::{Decoder, Encoder},
};

#[derive(Deserialize, Default)]
pub struct Overrides {
    #[serde(default)]
    pub tgt: Vec<CanonNote>,
    #[serde(default)]
    pub src: Vec<CanonNote>,
}

#[derive(Deserialize)]
pub struct CanonNote {
    pub canon: Canon,
    pub note: u8,
}

#[derive(thiserror::Error, Debug, PartialEq)]
pub enum OverrideError {
    #[error("override note {0} out of range 0..=127")]
    NoteOutOfRange(u8),
}

impl Overrides {
    pub fn validate(&self) -> Result<(), OverrideError> {
        for cn in self.tgt.iter().chain(&self.src) {
            if cn.note > 127 {
                return Err(OverrideError::NoteOutOfRange(cn.note));
            }
        }
        Ok(())
    }

    pub fn encoder<'a>(&self, base: &'a dyn Encoder) -> OverrideEncoder<'a> {
        let mut extra = HashMap::new();
        for cn in &self.tgt {
            extra.insert(cn.canon, cn.note);
        }
        OverrideEncoder { base, extra }
    }

    pub fn decoder<'a>(&self, base: &'a dyn Decoder) -> OverrideDecoder<'a> {
        let mut extra = HashMap::new();
        for cn in &self.src {
            extra.insert(cn.note, cn.canon);
        }
        OverrideDecoder { base, extra }
    }
}

pub struct OverrideEncoder<'a> {
    base: &'a dyn Encoder,
    extra: HashMap<Canon, u8>,
}

impl Encoder for OverrideEncoder<'_> {
    fn encode(&self, canon: Canon) -> Option<u8> {
        self.extra
            .get(&canon)
            .copied()
            .or_else(|| self.base.encode(canon))
    }
}

pub struct OverrideDecoder<'a> {
    base: &'a dyn Decoder,
    extra: HashMap<u8, Canon>,
}

impl Decoder for OverrideDecoder<'_> {
    fn decode(&self, note: u8) -> Option<Canon> {
        self.extra
            .get(&note)
            .copied()
            .or_else(|| self.base.decode(note))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{Canon, KickKind, SnareArtic},
        engine_map::{from_toml, Decoder, Encoder},
    };

    const TGT: &str = r#"
        id = "t"
        name = "T"
        notes = [ { note = 36, canon = "kick.main", primary = true } ]
    "#;

    #[test]
    fn empty_overrides_deserialize() {
        let ov: Overrides = serde_json::from_str("{}").unwrap();
        assert!(ov.tgt.is_empty());
        assert!(ov.src.is_empty());
    }

    #[test]
    fn note_over_127_is_rejected() {
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"kick.main","note":200}]}"#).unwrap();
        assert_eq!(ov.validate(), Err(OverrideError::NoteOutOfRange(200)));
    }

    #[test]
    fn src_note_over_127_is_rejected() {
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":200,"canon":"kick.main"}]}"#).unwrap();
        assert_eq!(ov.validate(), Err(OverrideError::NoteOutOfRange(200)));
    }

    #[test]
    fn encoder_override_beats_base_and_falls_through() {
        let base = from_toml(TGT).unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#).unwrap();
        let enc = ov.encoder(&base);
        assert_eq!(enc.encode(Canon::Kick(KickKind::Main)), Some(35));
        assert_eq!(enc.encode(Canon::Snare(1, SnareArtic::Hit)), None);
    }

    #[test]
    fn decoder_override_rescues_and_falls_through() {
        let base = from_toml(TGT).unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#).unwrap();
        let dec = ov.decoder(&base);
        assert_eq!(dec.decode(99), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(dec.decode(36), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(dec.decode(50), None);
    }
}
