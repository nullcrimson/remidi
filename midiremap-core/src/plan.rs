use std::collections::HashSet;

use serde::Serialize;

use crate::{
    canon::{Canon, CanonEntry},
    note::Note,
    resolution::Outcome,
    translate::Mapping,
};

/// One drum of the edit preview, derived from the same [`Mapping`] the converter uses.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct VoicePlan {
    #[serde(flatten)]
    pub entry: CanonEntry,
    /// Source notes that play this drum: overridden notes, then the engine's primary note,
    /// then the rest, each group ascending. Empty when no source note plays it.
    pub src_notes: Vec<Note>,
    /// Target note without target overrides.
    pub(crate) default_tgt_note: Option<Note>,
    pub outcome: Outcome,
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
enum SrcNoteRank {
    Overridden,
    Primary,
    Other,
}

impl SrcNoteRank {
    fn of(note: Note, edited: &HashSet<Note>, primary: Option<Note>) -> Self {
        if edited.contains(&note) {
            Self::Overridden
        } else if Some(note) == primary {
            Self::Primary
        } else {
            Self::Other
        }
    }
}

impl Mapping<'_> {
    /// The edit preview: one row per drum the source plays or names, in canon order, with
    /// where it lands.
    pub fn preview(&self) -> Vec<VoicePlan> {
        let src = self.source();
        let mut notes_by_canon = self.played_drums();
        Canon::all()
            .iter()
            .filter_map(|&canon| {
                let primary = src.encode(canon);
                let mut src_notes = notes_by_canon.remove(&canon).unwrap_or_default();
                if primary.is_none() && src_notes.is_empty() {
                    return None;
                }
                src_notes.sort_by_key(|&n| (SrcNoteRank::of(n, self.edited(), primary), n));
                Some(VoicePlan {
                    entry: canon.into(),
                    src_notes,
                    default_tgt_note: self.target().resolve(canon, self.missing()).note(),
                    outcome: self.resolve_canon(canon),
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, KickKind, SnareArtic},
        catalog::Catalog,
        engine_map::from_toml,
        note::n,
        MissingDrums, Overrides,
    };

    const NO_EDITS: &str = r#"{"edits":{},"srcEdits":{}}"#;

    fn find<'a>(rows: &'a [VoicePlan], name: &str) -> &'a VoicePlan {
        rows.iter()
            .find(|r| r.entry.canon.to_string() == name)
            .unwrap_or_else(|| panic!("no voice {name}"))
    }

    fn ggd_to_ezd(ov: &str) -> Vec<VoicePlan> {
        ggd_to_ezd_with(ov, MissingDrums::Nearest)
    }

    fn ggd_to_ezd_with(ov: &str, missing: MissingDrums) -> Vec<VoicePlan> {
        let b = Catalog::builtin().unwrap();
        let ov: Overrides = serde_json::from_str(ov).unwrap();
        Mapping::new(
            b.get("ggd_invasion").unwrap(),
            b.get("ezdrummer").unwrap(),
            &ov,
            missing,
        )
        .preview()
    }

    #[test]
    fn a_dropped_voice_serializes_in_camel_case_with_its_outcome_tagged_by_status() {
        let drop = ggd_to_ezd_with(NO_EDITS, MissingDrums::Drop);
        let json = serde_json::to_value(find(&drop, "china.1.hit")).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "canon": "china.1.hit",
                "label": "China 1",
                "family": "Cymbals",
                "srcNotes": json["srcNotes"],
                "defaultTgtNote": null,
                "outcome": { "status": "dropped", "otherDrum": true },
            })
        );
        assert!(json["srcNotes"].as_array().is_some_and(|a| !a.is_empty()));
    }

    #[test]
    fn a_direct_outcome_serializes_tagged_by_status() {
        let drop = ggd_to_ezd_with(NO_EDITS, MissingDrums::Drop);
        let kick = serde_json::to_value(find(&drop, "kick.main")).unwrap();
        assert_eq!(
            kick["outcome"],
            serde_json::json!({ "status": "direct", "note": 36 })
        );
    }

    #[test]
    fn a_swapped_drum_is_marked_as_a_fallback_under_nearest() {
        let near = ggd_to_ezd(NO_EDITS);
        assert_eq!(
            find(&near, "china.1.hit").outcome,
            Outcome::Fallback {
                canon: "china.1.hit".parse().unwrap(),
                stand_in: "crash.1.hit".parse().unwrap(),
                note: n(86),
                other_drum: true
            }
        );
    }

    #[test]
    fn a_present_drum_is_direct() {
        let near = ggd_to_ezd(NO_EDITS);
        assert_eq!(
            find(&near, "kick.main").outcome,
            Outcome::Direct {
                canon: Canon::Kick(KickKind::Main),
                note: n(36)
            }
        );
    }

    #[test]
    fn a_swapped_drum_is_marked_and_dropped_under_drop() {
        let drop = ggd_to_ezd_with(NO_EDITS, MissingDrums::Drop);
        let china = find(&drop, "china.1.hit");
        assert_eq!(
            china.outcome,
            Outcome::Dropped {
                canon: china.entry.canon,
                other_drum: true
            }
        );
        assert_eq!(china.default_tgt_note, None);
    }

    #[test]
    fn a_target_edit_rescues_a_dropped_swap() {
        let rows = ggd_to_ezd_with(
            r#"{"edits":{"china.1.hit":52},"srcEdits":{}}"#,
            MissingDrums::Drop,
        );
        assert_eq!(
            find(&rows, "china.1.hit").outcome,
            Outcome::Direct {
                canon: "china.1.hit".parse().unwrap(),
                note: n(52)
            }
        );
    }

    #[test]
    fn a_row_lists_the_source_note_that_plays_its_drum() {
        assert_eq!(
            find(&ggd_to_ezd(NO_EDITS), "kick.main").src_notes,
            vec![n(24)]
        );
    }

    #[test]
    fn rows_follow_canon_declaration_order() {
        let b = Catalog::builtin().unwrap();
        let rows = Mapping::new(
            b.get("ggd_invasion").unwrap(),
            b.get("ggd_invasion").unwrap(),
            &Overrides::default(),
            MissingDrums::Nearest,
        )
        .preview();
        let kick = rows
            .iter()
            .position(|r| r.entry.canon == Canon::Kick(KickKind::Main))
            .unwrap();
        let snare = rows
            .iter()
            .position(|r| r.entry.canon == Canon::Snare(idx(1), SnareArtic::Hit))
            .unwrap();
        assert!(kick < snare, "kick must precede snare");
    }

    #[test]
    fn tgt_override_flips_a_row() {
        let rows = ggd_to_ezd(r#"{"edits":{"kick.main":35},"srcEdits":{}}"#);
        let kick = find(&rows, "kick.main");
        assert_eq!(kick.outcome.note(), Some(n(35)));
        assert_eq!(kick.default_tgt_note, Some(n(36)));
    }

    #[test]
    fn src_override_adds_a_note_ahead_of_the_primary() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"99":"kick.main"}}"#);
        assert_eq!(find(&rows, "kick.main").src_notes, vec![n(99), n(24)]);
    }

    #[test]
    fn src_override_can_replace_the_primary() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"24":null,"99":"kick.main"}}"#);
        assert_eq!(find(&rows, "kick.main").src_notes, vec![n(99)]);
    }

    #[test]
    fn src_override_can_unassign_the_primary() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"24":null}}"#);
        assert!(find(&rows, "kick.main").src_notes.is_empty());
    }

    #[test]
    fn reassigned_note_leaves_its_old_row() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"24":"snare1.hit"}}"#);
        let kick = find(&rows, "kick.main");
        assert!(kick.src_notes.is_empty(), "kick keeps {:?}", kick.src_notes);
    }

    #[test]
    fn a_row_that_lost_its_source_note_still_resolves_its_target() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"24":"snare1.hit"}}"#);
        let kick = find(&rows, "kick.main");
        assert_eq!(
            kick.outcome.note(),
            Some(n(36)),
            "a silent row still resolves its target"
        );
    }

    #[test]
    fn a_reassigned_note_lands_on_its_new_row() {
        let rows = ggd_to_ezd(r#"{"edits":{},"srcEdits":{"24":"snare1.hit"}}"#);
        assert_eq!(find(&rows, "snare1.hit").src_notes.first(), Some(&n(24)));
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
            serde_json::from_str(r#"{"edits":{},"srcEdits":{"30":"kick.main"}}"#).unwrap();
        let rows = Mapping::new(&src, &src, &ov, MissingDrums::Nearest).preview();
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
            serde_json::from_str(r#"{"edits":{},"srcEdits":{"60":"snare1.hit"}}"#).unwrap();
        let rows = Mapping::new(&src, &tgt, &ov, MissingDrums::Nearest).preview();
        let snare = find(&rows, "snare1.hit");
        assert_eq!(snare.src_notes, vec![n(60)]);
        assert_eq!(snare.outcome.note(), Some(n(38)));
    }
}
