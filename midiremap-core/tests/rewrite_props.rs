use std::collections::{BTreeMap, BTreeSet, HashMap};

use midiremap_core::{
    convert, Catalog, Channel, ChannelScope, Conversion, Converted, Mapping, MissingDrums,
    Overrides, Part, Unrecognized,
};
use midiremap_testkit::{cc, choke, event, hits, off, on, silent_on, smf, DRUMS};
use midly::{
    num::{u14, u24, u28, u7},
    MetaMessage, MidiMessage, PitchBend, Smf, TrackEvent, TrackEventKind,
};
use proptest::{prelude::*, sample::Index, test_runner::RngSeed};

#[derive(Debug, Clone)]
enum Item {
    Note {
        channel: u8,
        key: u8,
        len: u32,
        choke_at: Option<u32>,
        silent_off: bool,
    },
    Controller(u8),
    Program(u8, u8),
    Bend(u8, u16),
    Tempo,
    Text,
}

type Timed = (u32, TrackEvent<'static>);

impl Item {
    fn events(&self, at: u32) -> Vec<Timed> {
        let midi = |t, channel, message| (t, event(0, channel, message));
        let meta = |kind| {
            (
                at,
                TrackEvent {
                    delta: u28::new(0),
                    kind: TrackEventKind::Meta(kind),
                },
            )
        };
        match *self {
            Self::Note {
                channel,
                key,
                len,
                choke_at,
                silent_off,
            } => {
                let end = if silent_off { silent_on(key) } else { off(key) };
                let mut events = vec![midi(at, channel, on(key))];
                events.extend(choke_at.map(|c| midi(at + c % (len + 1), channel, choke(key))));
                events.push(midi(at + len, channel, end));
                events
            }
            Self::Controller(channel) => vec![midi(at, channel, cc())],
            Self::Program(channel, program) => vec![midi(
                at,
                channel,
                MidiMessage::ProgramChange {
                    program: u7::from_int_lossy(program),
                },
            )],
            Self::Bend(channel, bend) => vec![midi(
                at,
                channel,
                MidiMessage::PitchBend {
                    bend: PitchBend(u14::from_int_lossy(bend)),
                },
            )],
            Self::Tempo => vec![meta(MetaMessage::Tempo(u24::new(500_000)))],
            Self::Text => vec![meta(MetaMessage::Text(b"fill"))],
        }
    }
}

fn channel() -> impl Strategy<Value = u8> {
    prop_oneof![Just(DRUMS), Just(1u8), 1u8..=16]
}

fn item() -> impl Strategy<Value = Item> {
    prop_oneof![
        6 => (channel(), 0u8..=127, 0u32..=2000, proptest::option::of(0u32..=2000), any::<bool>())
            .prop_map(|(channel, key, len, choke_at, silent_off)| Item::Note {
                channel,
                key,
                len,
                choke_at,
                silent_off,
            }),
        1 => channel().prop_map(Item::Controller),
        1 => (channel(), 0u8..=127).prop_map(|(c, p)| Item::Program(c, p)),
        1 => (channel(), 0u16..16384).prop_map(|(c, b)| Item::Bend(c, b)),
        1 => Just(Item::Tempo),
        1 => Just(Item::Text),
    ]
}

fn track_items() -> impl Strategy<Value = Vec<(u32, Item)>> {
    prop::collection::vec((0u32..=2000, item()), 0..40)
}

fn file() -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(track_items(), 1..=4).prop_map(|tracks| {
        smf(tracks
            .iter()
            .map(|items| {
                let mut timed: Vec<Timed> = Vec::new();
                let mut at = 0;
                for (gap, item) in items {
                    at += gap;
                    timed.extend(item.events(at));
                }
                timed.sort_by_key(|(t, _)| *t);
                let mut last = 0;
                timed
                    .into_iter()
                    .map(|(t, mut ev)| {
                        ev.delta = u28::new(t - last);
                        last = t;
                        ev
                    })
                    .collect()
            })
            .collect())
    })
}

fn scope() -> impl Strategy<Value = ChannelScope> {
    prop_oneof![
        Just(ChannelScope::Auto),
        Just(ChannelScope::All),
        (1u8..=16).prop_map(|c| ChannelScope::Only(Channel::new(c).unwrap())),
    ]
}

#[derive(Debug, Clone)]
struct Pair {
    src: &'static str,
    tgt: &'static str,
    missing: MissingDrums,
    unrecognized: Unrecognized,
}

