use crate::translate::{Resolution, Translator};

const NOTES: usize = 128;

/// Every source note's resolution, compiled once per (source, target, overrides).
pub struct NoteTable([Resolution; NOTES]);

impl NoteTable {
    pub fn compile(translator: &Translator) -> Self {
        Self(std::array::from_fn(|note| {
            u8::try_from(note).map_or(Resolution::Unmapped, |n| translator.translate(n))
        }))
    }

    /// Notes outside 0..=127 are [`Resolution::Unmapped`].
    pub fn get(&self, note: u8) -> &Resolution {
        self.0
            .get(usize::from(note))
            .unwrap_or(&Resolution::Unmapped)
    }

    pub fn iter(&self) -> impl Iterator<Item = (u8, &Resolution)> {
        (0..=u8::MAX).zip(&self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::DefaultFallbacks,
        catalog::{BuiltinMaps, MapProvider},
        overrides::Overrides,
    };

    #[test]
    fn agrees_with_translate_for_every_note() {
        let b = BuiltinMaps::new();
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
                let (dec, enc) = (ov.decoder(src), ov.encoder(tgt));
                for t in [
                    Translator::new(src, tgt, &DefaultFallbacks),
                    Translator::new(&dec, &enc, &DefaultFallbacks),
                ] {
                    let table = NoteTable::compile(&t);
                    for note in 0..128 {
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
    fn out_of_range_note_is_unmapped() {
        let b = BuiltinMaps::new();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let table = NoteTable::compile(&Translator::new(src, tgt, &DefaultFallbacks));
        assert_eq!(table.get(200), &Resolution::Unmapped);
    }

    #[test]
    fn iter_yields_each_note_once_in_order() {
        let b = BuiltinMaps::new();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let table = NoteTable::compile(&Translator::new(src, tgt, &DefaultFallbacks));
        let notes: Vec<u8> = table.iter().map(|(n, _)| n).collect();
        assert_eq!(notes, (0..128).collect::<Vec<u8>>());
    }
}
