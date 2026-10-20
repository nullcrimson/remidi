use std::iter::once;

use midly::{
    num::{u15, u24, u28, u7},
    Format, Header, MetaMessage, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
};
use strum::VariantArray;

use crate::{
    canon::{
        Canon, CymArtic, CymSlot, HatOpen, HatZone, KickKind, RideArtic, RideIdx, SnareArtic,
        SnareIdx,
    },
    channel::Channel,
    engine_map::EngineMap,
    idx::Idx,
    midi::{self, CodecError},
};

const TICKS_PER_BEAT: u16 = 480;
const TICKS_PER_STEP: u32 = TICKS_PER_BEAT as u32 / 2;
const TICKS_HELD: u32 = TICKS_PER_STEP / 2;
const STEPS_PER_BAR: u32 = 8;
const BARS: u32 = 2;
const STEPS: u32 = BARS * STEPS_PER_BAR;
const TEMPO_120_BPM: MetaMessage<'static> = MetaMessage::Tempo(u24::new(500_000));
const FOUR_FOUR: MetaMessage<'static> = MetaMessage::TimeSignature(4, 2, 24, 8);

#[derive(Clone, Copy, VariantArray)]
enum Voice {
    Crash,
    Kick,
    Snare,
    Hat,
}

impl Voice {
    fn drums(self) -> &'static [Canon] {
        match self {
            Self::Crash => &[Canon::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit)],
            Self::Kick => &[Canon::Kick(KickKind::Main)],
            Self::Snare => &[Canon::Snare(SnareIdx::FIRST, SnareArtic::Hit)],
            Self::Hat => &[
                Canon::Hat(HatOpen::Closed, HatZone::Plain),
                Canon::Ride(RideIdx::FIRST, RideArtic::Bow),
            ],
        }
    }

    fn velocity_at(self, step: u32) -> Option<u7> {
        let in_bar = step % STEPS_PER_BAR;
        let velocity = match self {
            Self::Crash => (step == 0).then_some(120),
            Self::Kick => matches!(in_bar, 0 | 4 | 5).then_some(110),
            Self::Snare => matches!(in_bar, 2 | 6).then_some(105),
            Self::Hat if step == 0 => None,
            Self::Hat => Some(if in_bar.is_multiple_of(2) { 90 } else { 65 }),
        };
        velocity.map(u7::new)
    }
}

