use std::collections::{BTreeMap, VecDeque};

use midiremap_mapping::{Destination, Mapping};
use midiremap_note::Note;
use midiremap_smf::{
    midi::{
        channel_from_wire, hit, is_closed, note_from_key, note_key, ChannelFilter, CodecError,
        END_OF_TRACK,
    },
    parts::TrackFilters,
};
use midly::{
    num::{u28, u4, u7},
    MidiMessage, Smf, Track, TrackEvent, TrackEventKind,
};

use super::report::{Report, UnmappedFate};

/// The ticks since the last event written, which the next one written carries so that
/// timing does not shift when events are removed.
#[derive(Default)]
struct DeltaFold(u28);

impl DeltaFold {
    /// Folds in the `delta` of the next event read; a gap past the `u28` maximum fails.
    fn add(&mut self, delta: u28) -> Result<(), CodecError> {
        self.0 =
            u28::try_from(self.0.as_int() + delta.as_int()).ok_or(CodecError::DeltaOverflow)?;
        Ok(())
    }

    /// The delta the next event written carries: every delta folded in since the last one.
    fn take(&mut self) -> u28 {
        std::mem::take(&mut self.0)
    }
}

/// How a file writes the release of a note: a note-off, or a note-on without velocity.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Release {
    NoteOff,
    SilentNoteOn,
}

impl Release {
    fn message(self, key: u7, vel: u7) -> MidiMessage {
        match self {
            Self::NoteOff => MidiMessage::NoteOff { key, vel },
            Self::SilentNoteOn => MidiMessage::NoteOn { key, vel },
        }
    }
}

/// One event of a conversion as `step` decides it on its own; the key a release or a choke
/// goes to is decided by the track's [`Voicing`].
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Stepped<'a> {
    /// Stays as it is: an event that is no note, or one on a channel the scope leaves alone,
    /// `untouched` when it is a hit there, which the report counts.
    Pass {
        kind: TrackEventKind<'a>,
        untouched: bool,
    },
    /// A hit on `source` on a channel in scope: written on `key`, or removed when nothing
    /// plays it.
    Hit {
        channel: u4,
        source: Note,
        vel: u7,
        key: Option<u7>,
    },
    /// The release of `source` on a channel in scope; `mapped` is the key the mapping gives
    /// `source`, or `None` when nothing plays it.
    Off {
        channel: u4,
        source: Note,
        vel: u7,
        form: Release,
        mapped: Option<u7>,
    },
    /// Poly aftertouch on `source` (a choke) on a channel in scope; `mapped` as for a release.
    Choke {
        channel: u4,
        source: Note,
        vel: u7,
        mapped: Option<u7>,
    },
}

/// One event of a conversion, when `filter` accepts its channel moved to where `mapping`
/// plays its source note: a hit to the key of its destination, a release or a choke with the
/// key the mapping gives, for the voicing to follow when it holds no hit of that note.
fn step<'a>(mapping: &Mapping, filter: ChannelFilter, kind: TrackEventKind<'a>) -> Stepped<'a> {
    let TrackEventKind::Midi { channel, message } = kind else {
        return Stepped::Pass {
            kind,
            untouched: false,
        };
    };
    if !filter.accepts(channel_from_wire(channel)) {
        return Stepped::Pass {
            kind,
            untouched: hit(&kind).is_some(),
        };
    }
    let mapped = |key: u7| {
        let source = note_from_key(key);
        let to = mapping.destination(source).map(|to| note_key(to.note()));
        (source, to)
    };
    let off = |key, vel, form| {
        let (source, mapped) = mapped(key);
        Stepped::Off {
            channel,
            source,
            vel,
            form,
            mapped,
        }
    };
    match message {
        MidiMessage::NoteOn { key, vel } if vel.as_int() > 0 => {
            let (source, key) = mapped(key);
            Stepped::Hit {
                channel,
                source,
                vel,
                key,
            }
        }
        MidiMessage::NoteOn { key, vel } => off(key, vel, Release::SilentNoteOn),
        MidiMessage::NoteOff { key, vel } => off(key, vel, Release::NoteOff),
        MidiMessage::Aftertouch { key, vel } => {
            let (source, mapped) = mapped(key);
            Stepped::Choke {
                channel,
                source,
                vel,
                mapped,
            }
        }
        MidiMessage::Controller { .. }
        | MidiMessage::ProgramChange { .. }
        | MidiMessage::ChannelAftertouch { .. }
        | MidiMessage::PitchBend { .. } => Stepped::Pass {
            kind,
            untouched: false,
        },
    }
}

