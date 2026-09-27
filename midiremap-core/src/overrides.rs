use serde::Deserialize;

use crate::{canon::Canon, note::Note};

/// Edits layered over a source and a target engine; the last entry for a note or canon
/// wins.
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
    pub note: Note,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, Canon, KickKind, SnareArtic},
        engine_map::from_toml,
        note::n,
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
        assert_eq!(ov.src[0].note, n(127));
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
            base.with_target_overrides(&ov.tgt)
                .encode(Canon::Kick(KickKind::Main)),
            Some(n(40))
        );
        assert_eq!(
            base.with_source_overrides(&ov.src).decode(n(99)),
            Some(Canon::Snare(idx(1), SnareArtic::Hit))
        );
    }

    #[test]
    fn target_override_beats_base_and_falls_through() {
        let base = from_toml(TGT).unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#).unwrap();
        let enc = base.with_target_overrides(&ov.tgt);
        assert_eq!(enc.encode(Canon::Kick(KickKind::Main)), Some(n(35)));
        assert_eq!(enc.encode(Canon::Snare(idx(1), SnareArtic::Hit)), None);
    }

    #[test]
    fn source_override_rescues_and_falls_through() {
        let base = from_toml(TGT).unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":99,"canon":"kick.main"}]}"#).unwrap();
        let dec = base.with_source_overrides(&ov.src);
        assert_eq!(dec.decode(n(99)), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(dec.decode(n(36)), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(dec.decode(n(50)), None);
    }
}
