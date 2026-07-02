use std::collections::HashMap;

use crate::{
    canon::{Canon, DefaultFallbacks},
    engine_map::{Encoder, EngineMap},
    overrides::Overrides,
    translate::{CanonResolution, Translator},
};

#[derive(Debug, PartialEq, Eq)]
pub enum PlanStatus {
    Direct,
    Fallback,
    Dropped,
}

#[derive(Debug, PartialEq, Eq)]
pub struct VoicePlan {
    pub canon: Canon,
    pub src_note: u8,
    pub tgt_note: Option<u8>,
    pub status: PlanStatus,
}

pub fn plan(src: &EngineMap, tgt: &EngineMap, ov: &Overrides) -> Vec<VoicePlan> {
    let fb = DefaultFallbacks;
    let enc = ov.encoder(tgt);
    let translator = Translator::new(src, &enc, &fb);
    let mut src_overrides: HashMap<Canon, u8> = HashMap::new();
    for cn in &ov.src {
        src_overrides.entry(cn.canon).or_insert(cn.note);
    }
    let mut rows = Vec::new();
    for canon in Canon::all() {
        let Some(src_note) = src_overrides
            .get(&canon)
            .copied()
            .or_else(|| src.encode(canon))
        else {
            continue;
        };
        let (tgt_note, status) = match translator.resolve_canon(canon) {
            CanonResolution::Direct { note } => (Some(note), PlanStatus::Direct),
            CanonResolution::Fallback { note, .. } => (Some(note), PlanStatus::Fallback),
            CanonResolution::Dropped { .. } => (None, PlanStatus::Dropped),
        };
        rows.push(VoicePlan {
            canon,
            src_note,
            tgt_note,
            status,
        });
    }
    rows
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{KickKind, SnareArtic},
        catalog::{BuiltinMaps, MapProvider},
        engine_map::from_toml,
        Overrides,
    };

    fn find<'a>(rows: &'a [VoicePlan], name: &str) -> &'a VoicePlan {
        rows.iter()
            .find(|r| r.canon.to_string() == name)
            .unwrap_or_else(|| panic!("no voice {name}"))
    }

    #[test]
    fn ggd_to_ezd_plan_has_expected_rows() {
        let b = BuiltinMaps::new();
        let rows = plan(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &Overrides::default(),
        );
        let kick = find(&rows, "kick.main");
        assert_eq!(kick.src_note, 24);
        assert_eq!(kick.tgt_note, Some(36));
        assert_eq!(kick.status, PlanStatus::Direct);
        let china = find(&rows, "china.1.hit");
        assert_eq!(china.status, PlanStatus::Fallback);
        assert_eq!(china.tgt_note, Some(86));
    }

    #[test]
    fn rows_follow_canon_declaration_order() {
        let b = BuiltinMaps::new();
        let rows = plan(
            b.get("ggd_invasion").unwrap(),
            b.get("ggd_invasion").unwrap(),
            &Overrides::default(),
        );
        let kick = rows
            .iter()
            .position(|r| r.canon == Canon::Kick(KickKind::Main))
            .unwrap();
        let snare = rows
            .iter()
            .position(|r| r.canon == Canon::Snare(1, SnareArtic::Hit))
            .unwrap();
        assert!(kick < snare, "kick must precede snare");
    }

    #[test]
    fn tgt_override_flips_a_row() {
        let b = BuiltinMaps::new();
        let ov: Overrides =
            serde_json::from_str(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#).unwrap();
        let rows = plan(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &ov,
        );
        assert_eq!(find(&rows, "kick.main").tgt_note, Some(35));
    }

    #[test]
    fn src_override_sets_row_src_note() {
        let b = BuiltinMaps::new();
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"canon":"kick.main","note":99}]}"#).unwrap();
        let rows = plan(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &ov,
        );
        assert_eq!(find(&rows, "kick.main").src_note, 99);
    }

    #[test]
    fn src_override_introduces_row_absent_from_engine() {
        let src = from_toml(
            r#"
                id = "s"
                name = "S"
                notes = [ { note = 24, canon = "kick.main", primary = true } ]
            "#,
        )
        .unwrap();
        let tgt = from_toml(
            r#"
                id = "t"
                name = "T"
                notes = [
                  { note = 36, canon = "kick.main", primary = true },
                  { note = 38, canon = "snare1.hit", primary = true },
                ]
            "#,
        )
        .unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"canon":"snare1.hit","note":60}]}"#).unwrap();
        let rows = plan(&src, &tgt, &ov);
        let snare = find(&rows, "snare1.hit");
        assert_eq!(snare.src_note, 60);
        assert_eq!(snare.tgt_note, Some(38));
    }
}
