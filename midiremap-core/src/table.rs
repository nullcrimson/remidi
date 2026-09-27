use crate::{
    note::Note,
    translate::{Mapping, Resolution},
};

const NOTES: usize = Note::MAX as usize + 1;

/// Every source note's resolution, compiled once per (source, target, overrides).
pub struct NoteTable([Resolution; NOTES]);

impl NoteTable {
    pub fn compile(mapping: &Mapping) -> Self {
        let mut notes = Note::all();
        Self(std::array::from_fn(|_| {
            notes
                .next()
                .map_or(Resolution::Unmapped, |n| mapping.translate(n))
        }))
    }

    pub fn get(&self, note: Note) -> &Resolution {
        &self.0[usize::from(note.get())]
    }

    pub fn iter(&self) -> impl Iterator<Item = (Note, &Resolution)> {
        Note::all().zip(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{catalog::Catalog, overrides::Overrides};

    #[test]
    fn agrees_with_translate_for_every_note() {
        let b = Catalog::builtin();
        let ov: Overrides = serde_json::from_str(
            r#"{"src":[{"note":24,"canon":"snare1.hit"}],"tgt":[{"canon":"kick.main","note":35}]}"#,
        )
        .unwrap();
        let ids = [
            "ggd_invasion",
            "ezdrummer",
            "superior_drummer3",
            "general_midi",
        ];
        for src_id in ids {
            for tgt_id in ids {
                let (src, tgt) = (b.get(src_id).unwrap(), b.get(tgt_id).unwrap());
                for t in [
                    Mapping::new(src, tgt, &Overrides::default()),
                    Mapping::new(src, tgt, &ov),
                ] {
                    let table = NoteTable::compile(&t);
                    for note in Note::all() {
                        assert_eq!(
                            table.get(note),
                            &t.translate(note),
                            "{src_id}->{tgt_id} {note}"
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn iter_yields_each_note_once_in_order() {
        let b = Catalog::builtin();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let table = NoteTable::compile(&Mapping::new(src, tgt, &Overrides::default()));
        let notes: Vec<u8> = table.iter().map(|(n, _)| n.get()).collect();
        assert_eq!(notes, (0..128).collect::<Vec<u8>>());
    }
}