impl Pair {
    fn mapping(&self) -> Mapping<'static> {
        self.mapping_with(self.unrecognized)
    }

    fn mapping_with(&self, unrecognized: Unrecognized) -> Mapping<'static> {
        let engine = |id| Catalog::shared().get(id).unwrap();
        Mapping::new(
            engine(self.src),
            engine(self.tgt),
            &Overrides::default(),
            self.missing,
        )
        .with_unrecognized(unrecognized)
    }
}

fn pair() -> impl Strategy<Value = Pair> {
    let ids: Vec<&'static str> = Catalog::shared().ids().collect();
    let missing = prop_oneof![Just(MissingDrums::Nearest), Just(MissingDrums::Drop)];
    let unrecognized = prop_oneof![Just(Unrecognized::Remove), Just(Unrecognized::Keep)];
    (any::<Index>(), any::<Index>(), missing, unrecognized).prop_map(
        move |(src, tgt, missing, unrecognized)| Pair {
            src: ids[src.index(ids.len())],
            tgt: ids[tgt.index(ids.len())],
            missing,
            unrecognized,
        },
    )
}

fn absolute(bytes: &[u8]) -> Vec<Vec<(u64, TrackEventKind<'_>)>> {
    Smf::parse(bytes)
        .unwrap()
        .tracks
        .into_iter()
        .map(|track| {
            let mut tick = 0u64;
            track
                .into_iter()
                .map(|ev| {
                    tick += u64::from(ev.delta.as_int());
                    (tick, ev.kind)
                })
                .collect()
        })
        .collect()
}

fn keyless(kind: TrackEventKind<'_>) -> TrackEventKind<'_> {
    let zero = u7::new(0);
    match kind {
        TrackEventKind::Midi { channel, message } => TrackEventKind::Midi {
            channel,
            message: match message {
                MidiMessage::NoteOn { vel, .. } => MidiMessage::NoteOn { key: zero, vel },
                MidiMessage::NoteOff { vel, .. } => MidiMessage::NoteOff { key: zero, vel },
                MidiMessage::Aftertouch { vel, .. } => MidiMessage::Aftertouch { key: zero, vel },
                other => other,
            },
        },
        other => other,
    }
}

fn is_note(kind: &TrackEventKind) -> bool {
    matches!(
        kind,
        TrackEventKind::Midi {
            message: MidiMessage::NoteOn { .. }
                | MidiMessage::NoteOff { .. }
                | MidiMessage::Aftertouch { .. },
            ..
        }
    )
}

fn is_thinned(input: &[(u64, TrackEventKind)], output: &[(u64, TrackEventKind)]) -> bool {
    let mut rest = output.iter().map(|&(t, k)| (t, keyless(k))).peekable();
    for &(tick, kind) in input {
        if rest.peek() == Some(&(tick, keyless(kind))) {
            rest.next();
        } else if !is_note(&kind) {
            return false;
        }
    }
    rest.next().is_none()
}

fn balanced(track: &[(u64, TrackEventKind)]) -> bool {
    let mut sounding: HashMap<(u8, u8), i64> = HashMap::new();
    for (_, kind) in track {
        let (channel, key, step) = match *kind {
            TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOn { key, vel },
            } => (channel, key, if vel.as_int() > 0 { 1 } else { -1 }),
            TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOff { key, .. },
            } => (channel, key, -1),
            _ => continue,
        };
        let count = sounding
            .entry((channel.as_int(), key.as_int()))
            .or_default();
        *count += step;
        if *count < 0 {
            return false;
        }
    }
    sounding.values().all(|&n| n == 0)
}

/// The conversion of `midi`, or `None` when `Auto` asks which parts are the drums.
fn converted(midi: &[u8], mapping: &Mapping, scope: ChannelScope) -> Option<Converted> {
    convert(midi, mapping, scope, None).unwrap().done()
}

/// The hits of each part of `midi`, named `track:channel` counted from 1, read straight
/// from the file.
fn part_hits_of(midi: &[u8]) -> BTreeMap<String, u32> {
    let mut hits = BTreeMap::new();
    for (index, track) in Smf::parse(midi).unwrap().tracks.iter().enumerate() {
        for ev in track {
            if let TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOn { vel, .. },
            } = ev.kind
            {
                if vel.as_int() > 0 {
                    *hits
                        .entry(format!("{}:{}", index + 1, channel.as_int() + 1))
                        .or_default() += 1;
                }
            }
        }
    }
    hits
}

fn names(parts: &[Part]) -> BTreeSet<String> {
    parts.iter().map(ToString::to_string).collect()
}