/// A short groove to try the converter with: two bars of 4/4 at 120 bpm on the drum channel,
/// eighth notes on the closed hi-hat (the ride on an engine without one) over kick and snare,
/// and a crash on the first beat. Each drum plays on the note `engine` plays it on, or on its
/// nearest stand-in's; a drum with neither is left out.
pub fn sample_file(engine: &EngineMap) -> Result<Vec<u8>, CodecError> {
    let voices: Vec<(Voice, u7)> = Voice::VARIANTS
        .iter()
        .filter_map(|&voice| {
            let note = voice
                .drums()
                .iter()
                .flat_map(|&drum| once(drum).chain(drum.fallback_chain().iter().copied()))
                .find_map(|drum| engine.encode(drum))?;
            Some((voice, note.key()))
        })
        .collect();
    let channel = Channel::DRUMS.wire();
    let mut track = Track::new();
    let mut last = 0;
    let mut add = |tick: u32, kind| {
        track.push(TrackEvent {
            delta: u28::new(tick - last),
            kind,
        });
        last = tick;
    };
    for meta in [TEMPO_120_BPM, FOUR_FOUR] {
        add(0, TrackEventKind::Meta(meta));
    }
    for step in 0..STEPS {
        let tick = step * TICKS_PER_STEP;
        for &(voice, key) in &voices {
            if let Some(vel) = voice.velocity_at(step) {
                let message = MidiMessage::NoteOn { key, vel };
                add(tick, TrackEventKind::Midi { channel, message });
            }
        }
        for &(voice, key) in &voices {
            if voice.velocity_at(step).is_some() {
                let vel = u7::new(0);
                let message = MidiMessage::NoteOff { key, vel };
                add(tick + TICKS_HELD, TrackEventKind::Midi { channel, message });
            }
        }
    }
    add(
        STEPS * TICKS_PER_STEP,
        TrackEventKind::Meta(MetaMessage::EndOfTrack),
    );
    midi::write(&Smf {
        header: Header::new(
            Format::SingleTrack,
            Timing::Metrical(u15::new(TICKS_PER_BEAT)),
        ),
        tracks: vec![track],
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use midiremap_testkit::{engine_json, events, hit_keys, DRUMS};

    use super::*;
    use crate::{
        catalog::Catalog,
        channel::ChannelScope,
        fit::{note_hits, source_fits},
    };

    const HITS_PER_GROOVE: u32 = 1 + 6 + 4 + 15;

    fn engine(notes: &[(u8, &str)]) -> EngineMap {
        EngineMap::from_json(&engine_json("kit", notes).to_string()).unwrap()
    }

    #[test]
    fn every_builtin_engines_sample_parses_and_that_engine_recognizes_its_every_hit() {
        let catalog = Catalog::builtin().unwrap();
        let unrecognized: Vec<String> = catalog
            .engines()
            .filter_map(|engine| {
                let hits = note_hits(&sample_file(engine).unwrap(), ChannelScope::Auto).unwrap();
                let fits = source_fits(&catalog, &hits);
                let fit = fits
                    .ranked()
                    .iter()
                    .find(|fit| fit.engine().id() == engine.id())
                    .expect("every engine of the catalog is fitted");
                (fits.hits() != HITS_PER_GROOVE || fit.recognized() != fits.hits()).then(|| {
                    format!(
                        "{}: {} of {} hits",
                        engine.id(),
                        fit.recognized(),
                        fits.hits()
                    )
                })
            })
            .collect();
        assert!(unrecognized.is_empty(), "{unrecognized:?}");
    }

    #[test]
    fn the_sample_plays_the_engines_own_kick_snare_closed_hat_and_crash() {
        let catalog = Catalog::builtin().unwrap();
        let gm = catalog.get("general_midi").unwrap();
        let keys: BTreeSet<u8> = hit_keys(&sample_file(gm).unwrap()).into_iter().collect();
        let own: BTreeSet<u8> = Voice::VARIANTS
            .iter()
            .map(|voice| gm.encode(voice.drums()[0]).unwrap().get())
            .collect();
        assert_eq!(keys, own);
    }

    #[test]
    fn the_sample_opens_on_the_crash_and_the_kick() {
        let kit = engine(&[
            (36, "kick.main"),
            (38, "snare1.hit"),
            (42, "hat.closed"),
            (49, "crash.1.hit"),
        ]);
        assert_eq!(hit_keys(&sample_file(&kit).unwrap())[..3], [49, 36, 42]);
    }

    #[test]
    fn the_sample_is_on_the_drum_channel() {
        let kit = engine(&[(36, "kick.main"), (38, "snare1.hit")]);
        let bytes = sample_file(&kit).unwrap();
        assert!(events(&bytes, 0)
            .iter()
            .all(|&(_, channel, _)| channel == DRUMS));
    }

    #[test]
    fn the_sample_is_two_bars_of_four_four_at_120_bpm() {
        let kit = engine(&[(36, "kick.main")]);
        let bytes = sample_file(&kit).unwrap();
        let smf = midi::parse(&bytes).unwrap();
        let track = &smf.tracks[0];
        let ticks: u32 = track.iter().map(|ev| ev.delta.as_int()).sum();
        let metas: Vec<MetaMessage> = track
            .iter()
            .filter_map(|ev| match ev.kind {
                TrackEventKind::Meta(meta) => Some(meta),
                _ => None,
            })
            .collect();
        assert_eq!(
            (smf.header.timing, ticks, metas),
            (
                Timing::Metrical(u15::new(480)),
                2 * 4 * 480,
                vec![
                    MetaMessage::Tempo(u24::new(500_000)),
                    MetaMessage::TimeSignature(4, 2, 24, 8),
                    MetaMessage::EndOfTrack,
                ]
            )
        );
    }

    #[test]
    fn a_drum_the_engine_lacks_plays_on_its_nearest_stand_in() {
        let kit = engine(&[(36, "kick.main"), (57, "crash.2.hit")]);
        let keys: BTreeSet<u8> = hit_keys(&sample_file(&kit).unwrap()).into_iter().collect();
        assert_eq!(keys, BTreeSet::from([36, 57]));
    }

    #[test]
    fn the_ride_keeps_time_on_an_engine_without_a_closed_hi_hat() {
        let kit = engine(&[(36, "kick.main"), (45, "hat.open1"), (51, "ride.1")]);
        let keys: BTreeSet<u8> = hit_keys(&sample_file(&kit).unwrap()).into_iter().collect();
        assert_eq!(keys, BTreeSet::from([36, 51]));
    }

    #[test]
    fn a_drum_with_no_stand_in_is_left_out() {
        let kit = engine(&[(36, "kick.main")]);
        assert_eq!(hit_keys(&sample_file(&kit).unwrap()), [36; 6]);
    }
}
