use crate::{
    canon::Canon,
    note::Note,
    resolution::Outcome,
    translate::{Mapping, Resolution, Unrecognized},
};

/// Where a source note plays on the target: on the note of the drum it decodes to, or
/// unchanged, when the source does not recognize it and the table keeps such notes.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub(crate) enum Destination {
    Drum { canon: Canon, note: Note },
    Kept(Note),
}

impl Destination {
    pub(crate) fn note(&self) -> Note {
        match *self {
            Self::Drum { note, .. } | Self::Kept(note) => note,
        }
    }
}

/// Every source note's resolution, compiled once per (source, target, overrides), and
/// what happens to the notes that resolve to nothing the source recognizes.
pub(crate) struct NoteTable {
    notes: [Resolution; Note::COUNT],
    unrecognized: Unrecognized,
}

impl NoteTable {
    pub(crate) fn compile(mapping: &Mapping) -> Self {
        Self {
            notes: Note::ALL.map(|n| mapping.translate(n)),
            unrecognized: mapping.unrecognized(),
        }
    }

    pub(crate) fn get(&self, note: Note) -> &Resolution {
        &self.notes[note.index()]
    }

    pub(crate) fn unrecognized(&self) -> Unrecognized {
        self.unrecognized
    }

    /// Where `note` plays, or `None` when nothing plays it: its drum is dropped, or the source
    /// does not recognize it and the table removes such notes.
    pub(crate) fn destination(&self, note: Note) -> Option<Destination> {
        match *self.get(note) {
            Resolution::Resolved(
                Outcome::Direct { canon, note: to }
                | Outcome::Fallback {
                    canon, note: to, ..
                },
            ) => Some(Destination::Drum { canon, note: to }),
            Resolution::Resolved(Outcome::Dropped { .. }) => None,
            Resolution::Unmapped => self
                .unrecognized()
                .keeps()
                .then_some(Destination::Kept(note)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{catalog::Catalog, overrides::Overrides, resolution::MissingDrums};

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
    fn carries_the_mappings_choice_for_unrecognized_notes() {
        let b = Catalog::builtin().unwrap();
        let (src, tgt) = (b.get("ggd_invasion").unwrap(), b.get("ezdrummer").unwrap());
        let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest)
            .with_unrecognized(Unrecognized::Keep);
        assert_eq!(
            NoteTable::compile(&mapping).unrecognized(),
            Unrecognized::Keep
        );
    }
}