/// How an open hit sounds on its key: on a note-on of its own, written at `tick` as the
/// event `at` of the output, inside another hit's note-on of the same tick, or no more, since
/// another source note retriggered its key.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Sound {
    Written { at: usize, tick: u64 },
    Merged,
    Closed,
}

/// A hit still waiting for its release: the target key it went to, and how it sounds there.
#[derive(Debug, Clone, Copy)]
struct Open {
    key: u7,
    sound: Sound,
}

/// One track as it is converted: the events written so far, the ticks since the last one
/// written, the tick it has reached, and the open hits of each source note per channel, in
/// the order they came, the one table that says what sounds on a key. A release takes the
/// oldest open hit of its note and a choke aims at the newest, so both go to the key their hit
/// went to. A hit on a key where another source note sounds is not written when the newest
/// note-on there is of the same tick: it merges into that note-on, which takes the higher
/// velocity, and a note ends when the last of the hits sounding in it ends. When that note-on
/// is older, the hit retriggers the key: every note-on still open there is released first,
/// with a `NoteOff` of velocity 0, and the releases and chokes of the hits it closes go.
#[derive(Default)]
struct Voicing<'a> {
    out: Track<'a>,
    fold: DeltaFold,
    tick: u64,
    open: BTreeMap<(u4, Note), VecDeque<Open>>,
    merged: u32,
}

impl<'a> Voicing<'a> {
    fn with_capacity(events: usize) -> Self {
        Self {
            out: Vec::with_capacity(events),
            ..Self::default()
        }
    }

    /// Adds the event `stepped`, which came `delta` ticks after the one before it.
    fn push(&mut self, delta: u28, stepped: Stepped<'a>) -> Result<(), CodecError> {
        self.fold.add(delta)?;
        self.tick += u64::from(delta.as_int());
        if let Some(kind) = self.voiced(stepped) {
            self.write(kind);
        }
        Ok(())
    }

    /// The event `stepped` writes, or `None` when it goes.
    fn voiced(&mut self, stepped: Stepped<'a>) -> Option<TrackEventKind<'a>> {
        let midi = |channel, message| TrackEventKind::Midi { channel, message };
        match stepped {
            Stepped::Pass { kind, .. } => Some(kind),
            Stepped::Hit {
                channel,
                source,
                vel,
                key,
            } => {
                let key = key?;
                let sound = self.struck(channel, source, key, vel);
                self.open
                    .entry((channel, source))
                    .or_default()
                    .push_back(Open { key, sound });
                match sound {
                    Sound::Written { .. } => Some(midi(channel, MidiMessage::NoteOn { key, vel })),
                    Sound::Merged | Sound::Closed => None,
                }
            }
            Stepped::Off {
                channel,
                source,
                vel,
                form,
                mapped,
            } => {
                let key = match self.take_oldest(channel, source) {
                    Some(hit) => self.released(channel, hit)?,
                    None => mapped?,
                };
                Some(midi(channel, form.message(key, vel)))
            }
            Stepped::Choke {
                channel,
                source,
                vel,
                mapped,
            } => {
                let key = match self.open.get(&(channel, source)) {
                    Some(hits) => hits
                        .iter()
                        .rev()
                        .find(|hit| hit.sound != Sound::Closed)
                        .map(|hit| hit.key)?,
                    None => mapped?,
                };
                Some(midi(channel, MidiMessage::Aftertouch { key, vel }))
            }
        }
    }

    /// How a hit of `source` at `vel` sounds on `key`: on a note-on of its own when no other
    /// source note sounds there; merged into the newest note-on there when that is of this
    /// tick, which then takes the higher velocity; else on a note-on of its own after a
    /// retrigger of the key.
    fn struck(&mut self, channel: u4, source: Note, key: u7, vel: u7) -> Sound {
        let written = |voicing: &Self| Sound::Written {
            at: voicing.out.len(),
            tick: voicing.tick,
        };
        if !self.sounding(channel, key).any(|(note, _)| note != source) {
            return written(self);
        }
        let newest = self
            .sounding(channel, key)
            .filter_map(|(_, sound)| match sound {
                Sound::Written { at, tick } => Some((at, tick)),
                Sound::Merged | Sound::Closed => None,
            })
            .max();
        match newest {
            Some((at, tick)) if tick == self.tick => {
                self.raise(at, vel);
                self.merged += 1;
                Sound::Merged
            }
            Some(_) | None => {
                self.retrigger(channel, key);
                written(self)
            }
        }
    }

    /// Releases `key` of `channel` for a hit that retriggers it: one `NoteOff` of velocity 0
    /// for each note-on still open there, and every hit sounding there closed.
    fn retrigger(&mut self, channel: u4, key: u7) {
        let mut open = 0;
        let hits = self
            .open
            .iter_mut()
            .filter(|((c, _), _)| *c == channel)
            .flat_map(|(_, hits)| hits.iter_mut())
            .filter(|hit| hit.key == key);
        for hit in hits {
            open += usize::from(matches!(hit.sound, Sound::Written { .. }));
            hit.sound = Sound::Closed;
        }
        let vel = u7::default();
        for _ in 0..open {
            self.write(TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOff { key, vel },
            });
        }
    }

