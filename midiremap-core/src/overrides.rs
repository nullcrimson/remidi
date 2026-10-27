use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer};

use crate::{canon::Canon, note::Note};

/// Edits layered over a source and a target engine; the last entry for a note or canon
/// wins.
#[derive(Deserialize, Default, Debug, PartialEq, Eq)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct Overrides {
    #[serde(default, deserialize_with = "last_wins::<_, CanonNote, _, _>")]
    #[cfg_attr(feature = "ts", tsify(type = "CanonNote[]"))]
    tgt: BTreeMap<Canon, Note>,
    #[serde(default, deserialize_with = "last_wins::<_, SrcNote, _, _>")]
    #[cfg_attr(feature = "ts", tsify(type = "SrcNote[]"))]
    src: BTreeMap<Note, Option<Canon>>,
}

impl Overrides {
    pub(crate) fn new(
        target: impl IntoIterator<Item = (Canon, Note)>,
        source: impl IntoIterator<Item = (Note, Option<Canon>)>,
    ) -> Self {
        Self {
            tgt: target.into_iter().collect(),
            src: source.into_iter().collect(),
        }
    }

    /// The note each edited target drum plays on.
    pub(crate) fn target(&self) -> &BTreeMap<Canon, Note> {
        &self.tgt
    }

    /// The drum each edited source note plays, or `None` for a note that plays none.
    pub(crate) fn source(&self) -> &BTreeMap<Note, Option<Canon>> {
        &self.src
    }
}

fn last_wins<'de, D, E, K, V>(d: D) -> Result<BTreeMap<K, V>, D::Error>
where
    D: Deserializer<'de>,
    E: Deserialize<'de> + Into<(K, V)>,
    K: Ord,
{
    Ok(Vec::<E>::deserialize(d)?
        .into_iter()
        .map(Into::into)
        .collect())
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

impl From<CanonNote> for (Canon, Note) {
    fn from(CanonNote { canon, note }: CanonNote) -> Self {
        (canon, note)
    }
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

impl From<SrcNote> for (Note, Option<Canon>) {
    fn from(SrcNote { note, canon }: SrcNote) -> Self {
        (note, canon)
    }
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
            &BTreeMap::from([(n(36), Some(Canon::Kick(KickKind::Main)))])
        );
    }

    #[test]
    fn duplicate_target_overrides_last_wins() {
        let ov = with_duplicates();
        assert_eq!(
            ov.target(),
            &BTreeMap::from([(Canon::Kick(KickKind::Main), n(40))])
        );
    }

    fn with_duplicates() -> Overrides {
        serde_json::from_str(
            r#"{
                "tgt":[{"canon":"kick.main","note":35},{"canon":"kick.main","note":40}],
                "src":[{"note":99,"canon":"kick.main"},{"note":99,"canon":"snare1.hit"}]
            }"#,
        )
        .unwrap()
    }

    #[test]
    fn duplicate_source_overrides_last_wins() {
        let ov = with_duplicates();
        assert_eq!(
            ov.source(),
            &BTreeMap::from([(n(99), Some(Canon::Snare(idx(1), SnareArtic::Hit)))])
        );
    }
}
