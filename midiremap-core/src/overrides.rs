use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::{canon::Canon, note::Note};

/// Edits layered over a source and a target engine: the note each edited target drum plays
/// on, and the drum each edited source note plays, or `None` for a note that plays none.
#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Overrides {
    edits: BTreeMap<Canon, Note>,
    #[serde(
        serialize_with = "Note::text_keys",
        deserialize_with = "Note::from_text_keys"
    )]
    src_edits: BTreeMap<Note, Option<Canon>>,
}

impl Overrides {
    pub(crate) fn new(
        edits: BTreeMap<Canon, Note>,
        src_edits: BTreeMap<Note, Option<Canon>>,
    ) -> Self {
        Self { edits, src_edits }
    }

    /// The note each edited target drum plays on.
    pub(crate) fn target(&self) -> &BTreeMap<Canon, Note> {
        &self.edits
    }

    /// The drum each edited source note plays, or `None` for a note that plays none.
    pub(crate) fn source(&self) -> &BTreeMap<Note, Option<Canon>> {
        &self.src_edits
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{Canon, KickKind, Slot},
        note::n,
    };

    fn read(json: &str) -> Overrides {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn empty_overrides_deserialize() {
        assert_eq!(read(r#"{"edits":{},"srcEdits":{}}"#), Overrides::default());
    }

    #[test]
    fn a_target_edit_names_the_note_its_drum_plays_on() {
        let ov = read(r#"{"edits":{"kick.main":35},"srcEdits":{}}"#);
        assert_eq!(
            ov.target(),
            &BTreeMap::from([(Canon(Slot::Kick(KickKind::Main)), n(35))])
        );
    }

    #[test]
    fn a_source_edit_keyed_by_note_text_assigns_or_unassigns_the_note() {
        let ov = read(r#"{"edits":{},"srcEdits":{"127":"kick.main","36":null}}"#);
        assert_eq!(
            ov.source(),
            &BTreeMap::from([
                (n(36), None),
                (n(127), Some(Canon(Slot::Kick(KickKind::Main))))
            ])
        );
    }

    #[test]
    fn a_source_edit_on_no_note_is_refused() {
        let err = serde_json::from_str::<Overrides>(r#"{"edits":{},"srcEdits":{"128":null}}"#)
            .unwrap_err();
        assert!(err.to_string().contains("128"), "{err}");
    }

    #[test]
    fn overrides_read_back_what_they_write() {
        let ov = read(r#"{"edits":{"kick.main":35},"srcEdits":{"24":"snare1.hit","60":null}}"#);
        assert_eq!(read(&serde_json::to_string(&ov).unwrap()), ov);
    }
}
