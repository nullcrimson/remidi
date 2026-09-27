use std::collections::HashMap;

use serde::{de, Deserialize, Deserializer};

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
    #[serde(deserialize_with = "midi_note")]
    pub note: u8,
}

fn midi_note<'de, D: Deserializer<'de>>(d: D) -> Result<u8, D::Error> {
    let note = u8::deserialize(d)?;
    if note > 127 {
        return Err(de::Error::invalid_value(
            de::Unexpected::Unsigned(u64::from(note)),
            &"a MIDI note in 0..=127",
        ));
    }
    Ok(note)
}

impl Overrides {
    /// Target overrides; when a canon appears more than once, the last entry wins.
    pub fn encoder<'a>(&self, base: &'a dyn Encoder) -> OverrideEncoder<'a> {
        let mut extra = HashMap::new();
        for cn in &self.tgt {
            extra.insert(cn.canon, cn.note);
        }
        OverrideEncoder { base, extra }
    }

    /// Source overrides; when a note appears more than once, the last entry wins.
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
        let err =
            serde_json::from_str::<Overrides>(r#"{"tgt":[{"canon":"kick.main","note":200}]}"#)
                .err()
                .unwrap();
        assert!(err.to_string().contains("0..=127"), "{err}");
    }

    #[test]
    fn src_note_over_127_is_rejected() {
        assert!(
            serde_json::from_str::<Overrides>(r#"{"src":[{"note":128,"canon":"kick.main"}]}"#)
                .is_err()
        );
    }

    #[test]
    fn note_127_is_accepted() {
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":127,"canon":"kick.main"}]}"#).unwrap();
        assert_eq!(ov.src[0].note, 127);
    }

    #[test]
    fn duplicate_overrides_last_wins() {
        let base = from_toml(TGT).unwrap();
        let ov: Overrides = serde_json::from_str(
            r#"{
                "tgt":[{"canon":"kick.main","note":35},{"canon":"kick.main","note":40}],
                "src":[{"note":99,"canon":"kick.main"},{"note":99,"canon":"snare1.hit"}]
            }"#,
        )
        .unwrap();
        assert_eq!(
            ov.encoder(&base).encode(Canon::Kick(KickKind::Main)),
            Some(40)
        );
        assert_eq!(
            ov.decoder(&base).decode(99),
            Some(Canon::Snare(1, SnareArtic::Hit))
        );
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