    /// Raises the velocity of the note-on written at `at` to `vel` when it is lower.
    fn raise(&mut self, at: usize, vel: u7) {
        if let Some(TrackEvent {
            kind:
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { vel: written, .. },
                    ..
                },
            ..
        }) = self.out.get_mut(at)
        {
            *written = (*written).max(vel);
        }
    }

    /// The key the release of `hit`, just taken off the table, is written on; `None` when a
    /// retrigger closed it, or other hits still sound in its note, which then goes on for
    /// them. A written hit whose release goes hands its note-on to a hit merged into one on its
    /// key.
    fn released(&mut self, channel: u4, hit: Open) -> Option<u7> {
        if hit.sound == Sound::Closed {
            return None;
        }
        let (mut sounding, mut written) = (1, usize::from(hit.sound != Sound::Merged));
        for (_, sound) in self.sounding(channel, hit.key) {
            sounding += 1;
            written += usize::from(sound != Sound::Merged);
        }
        if sounding == written {
            return Some(hit.key);
        }
        if let Sound::Written { .. } = hit.sound {
            let heir = self
                .open
                .iter_mut()
                .filter(|((c, _), _)| *c == channel)
                .flat_map(|(_, hits)| hits.iter_mut())
                .find(|open| open.key == hit.key && open.sound == Sound::Merged);
            if let Some(heir) = heir {
                heir.sound = hit.sound;
            }
        }
        None
    }

    /// The oldest open hit of `source` on `channel`, taken off the table.
    fn take_oldest(&mut self, channel: u4, source: Note) -> Option<Open> {
        let hits = self.open.get_mut(&(channel, source))?;
        let oldest = hits.pop_front();
        if hits.is_empty() {
            self.open.remove(&(channel, source));
        }
        oldest
    }

    /// Every open hit that still sounds on `key` of `channel`, with its source note and how
    /// it sounds.
    fn sounding(&self, channel: u4, key: u7) -> impl Iterator<Item = (Note, Sound)> + '_ {
        self.open
            .iter()
            .filter(move |((c, _), _)| *c == channel)
            .flat_map(|(&(_, note), hits)| hits.iter().map(move |hit| (note, hit)))
            .filter(move |(_, hit)| hit.key == key && hit.sound != Sound::Closed)
            .map(|(note, hit)| (note, hit.sound))
    }

    fn write(&mut self, kind: TrackEventKind<'a>) {
        let delta = self.fold.take();
        self.out.push(TrackEvent { delta, kind });
    }

    /// The track written, closed with End-of-Track, and how many hits merged into another:
    /// a track that lacks its End-of-Track (a damaged file) gains it, carrying the delta of
    /// the events removed after the last one written.
    fn close(mut self) -> (Track<'a>, u32) {
        if !is_closed(&self.out) {
            self.write(END_OF_TRACK);
        }
        (self.out, self.merged)
    }
}

/// What becomes of the hits on `note`, which the source of `mapping` does not recognize.
fn unmapped_fate(mapping: &Mapping, note: Note) -> UnmappedFate {
    match mapping.destination(note) {
        Some(Destination::Kept {
            plays: Some(canon), ..
        }) => UnmappedFate::KeptOnto(canon),
        Some(Destination::Kept { plays: None, .. }) => UnmappedFate::KeptFree,
        Some(Destination::Drum { .. }) | None => UnmappedFate::Removed,
    }
}