proptest! {
    #![proptest_config(ProptestConfig {
        rng_seed: RngSeed::Fixed(20_261_114),
        ..ProptestConfig::default()
    })]

    #[test]
    fn kept_events_keep_their_ticks_and_only_notes_are_removed(
        midi in file(),
        pair in pair(),
        scope in scope(),
    ) {
        let Some(out) = converted(&midi, &pair.mapping(), scope) else { return Ok(()) };
        let (before, after) = (Smf::parse(&midi).unwrap(), Smf::parse(&out.bytes).unwrap());
        prop_assert_eq!(before.header, after.header);
        let (input, output) = (absolute(&midi), absolute(&out.bytes));
        prop_assert_eq!(input.len(), output.len());
        for (i, o) in input.iter().zip(&output) {
            prop_assert!(is_thinned(i, o), "input {:?}\noutput {:?}", i, o);
        }
    }

    #[test]
    fn notes_stay_paired(midi in file(), pair in pair(), scope in scope()) {
        let Some(out) = converted(&midi, &pair.mapping(), scope) else { return Ok(()) };
        for track in absolute(&out.bytes) {
            prop_assert!(balanced(&track), "{:?}", track);
        }
    }

    #[test]
    fn auto_converts_channel_10_else_the_one_part_else_asks(midi in file(), pair in pair()) {
        let present = part_hits_of(&midi);
        let all: BTreeSet<String> = present.keys().cloned().collect();
        let drums: BTreeSet<String> = all.iter().filter(|p| p.ends_with(":10")).cloned().collect();
        match convert(&midi, &pair.mapping(), ChannelScope::Auto, None).unwrap() {
            Conversion::Done(out) => {
                let picked = names(&out.picked);
                if drums.is_empty() {
                    prop_assert!(all.len() <= 1, "converted {:?} of {:?}", picked, all);
                    prop_assert_eq!(&picked, &all);
                } else {
                    prop_assert_eq!(&picked, &drums);
                }
                let outside: u32 = present.iter().filter(|(p, _)| !picked.contains(*p)).map(|(_, n)| n).sum();
                prop_assert_eq!(out.report.untouched(), outside);
            }
            Conversion::Ask { parts, .. } => {
                prop_assert!(drums.is_empty() && all.len() > 1, "asked about {:?}", all);
                prop_assert_eq!(names(&parts), all);
            }
        }
    }

    #[test]
    fn every_hit_is_counted_once(midi in file(), pair in pair(), scope in scope()) {
        let Some(out) = converted(&midi, &pair.mapping(), scope) else { return Ok(()) };
        let report = out.report;
        prop_assert_eq!(report.hits(), hits(&midi));
    }

    #[test]
    fn a_cut_file_converts_every_hit_or_reports_its_damage(
        midi in file(),
        pair in pair(),
        cut in any::<Index>(),
    ) {
        let whole = converted(&midi, &pair.mapping(), ChannelScope::All).unwrap();
        prop_assert!(whole.damage.is_empty(), "{:?}", whole.damage);
        let short = &midi[..cut.index(midi.len())];
        if let Ok(Conversion::Done(read)) = convert(short, &pair.mapping(), ChannelScope::All, None) {
            prop_assert!(
                !read.damage.is_empty() || read.report.hits() == whole.report.hits(),
                "cut to {} of {} bytes: {} of {} hits, no damage",
                short.len(),
                midi.len(),
                read.report.hits(),
                whole.report.hits()
            );
        }
    }

    #[test]
    fn keeping_unrecognized_notes_changes_no_count(
        midi in file(),
        pair in pair(),
        scope in scope(),
    ) {
        let kept = converted(&midi, &pair.mapping_with(Unrecognized::Keep), scope);
        let removed = converted(&midi, &pair.mapping_with(Unrecognized::Remove), scope);
        prop_assert_eq!(kept.map(|k| k.report), removed.map(|r| r.report));
    }

    #[test]
    fn keeping_unrecognized_notes_writes_each_of_their_hits(
        midi in file(),
        pair in pair(),
        scope in scope(),
    ) {
        let Some(out) = converted(&midi, &pair.mapping_with(Unrecognized::Keep), scope) else { return Ok(()) };
        let unrecognized: u32 = out.report.unmapped_source().map(|(_, count)| count).sum();
        let written = out.report.converted() + unrecognized + out.report.untouched();
        prop_assert_eq!(hits(&out.bytes), written);
    }
}

#[test]
fn generated_input_is_itself_paired() {
    let mut runner = proptest::test_runner::TestRunner::default();
    runner
        .run(&file(), |midi| {
            for track in absolute(&midi) {
                prop_assert!(balanced(&track));
            }
            Ok(())
        })
        .unwrap();
}
