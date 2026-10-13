use std::collections::HashMap;

use serde::Deserialize;

use crate::{canon::Canon, note::Note};

/// Edits layered over a source and a target engine; the last entry for a note or canon
/// wins.
#[derive(Deserialize, Default)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Overrides {
    #[serde(default)]
    tgt: Vec<CanonNote>,
    #[serde(default)]
    src: Vec<SrcNote>,
}

impl Overrides {
    pub(crate) fn new(
        target: impl IntoIterator<Item = (Canon, Note)>,
        source: impl IntoIterator<Item = (Note, Option<Canon>)>,
    ) -> Self {
        Self {
            tgt: target
                .into_iter()
                .map(|(canon, note)| CanonNote { canon, note })
                .collect(),
            src: source
                .into_iter()
                .map(|(note, canon)| SrcNote { note, canon })
                .collect(),
        }
    }

    pub(crate) fn target(&self) -> HashMap<Canon, Note> {
        self.tgt.iter().map(|cn| (cn.canon, cn.note)).collect()
    }

    pub(crate) fn source(&self) -> HashMap<Note, Option<Canon>> {
        self.src.iter().map(|sn| (sn.note, sn.canon)).collect()
    }
}

#[derive(Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
struct CanonNote {
    canon: Canon,
    note: Note,
}

/// A source note played as `canon`, or no drum at all when `canon` is `None`.
#[derive(Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
struct SrcNote {
    note: Note,
    canon: Option<Canon>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, Canon, KickKind, SnareArtic},
        note::n,
    };

    #[test]
    fn empty_overrides_deserialize() {
        let ov: Overrides = serde_json::from_str("{}").unwrap();
        assert!(ov.target().is_empty());
        assert!(ov.source().is_empty());
    }

    #[test]
    fn note_127_is_accepted() {
        let ov: Overrides =
            serde_json::from_str(r#"{"src":[{"note":127,"canon":"kick.main"}]}"#).unwrap();
        assert!(ov.source().contains_key(&n(127)));
    }

    #[test]
    fn a_later_source_entry_reassigns_an_unassigned_note() {
        let ov: Overrides = serde_json::from_str(
            r#"{"src":[{"note":36,"canon":null},{"note":36,"canon":"kick.main"}]}"#,
        )
        .unwrap();
        assert_eq!(
            ov.source(),
            HashMap::from([(n(36), Some(Canon::Kick(KickKind::Main)))])
        );
    }

    #[test]
    fn duplicate_overrides_last_wins() {
        let ov: Overrides = serde_json::from_str(
            r#"{
                "tgt":[{"canon":"kick.main","note":35},{"canon":"kick.main","note":40}],
                "src":[{"note":99,"canon":"kick.main"},{"note":99,"canon":"snare1.hit"}]
            }"#,
        )
        .unwrap();
        assert_eq!(
            ov.target(),
            HashMap::from([(Canon::Kick(KickKind::Main), n(40))])
        );
        assert_eq!(
            ov.source(),
            HashMap::from([(n(99), Some(Canon::Snare(idx(1), SnareArtic::Hit)))])
        );
    }
}