/// Adds to `report` what `stepped` is: a hit in scope, by where its drum lands, or a hit the
/// scope leaves untouched.
fn tally(report: &mut Report, mapping: &Mapping, stepped: &Stepped) {
    match *stepped {
        Stepped::Hit { source, .. } => match mapping.get(source) {
            Some(outcome) => report.record(outcome),
            None => report.record_unmapped(source, unmapped_fate(mapping, source)),
        },
        Stepped::Pass {
            untouched: true, ..
        } => report.record_untouched(),
        Stepped::Pass {
            untouched: false, ..
        }
        | Stepped::Off { .. }
        | Stepped::Choke { .. } => {}
    }
}

/// `events` stepped one by one through a [`Voicing`], tallied in `report`, and closed.
fn thin<'a>(
    events: Track<'a>,
    mapping: &Mapping,
    filter: ChannelFilter,
    report: &mut Report,
) -> Result<Track<'a>, CodecError> {
    let mut voicing = Voicing::with_capacity(events.len() + 1);
    for ev in events {
        let stepped = step(mapping, filter, ev.kind);
        tally(report, mapping, &stepped);
        voicing.push(ev.delta, stepped)?;
    }
    let (track, merged) = voicing.close();
    report.record_merged(merged);
    Ok(track)
}

/// `smf` with every note event its track's filter accepts rewritten through `mapping`, the
/// notes nothing plays removed, and the report of what happened to each hit.
pub(crate) fn rewrite<'a>(
    mut smf: Smf<'a>,
    mapping: &Mapping,
    filters: TrackFilters,
) -> Result<(Smf<'a>, Report), CodecError> {
    let mut report = Report::default();
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        *track = thin(std::mem::take(track), mapping, filter, &mut report)?;
    }
    Ok((smf, report))
}

#[cfg(test)]
mod tests {
    use midiremap_kit::engine::Catalog;
    use midiremap_mapping::{Mapping, MissingDrums, Overrides, Unrecognized};
    use midly::{num::u14, MetaMessage, PitchBend};

    use super::*;

    fn bytes() -> impl Iterator<Item = u7> + Clone {
        (0..=127).map(u7::from_int_lossy)
    }

    fn every_channel_message() -> Vec<MidiMessage> {
        let pairs = || bytes().flat_map(|a| bytes().map(move |b| (a, b)));
        let notes = pairs().flat_map(|(key, vel)| {
            [
                MidiMessage::NoteOn { key, vel },
                MidiMessage::NoteOff { key, vel },
                MidiMessage::Aftertouch { key, vel },
            ]
        });
        let controllers =
            pairs().map(|(controller, value)| MidiMessage::Controller { controller, value });
        let programs = bytes().map(|program| MidiMessage::ProgramChange { program });
        let pressures = bytes().map(|vel| MidiMessage::ChannelAftertouch { vel });
        let bends = (0..=u14::max_value().as_int()).map(|b| MidiMessage::PitchBend {
            bend: PitchBend(u14::from_int_lossy(b)),
        });
        notes
            .chain(controllers)
            .chain(programs)
            .chain(pressures)
            .chain(bends)
            .collect()
    }

    fn key_of(message: MidiMessage) -> Option<u7> {
        match message {
            MidiMessage::NoteOn { key, .. }
            | MidiMessage::NoteOff { key, .. }
            | MidiMessage::Aftertouch { key, .. } => Some(key),
            MidiMessage::Controller { .. }
            | MidiMessage::ProgramChange { .. }
            | MidiMessage::ChannelAftertouch { .. }
            | MidiMessage::PitchBend { .. } => None,
        }
    }

    fn with_key(message: MidiMessage, to: u7) -> MidiMessage {
        match message {
            MidiMessage::NoteOn { vel, .. } => MidiMessage::NoteOn { key: to, vel },
            MidiMessage::NoteOff { vel, .. } => MidiMessage::NoteOff { key: to, vel },
            MidiMessage::Aftertouch { vel, .. } => MidiMessage::Aftertouch { key: to, vel },
            other @ (MidiMessage::Controller { .. }
            | MidiMessage::ProgramChange { .. }
            | MidiMessage::ChannelAftertouch { .. }
            | MidiMessage::PitchBend { .. }) => other,
        }
    }

