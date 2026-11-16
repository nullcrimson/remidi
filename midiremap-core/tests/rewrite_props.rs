use std::collections::{BTreeMap, BTreeSet, HashMap};

use midiremap_core::{
    convert, AskReason, Canon, Catalog, Channel, ChannelScope, Conversion, Converted, Mapping,
    MissingDrums, Note, Outcome, Overrides, Part, Report, UnmappedFate, Unrecognized,
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

/// The ticks between one item and the next: often none, so that hits meet at one tick.
fn gap() -> impl Strategy<Value = u32> {
    prop_oneof![1 => Just(0u32), 3 => 0u32..=2000]
}

fn track_items() -> impl Strategy<Value = Vec<(u32, Item)>> {
    prop::collection::vec((gap(), item()), 0..40)
}

/// The events of one track of `items`; unless `self_overlaps`, a note that would start while
/// the same note on its channel still sounds is left out, and so is a note of no length,
/// which ends at the tick it starts.
fn track_of(items: &[(u32, Item)], self_overlaps: bool) -> Vec<TrackEvent<'static>> {
    let mut timed: Vec<Timed> = Vec::new();
    let mut ends: HashMap<(u8, u8), u32> = HashMap::new();
    let mut at = 0;
    for (gap, item) in items {
        at += gap;
        if let Item::Note {
            channel, key, len, ..
        } = *item
        {
            let sounds = ends.get(&(channel, key)).is_some_and(|&end| end > at);
            if !self_overlaps && (sounds || len == 0) {
                continue;
            }
            ends.insert((channel, key), at + len);
        }
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
}

fn file_with(self_overlaps: bool) -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(track_items(), 1..=4).prop_map(move |tracks| {
        smf(tracks
            .iter()
            .map(|items| track_of(items, self_overlaps))
            .collect())
    })
}

fn file() -> impl Strategy<Value = Vec<u8>> {
    file_with(true)
}

/// Files in which no note overlaps the same note on its channel in its track, and every note
/// lasts at least a tick.
fn file_without_self_overlaps() -> impl Strategy<Value = Vec<u8>> {
    file_with(false)
}

