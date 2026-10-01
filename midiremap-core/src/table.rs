use crate::{
    note::Note,
    translate::{Mapping, Resolution},
};

/// Every source note's resolution, compiled once per (source, target, overrides).
pub(crate) struct NoteTable([Resolution; Note::COUNT]);

impl NoteTable {
    pub(crate) fn compile(mapping: &Mapping) -> Self {
        Self(Note::ALL.map(|n| mapping.translate(n)))
    }

    pub(crate) fn get(&self, note: Note) -> &Resolution {
        &self.0[note.index()]
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = (Note, &Resolution)> {
        Note::ALL.into_iter().zip(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{catalog::Catalog, overrides::Overrides, translate::MissingDrums};

    #[test]
    fn agrees_with_translate_for_every_note() {
        let b = Catalog::builtin().unwrap();
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
                for t in [MissingDrums::Nearest, MissingDrums::Drop]
                    .into_iter()
                    .flat_map(|m| {
                        [
                            Mapping::new(src, tgt, &Overrides::default(), m),
                            Mapping::new(src, tgt, &ov, m),
                        ]
                    })
                {
                    let table = NoteTable::compile(&t);
                    for note in Note::ALL {
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
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let table = NoteTable::compile(&Mapping::new(
            src,
            tgt,
            &Overrides::default(),
            MissingDrums::Nearest,
        ));
        let notes: Vec<u8> = table.iter().map(|(n, _)| n.get()).collect();
        assert_eq!(notes, (0..128).collect::<Vec<u8>>());
    }
}