    /// The event a conversion must write for `kind` alone, or `None` when it goes: a note
    /// event on an accepted channel moves to its destination's key or goes when nothing plays
    /// it; every other event stays exactly as it was.
    fn expected<'a>(
        mapping: &Mapping,
        filter: ChannelFilter,
        kind: TrackEventKind<'a>,
    ) -> Option<TrackEventKind<'a>> {
        let TrackEventKind::Midi { channel, message } = kind else {
            return Some(kind);
        };
        match key_of(message).filter(|_| filter.accepts(channel_from_wire(channel))) {
            None => Some(kind),
            Some(key) => mapping
                .destination(note_from_key(key))
                .map(|to| TrackEventKind::Midi {
                    channel,
                    message: with_key(message, note_key(to.note())),
                }),
        }
    }

    /// What the report counts of one event.
    #[derive(Debug, PartialEq, Eq)]
    enum Counted {
        Hit(Note),
        Untouched,
        Nothing,
    }

    fn counted(stepped: Stepped) -> Counted {
        match stepped {
            Stepped::Hit { source, .. } => Counted::Hit(source),
            Stepped::Pass {
                untouched: true, ..
            } => Counted::Untouched,
            Stepped::Pass {
                untouched: false, ..
            }
            | Stepped::Off { .. }
            | Stepped::Choke { .. } => Counted::Nothing,
        }
    }

    /// What the report must count of `kind`: a note-on with a velocity is a hit, counted by
    /// its note in scope and as untouched outside it.
    fn expected_count(filter: ChannelFilter, kind: TrackEventKind) -> Counted {
        match kind {
            TrackEventKind::Midi {
                channel,
                message: MidiMessage::NoteOn { key, vel },
            } if vel.as_int() > 0 => {
                if filter.accepts(channel_from_wire(channel)) {
                    Counted::Hit(note_from_key(key))
                } else {
                    Counted::Untouched
                }
            }
            TrackEventKind::Midi { .. }
            | TrackEventKind::SysEx(_)
            | TrackEventKind::Escape(_)
            | TrackEventKind::Meta(_) => Counted::Nothing,
        }
    }

    #[test]
    fn an_event_alone_moves_only_the_key_of_a_note_in_scope_and_leaves_every_other_as_it_was() {
        let catalog = Catalog::shared();
        let (src, tgt) = (
            catalog.get("ggd_invasion").unwrap(),
            catalog.get("general_midi").unwrap(),
        );
        let mappings = [
            Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Nearest),
            Mapping::new(src, tgt, &Overrides::default(), MissingDrums::Drop)
                .with_unrecognized(Unrecognized::Keep),
        ];
        let filters = [
            ChannelFilter::ALL,
            ChannelFilter::NONE,
            ChannelFilter::NONE.with(channel_from_wire(u4::from_int_lossy(9))),
            ChannelFilter::NONE
                .with(channel_from_wire(u4::from_int_lossy(0)))
                .with(channel_from_wire(u4::from_int_lossy(9))),
        ];
        let midi = every_channel_message().into_iter().flat_map(|message| {
            (0..16).map(move |c| TrackEventKind::Midi {
                channel: u4::from_int_lossy(c),
                message,
            })
        });
        let meta = [
            TrackEventKind::Meta(MetaMessage::EndOfTrack),
            TrackEventKind::Meta(MetaMessage::Tempo(midly::num::u24::from_int_lossy(500_000))),
            TrackEventKind::SysEx(&[0x7e, 0x7f, 0x09, 0x01, 0xf7]),
        ];
        let events: Vec<TrackEventKind> = midi.chain(meta).collect();
        let mut checked = 0usize;
        for mapping in &mappings {
            for &filter in &filters {
                for &kind in &events {
                    let stepped = step(mapping, filter, kind);
                    assert_eq!(
                        Voicing::default().voiced(stepped),
                        expected(mapping, filter, kind),
                        "{kind:?} under {filter:?}"
                    );
                    assert_eq!(
                        counted(stepped),
                        expected_count(filter, kind),
                        "{kind:?} under {filter:?}"
                    );
                    checked += 1;
                }
            }
        }
        assert_eq!(events.len(), 16 * 82_176 + 3);
        assert_eq!(checked, 8 * events.len());
    }
}