/// Whether, on every key of the channels `picked` names in each track, no two notes sound
/// at once and none starts twice at one tick.
fn one_note_per_key(bytes: &[u8], picked: &[Part]) -> bool {
    let converted: BTreeSet<String> = picked.iter().map(ToString::to_string).collect();
    absolute(bytes).iter().enumerate().all(|(index, track)| {
        let mut sounding: HashMap<(u8, u8), u32> = HashMap::new();
        let mut started: HashMap<(u8, u8), u64> = HashMap::new();
        track.iter().all(|&(tick, kind)| {
            let TrackEventKind::Midi { channel, message } = kind else {
                return true;
            };
            if !converted.contains(&format!("{}:{}", index + 1, channel.as_int() + 1)) {
                return true;
            }
            match message {
                MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => {
                    let at = (channel.as_int(), key.as_int());
                    let count = sounding.entry(at).or_default();
                    *count += 1;
                    let twice = started.insert(at, tick) == Some(tick);
                    *count == 1 && !twice
                }
                MidiMessage::NoteOn { key, .. } | MidiMessage::NoteOff { key, .. } => {
                    let count = sounding
                        .entry((channel.as_int(), key.as_int()))
                        .or_default();
                    *count = count.saturating_sub(1);
                    true
                }
                MidiMessage::Aftertouch { .. }
                | MidiMessage::Controller { .. }
                | MidiMessage::ProgramChange { .. }
                | MidiMessage::ChannelAftertouch { .. }
                | MidiMessage::PitchBend { .. } => true,
            }
        })
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

/// Whether `written` is `read` as a conversion may write it: the same event at the same
/// tick, but for the key of a note event, and a note-on's velocity, which a hit merged into
/// it may raise.
fn writes(read: (u64, TrackEventKind), written: (u64, TrackEventKind)) -> bool {
    let (read, written) = ((read.0, keyless(read.1)), (written.0, keyless(written.1)));
    match (read.1, written.1) {
        (
            TrackEventKind::Midi {
                channel: from,
                message: MidiMessage::NoteOn { vel: before, .. },
            },
            TrackEventKind::Midi {
                channel: to,
                message: MidiMessage::NoteOn { vel: after, .. },
            },
        ) if before.as_int() > 0 => read.0 == written.0 && from == to && after >= before,
        _ => read == written,
    }
}

/// Whether the event `at` of `output` is a release a retrigger inserted: a `NoteOff` of
/// velocity 0 that only the same release and then a hit on its channel and key follow at its
/// tick.
fn is_inserted_off(output: &[(u64, TrackEventKind)], at: usize) -> bool {
    let (tick, kind) = output[at];
    let TrackEventKind::Midi {
        channel,
        message: MidiMessage::NoteOff { key, vel },
    } = kind
    else {
        return false;
    };
    vel.as_int() == 0
        && output[at + 1..]
            .iter()
            .take_while(|&&(t, _)| t == tick)
            .find(|&&(_, next)| next != kind)
            .is_some_and(|&(_, next)| {
                matches!(
                    next,
                    TrackEventKind::Midi {
                        channel: c,
                        message: MidiMessage::NoteOn { key: k, vel: v },
                    } if c == channel && k == key && v.as_int() > 0
                )
            })
}

/// Whether `output` is `input` with each event written as [`writes`] allows or, for a note
/// event, removed, and with the releases a retrigger inserts before a hit.
fn is_thinned(input: &[(u64, TrackEventKind)], output: &[(u64, TrackEventKind)]) -> bool {
    let mut at = 0;
    for &read in input {
        let matches = |at: usize| output.get(at).is_some_and(|&out| writes(read, out));
        while !matches(at) && at < output.len() && is_inserted_off(output, at) {
            at += 1;
        }
        if matches(at) {
            at += 1;
        } else if !is_note(&read.1) {
            return false;
        }
    }
    at == output.len()
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
    convert(midi, mapping, scope).unwrap().done()
}

type Counts = (
    Vec<(Note, u32)>,
    Vec<(Canon, Canon, Note, u32)>,
    Vec<(Canon, u32)>,
    u32,
    u32,
);

/// Every count of `report`: each unrecognized note with its hits but not what became of
/// them, each stand-in, each dropped drum, the untouched and the converted hits.
fn counts(report: &Report) -> Counts {
    (
        report
            .unmapped_source()
            .map(|(note, unmapped)| (note, unmapped.hits))
            .collect(),
        report
            .fallback_used()
            .map(|(canon, t)| (canon, t.stand_in, t.note, t.count))
            .collect(),
        report.dropped().collect(),
        report.untouched(),
        report.converted(),
    )
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

/// The note of every hit on channel 10 in `midi`, read straight from the file.
fn channel_ten_notes(midi: &[u8]) -> Vec<Note> {
    Smf::parse(midi)
        .unwrap()
        .tracks
        .iter()
        .flatten()
        .filter_map(|ev| match ev.kind {
            TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOn { key, vel },
            } if channel.as_int() == DRUMS - 1 && vel.as_int() > 0 => Note::new(key.as_int()),
            TrackEventKind::Midi { .. }
            | TrackEventKind::SysEx(_)
            | TrackEventKind::Escape(_)
            | TrackEventKind::Meta(_) => None,
        })
        .collect()
}

/// Whether channel 10 of `midi` has hits on notes the source of `mapping` knows, and
/// `mapping` drops every one of them.
fn channel_ten_unplayed(midi: &[u8], mapping: &Mapping) -> bool {
    let known: Vec<Outcome> = channel_ten_notes(midi)
        .into_iter()
        .filter_map(|note| mapping.get(note))
        .collect();
    !known.is_empty()
        && known
            .iter()
            .all(|outcome| matches!(outcome, Outcome::Dropped { .. }))
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
        let mapping = pair.mapping();
        let unplayed = drums.len() < all.len() && channel_ten_unplayed(&midi, &mapping);
        match convert(&midi, &mapping, ChannelScope::Auto).unwrap() {
            Conversion::Done(out) => {
                let picked = names(&out.picked);
                if drums.is_empty() {
                    prop_assert!(all.len() <= 1, "converted {:?} of {:?}", picked, all);
                    prop_assert_eq!(&picked, &all);
                } else {
                    prop_assert!(!unplayed, "converted {:?}, which plays none of its known hits", picked);
                    prop_assert_eq!(&picked, &drums);
                }
                let outside: u32 = present.iter().filter(|(p, _)| !picked.contains(*p)).map(|(_, n)| n).sum();
                prop_assert_eq!(out.report.untouched(), outside);
            }
            Conversion::Ask { parts, why, .. } => {
                match why {
                    AskReason::NoChannelTen => {
                        prop_assert!(drums.is_empty() && all.len() > 1, "asked about {:?}", all);
                    }
                    AskReason::ChannelTenUnplayed => {
                        prop_assert!(!drums.is_empty() && unplayed, "asked about {:?}", all);
                    }
                }
                prop_assert_eq!(names(&Vec::from(parts)), all);
            }
        }
    }

    #[test]
    fn no_key_sounds_two_notes_at_once_where_no_source_note_overlaps_itself_or_lasts_no_time(
        midi in file_without_self_overlaps(),
        pair in pair(),
        scope in scope(),
    ) {
        let Some(out) = converted(&midi, &pair.mapping(), scope) else { return Ok(()) };
        prop_assert!(one_note_per_key(&out.bytes, &out.picked), "{:?}", absolute(&out.bytes));
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
        if let Ok(Conversion::Done(read)) = convert(short, &pair.mapping(), ChannelScope::All) {
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
        let (kept, removed) = (kept.map(|k| k.report), removed.map(|r| r.report));
        prop_assert_eq!(kept.as_ref().map(counts), removed.as_ref().map(counts));
        let fates = |report: Option<&Report>| -> Vec<bool> {
            report
                .into_iter()
                .flat_map(Report::unmapped_source)
                .map(|(_, unmapped)| unmapped.fate == UnmappedFate::Removed)
                .collect()
        };
        prop_assert!(fates(kept.as_ref()).iter().all(|&removed| !removed));
        prop_assert!(fates(removed.as_ref()).iter().all(|&removed| removed));
    }

    #[test]
    fn keeping_unrecognized_notes_writes_each_of_their_hits(
        midi in file(),
        pair in pair(),
        scope in scope(),
    ) {
        let Some(out) = converted(&midi, &pair.mapping_with(Unrecognized::Keep), scope) else { return Ok(()) };
        let unrecognized: u32 = out.report.unmapped_source().map(|(_, u)| u.hits).sum();
        let written = out.report.converted() + unrecognized + out.report.untouched() - out.report.merged();
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
