use std::{cmp::Reverse, iter::Sum, ops::AddAssign};

use crate::{
    catalog::Catalog,
    channel::ChannelScope,
    engine_map::EngineMap,
    midi::{self, CodecError},
    note::Note,
};

/// How many hits each note has among the note-ons a conversion reads.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NoteHits([u32; Note::COUNT]);

impl Default for NoteHits {
    fn default() -> Self {
        Self([0; Note::COUNT])
    }
}

impl NoteHits {
    fn get(&self, note: Note) -> u32 {
        self.0[note.index()]
    }

    fn total(&self) -> u32 {
        self.0.iter().sum()
    }

    fn recognized_by(&self, engine: &EngineMap) -> u32 {
        engine.decodings().map(|(note, _)| self.get(note)).sum()
    }
}

impl AddAssign<&Self> for NoteHits {
    fn add_assign(&mut self, other: &Self) {
        for (mine, theirs) in self.0.iter_mut().zip(other.0) {
            *mine += theirs;
        }
    }
}

impl Sum for NoteHits {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::default(), |mut total, hits| {
            total += &hits;
            total
        })
    }
}

/// The hits on each note among the note-ons a conversion with `scope` rewrites in `midi`.
pub fn note_hits(midi: &[u8], scope: ChannelScope) -> Result<NoteHits, CodecError> {
    let smf = midi::parse(midi)?;
    let mut hits = NoteHits::default();
    for key in scope.hit_keys(&smf) {
        hits.0[Note::from_key(key).index()] += 1;
    }
    Ok(hits)
}

/// How well one engine's layout covers a file's hits.
#[derive(Debug, Clone, Copy)]
pub struct SourceFit<'a> {
    engine: &'a EngineMap,
    recognized: u32,
}

impl<'a> SourceFit<'a> {
    pub fn engine(&self) -> &'a EngineMap {
        self.engine
    }

    /// The hits on notes the engine's map decodes: the ones converting from it keeps.
    pub fn recognized(&self) -> u32 {
        self.recognized
    }
}

/// Every engine of a catalog fitted to the same hits, best first; no engine recognizes more
/// than `hits`.
#[derive(Debug, Clone)]
pub struct SourceFits<'a> {
    hits: u32,
    ranked: Vec<SourceFit<'a>>,
}

impl<'a> SourceFits<'a> {
    /// Every hit, on any note.
    pub fn hits(&self) -> u32 {
        self.hits
    }

    /// The fits, best first: the most recognized hits, ties in catalog order.
    pub fn ranked(&self) -> &[SourceFit<'a>] {
        &self.ranked
    }
}

