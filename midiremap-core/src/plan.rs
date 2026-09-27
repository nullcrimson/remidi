use std::collections::{HashMap, HashSet};

use crate::{
    canon::Canon,
    engine_map::EngineMap,
    note::Note,
    overrides::Overrides,
    table::NoteTable,
    translate::{resolve, CanonResolution, Mapping, Resolution},
};

#[derive(Debug, PartialEq, Eq)]
pub enum PlanStatus {
    Direct,
    Fallback,
    Dropped,
}

impl From<&CanonResolution> for PlanStatus {
    fn from(r: &CanonResolution) -> Self {
        match r {
            CanonResolution::Direct { .. } => Self::Direct,
            CanonResolution::Fallback { .. } => Self::Fallback,
            CanonResolution::Dropped { .. } => Self::Dropped,
        }
    }
}

/// One drum of the edit preview, derived from the same [`NoteTable`] the converter uses.
#[derive(Debug, PartialEq, Eq)]
pub struct VoicePlan {
    pub canon: Canon,
    /// Source notes that play this drum: overridden notes, then the engine's primary note,
    /// then the rest, each group ascending. Empty when no source note plays it.
    pub src_notes: Vec<Note>,
    pub tgt_note: Option<Note>,
    /// Target note without target overrides.
    pub default_tgt_note: Option<Note>,
    pub status: PlanStatus,
}

/// Duplicate overrides resolve last-wins, exactly as in conversion.
pub fn plan(src: &EngineMap, tgt: &EngineMap, ov: &Overrides) -> Vec<VoicePlan> {
    let mapping = Mapping::new(src, tgt, ov);
    let table = NoteTable::compile(&mapping);
    let overridden: HashSet<Note> = ov.src.iter().map(|cn| cn.note).collect();

    let mut notes_by_canon: HashMap<Canon, Vec<Note>> = HashMap::new();
    for (note, res) in table.iter() {
        if let Resolution::Resolved(r) = res {
            notes_by_canon.entry(r.canon()).or_default().push(note);
        }
    }

    Canon::all()
        .iter()
        .filter_map(|&canon| {
            let primary = src.encode(canon);
            let mut src_notes = notes_by_canon.remove(&canon).unwrap_or_default();
            if primary.is_none() && src_notes.is_empty() {
                return None;
            }
            src_notes.sort_by_key(|&n| {
                let rank = if overridden.contains(&n) {
                    0
                } else if Some(n) == primary {
                    1
                } else {
                    2
                };
                (rank, n)
            });
            let resolved = mapping.resolve_canon(canon);
            Some(VoicePlan {
                canon,
                src_notes,
                tgt_note: resolved.note(),
                default_tgt_note: resolve(canon, tgt).note(),
                status: PlanStatus::from(&resolved),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, KickKind, SnareArtic},
        catalog::Catalog,
        engine_map::from_toml,
        note::n,
        Overrides,
    };

    fn find<'a>(rows: &'a [VoicePlan], name: &str) -> &'a VoicePlan {
        rows.iter()
            .find(|r| r.canon.to_string() == name)
            .unwrap_or_else(|| panic!("no voice {name}"))
    }

    fn ggd_to_ezd(ov: &str) -> Vec<VoicePlan> {
        let b = Catalog::builtin();
        let ov: Overrides = serde_json::from_str(ov).unwrap();
        plan(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &ov,
        )
    }

    #[test]
    fn ggd_to_ezd_plan_has_expected_rows() {
        let rows = ggd_to_ezd("{}");
        let kick = find(&rows, "kick.main");
        assert_eq!(kick.src_notes, vec![n(24)]);
        assert_eq!(kick.tgt_note, Some(n(36)));
        assert_eq!(kick.status, PlanStatus::Direct);
        let china = find(&rows, "china.1.hit");
        assert_eq!(china.status, PlanStatus::Fallback);
        assert_eq!(china.tgt_note, Some(n(86)));
    }

    #[test]
    fn rows_follow_canon_declaration_order() {
        let b = Catalog::builtin();
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
            .position(|r| r.canon == Canon::Snare(idx(1), SnareArtic::Hit))
            .unwrap();
        assert!(kick < snare, "kick must precede snare");
    }

    #[test]
    fn tgt_override_flips_a_row() {
        let rows = ggd_to_ezd(r#"{"tgt":[{"canon":"kick.main","note":35}]}"#);
        let kick = find(&rows, "kick.main");
        assert_eq!(kick.tgt_note, Some(n(35)));
        assert_eq!(kick.default_tgt_note, Some(n(36)));
    }

    #[test]
    fn src_override_adds_a_note_ahead_of_the_primary() {
        let rows = ggd_to_ezd(r#"{"src":[{"canon":"kick.main","note":99}]}"#);
        assert_eq!(find(&rows, "kick.main").src_notes, vec![n(99), n(24)]);
    }

    #[test]
    fn reassigned_note_moves_between_rows() {
        let rows = ggd_to_ezd(r#"{"src":[{"canon":"snare1.hit","note":24}]}"#);
        let kick = find(&rows, "kick.main");
        assert!(kick.src_notes.is_empty(), "kick keeps {:?}", kick.src_notes);
        assert_eq!(
            kick.tgt_note,
            Some(n(36)),
            "a silent row still resolves its target"
        );
        assert_eq!(find(&rows, "snare1.hit").src_notes.first(), Some(&n(24)));
    }

    #[test]
    fn duplicate_src_override_last_wins() {
        let rows = ggd_to_ezd(
            r#"{"src":[{"canon":"snare1.hit","note":24},{"canon":"hat.closed","note":24}]}"#,
        );
        assert!(!find(&rows, "snare1.hit").src_notes.contains(&n(24)));
        assert_eq!(find(&rows, "hat.closed").src_notes.first(), Some(&n(24)));
    }

    #[test]
    fn duplicate_tgt_override_last_wins() {
        let rows = ggd_to_ezd(
            r#"{"tgt":[{"canon":"kick.main","note":35},{"canon":"kick.main","note":40}]}"#,
        );
        assert_eq!(find(&rows, "kick.main").tgt_note, Some(n(40)));
    }

    #[test]
    fn src_notes_order_overrides_then_primary_then_rest() {
        let src = from_toml(
            r#"
                id = "s"
                name = "S"
                notes = [
                  { note = 12, canon = "kick.main" },
                  { note = 10, canon = "kick.main", primary = true },
                  { note = 5, canon = "kick.main" },
                ]
            "#,
        )
        .unwrap();
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"canon":"kick.main","note":30}]}"#).unwrap();
        let rows = plan(&src, &src, &ov);
        assert_eq!(
            find(&rows, "kick.main").src_notes,
            vec![n(30), n(10), n(5), n(12)]
        );
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
        assert_eq!(snare.src_notes, vec![n(60)]);
        assert_eq!(snare.tgt_note, Some(n(38)));
    }

    #[test]
    fn every_builtin_canon_is_listed_by_canon_all() {
        let all: HashSet<Canon> = Canon::all().iter().copied().collect();
        let b = Catalog::builtin();
        for id in b.ids() {
            for drum in b.get(id).unwrap().source_notes() {
                assert!(all.contains(&drum.canon), "{id}: {} missing", drum.canon);
            }
        }
    }
}
