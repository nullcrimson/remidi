use std::collections::HashMap;

use midiremap_core::{convert, Catalog, Channel, ChannelScope, Mapping, MissingDrums, Overrides};
use midiremap_testkit::{cc, choke, event, off, on, silent_on, smf, DRUMS};
use midly::{
    num::{u14, u24, u28, u7},
    MetaMessage, MidiMessage, PitchBend, Smf, TrackEvent, TrackEventKind,
};
use proptest::{prelude::*, sample::Index};

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
}

impl Pair {
    fn mapping(&self) -> Mapping {
        let engine = |id| Catalog::shared().unwrap().get(id).unwrap();
        Mapping::new(
            engine(self.src),
            engine(self.tgt),
            &Overrides::default(),
            self.missing,
        )
    }
}

fn pair() -> impl Strategy<Value = Pair> {
    let ids: Vec<&'static str> = Catalog::shared().unwrap().ids().collect();
    let missing = prop_oneof![Just(MissingDrums::Nearest), Just(MissingDrums::Drop)];
    (any::<Index>(), any::<Index>(), missing).prop_map(move |(src, tgt, missing)| Pair {
        src: ids[src.index(ids.len())],
        tgt: ids[tgt.index(ids.len())],
        missing,
    })
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

fn hits(bytes: &[u8]) -> u32 {
    let count = absolute(bytes)
        .iter()
        .flatten()
        .filter(|(_, kind)| {
            matches!(
                kind,
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { vel, .. },
                    ..
                } if vel.as_int() > 0
            )
        })
        .count();
    u32::try_from(count).unwrap()
}

proptest! {
    #[test]
    fn kept_events_keep_their_ticks_and_only_notes_are_removed(
        midi in file(),
        pair in pair(),
        scope in scope(),
    ) {
        let out = convert(&midi, &pair.mapping(), scope).unwrap();
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
        let out = convert(&midi, &pair.mapping(), scope).unwrap();
        for track in absolute(&out.bytes) {
            prop_assert!(balanced(&track), "{:?}", track);
        }
    }

    #[test]
    fn every_hit_is_counted_once(midi in file(), pair in pair(), scope in scope()) {
        let report = convert(&midi, &pair.mapping(), scope).unwrap().report;
        prop_assert_eq!(report.hits(), hits(&midi));
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