/// Every engine of `catalog` fitted to `hits`, best first: the most recognized hits, ties in
/// catalog order.
pub fn source_fits<'a>(catalog: &'a Catalog, hits: &NoteHits) -> SourceFits<'a> {
    let mut ranked: Vec<SourceFit<'a>> = catalog
        .engines()
        .map(|engine| SourceFit {
            engine,
            recognized: hits.recognized_by(engine),
        })
        .collect();
    ranked.sort_by_key(|fit| Reverse(fit.recognized));
    SourceFits {
        hits: hits.total(),
        ranked,
    }
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{drums, engine_json, off, on, silent_on, tracks, DRUMS};

    use super::*;
    use crate::{
        channel::Channel, conversion::convert, note::n, overrides::Overrides,
        resolution::MissingDrums, translate::Mapping,
    };

    fn hits_of(midi: &[u8], scope: ChannelScope) -> Vec<(u8, u32)> {
        let hits = note_hits(midi, scope).unwrap();
        Note::ALL
            .into_iter()
            .filter(|&note| hits.get(note) > 0)
            .map(|note| (note.get(), hits.get(note)))
            .collect()
    }

    #[test]
    fn note_hits_counts_each_note_on_with_a_velocity() {
        let midi = drums(&[
            (0, on(36)),
            (10, off(36)),
            (0, on(36)),
            (10, silent_on(36)),
            (0, on(38)),
        ]);
        assert_eq!(hits_of(&midi, ChannelScope::Auto), [(36, 2), (38, 1)]);
    }

    fn drum_track_and_bass_track() -> Vec<u8> {
        tracks(&[&[(0, DRUMS, on(36)), (10, 1, on(38))], &[(0, 1, on(40))]])
    }

    #[test]
    fn note_hits_reads_only_the_tracks_auto_converts() {
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), ChannelScope::Auto),
            [(36, 1), (38, 1)]
        );
    }

    #[test]
    fn note_hits_reads_only_the_channel_a_scope_names() {
        let one = ChannelScope::Only(Channel::new(1).unwrap());
        assert_eq!(
            hits_of(&drum_track_and_bass_track(), one),
            [(38, 1), (40, 1)]
        );
    }

    #[test]
    fn note_hits_of_a_file_that_does_not_parse_is_an_error() {
        assert!(note_hits(b"garbage", ChannelScope::Auto).is_err());
    }

    #[test]
    fn note_hits_add_up_note_by_note() {
        let a = note_hits(&drums(&[(0, on(36)), (0, on(38))]), ChannelScope::Auto).unwrap();
        let b = note_hits(&drums(&[(0, on(36))]), ChannelScope::Auto).unwrap();
        let sum: NoteHits = [a, b].into_iter().sum();
        assert_eq!((sum.get(n(36)), sum.get(n(38)), sum.total()), (2, 1, 3));
    }

    fn engine(id: &str, notes: &[u8]) -> EngineMap {
        let canons = ["kick.main", "snare1.hit", "hat.closed"];
        let notes: Vec<(u8, &str)> = notes.iter().copied().zip(canons).collect();
        EngineMap::from_json(&engine_json(id, &notes).to_string()).unwrap()
    }

    fn ranked(catalog: &Catalog, midi: &[u8]) -> (u32, Vec<(String, u32)>) {
        let fits = source_fits(catalog, &note_hits(midi, ChannelScope::Auto).unwrap());
        let ranked = fits
            .ranked()
            .iter()
            .map(|fit| (fit.engine().id().to_owned(), fit.recognized()))
            .collect();
        (fits.hits(), ranked)
    }

    fn three_engines() -> Catalog {
        Catalog::from_maps([
            engine("a_partial", &[36]),
            engine("b_none", &[60]),
            engine("c_full", &[36, 38, 42]),
            engine("d_partial", &[36, 61]),
        ])
        .unwrap()
    }

    #[test]
    fn source_fits_rank_engines_by_the_hits_they_recognize_ties_in_catalog_order() {
        let midi = drums(&[(0, on(36)), (0, on(36)), (0, on(38)), (0, on(42))]);
        assert_eq!(
            ranked(&three_engines(), &midi),
            (
                4,
                vec![
                    ("c_full".to_owned(), 4),
                    ("a_partial".to_owned(), 2),
                    ("d_partial".to_owned(), 2),
                    ("b_none".to_owned(), 0),
                ]
            )
        );
    }

    #[test]
    fn source_fits_agree_with_what_converting_removes_as_unrecognized() {
        let midi = tracks(&[
            &[(0, DRUMS, on(24)), (0, DRUMS, on(99)), (0, DRUMS, on(99))],
            &[(0, 1, on(26))],
        ]);
        let catalog = Catalog::builtin().unwrap();
        let hits = note_hits(&midi, ChannelScope::Auto).unwrap();
        let src = catalog.get("ggd_invasion").unwrap();
        let tgt = catalog.get("ezdrummer").unwrap();
        let mapping = Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest);
        let report = convert(&midi, &mapping, ChannelScope::Auto).unwrap().report;
        let fits = source_fits(&catalog, &hits);
        let fit = fits
            .ranked()
            .iter()
            .find(|fit| fit.engine().id() == "ggd_invasion")
            .unwrap();
        let unmapped: u32 = report.unmapped_source().map(|(_, count)| count).sum();
        assert_eq!(
            (fits.hits(), fits.hits() - fit.recognized()),
            (report.hits() - report.untouched(), unmapped)
        );
    }
}
