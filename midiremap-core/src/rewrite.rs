use midly::{
    num::{u28, u7},
    MidiMessage, Smf, Track, TrackEvent, TrackEventKind,
};

use crate::{
    channel::{hit, Channel, ChannelFilter, ChannelScope},
    midi::CodecError,
    note::Note,
    report::Report,
    translate::Mapping,
};

#[derive(Default)]
struct DeltaFold(u28);

impl DeltaFold {
    fn carried(&self, ev: &TrackEvent) -> Result<u28, CodecError> {
        u28::try_from(self.0.as_int() + ev.delta.as_int()).ok_or(CodecError::DeltaOverflow)
    }

    fn remove(&mut self, ev: &TrackEvent) -> Result<(), CodecError> {
        self.0 = self.carried(ev)?;
        Ok(())
    }

    fn keep(&mut self, ev: &mut TrackEvent) -> Result<(), CodecError> {
        ev.delta = self.carried(ev)?;
        self.0 = u28::default();
        Ok(())
    }
}

/// What a note event adds to the report.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Tally {
    /// A hit the conversion rewrites, on its source note.
    Rewritten(Note),
    /// A hit on a channel the scope leaves as it is.
    Untouched,
}

/// One event of a conversion: when `filter` accepts its channel, its key moves to where
/// `mapping` plays it. Says what the event tallies and whether it stays in the file.
fn step(
    mapping: &Mapping,
    filter: ChannelFilter,
    kind: &mut TrackEventKind,
) -> (Option<Tally>, bool) {
    let hit = hit(kind);
    let TrackEventKind::Midi { channel, message } = kind else {
        return (None, true);
    };
    if !filter.accepts(Channel::of(*channel)) {
        return (hit.map(|_| Tally::Untouched), true);
    }
    let keep = match message {
        MidiMessage::NoteOn { key, .. }
        | MidiMessage::NoteOff { key, .. }
        | MidiMessage::Aftertouch { key, .. } => apply(mapping, key),
        _ => true,
    };
    (hit.map(|(_, note)| Tally::Rewritten(note)), keep)
}

fn apply(mapping: &Mapping, key: &mut u7) -> bool {
    match mapping.destination(Note::from_key(*key)) {
        Some(to) => {
            *key = to.note().key();
            true
        }
        None => false,
    }
}

/// The events `keep` keeps, in order, each removed event's delta folded into the next kept
/// one.
fn thin<'a>(
    events: Track<'a>,
    mut keep: impl FnMut(&mut TrackEvent<'a>) -> bool,
) -> Result<Track<'a>, CodecError> {
    let mut fold = DeltaFold::default();
    let mut out = Vec::with_capacity(events.len());
    for mut ev in events {
        if keep(&mut ev) {
            fold.keep(&mut ev)?;
            out.push(ev);
        } else {
            fold.remove(&ev)?;
        }
    }
    Ok(out)
}

/// `smf` with every note event the scope accepts rewritten through `mapping`, the notes
/// nothing plays removed, and the report of what happened to each hit.
pub(crate) fn rewrite<'a>(
    mut smf: Smf<'a>,
    mapping: &Mapping,
    scope: ChannelScope,
) -> Result<(Smf<'a>, Report), CodecError> {
    let mut report = Report::default();
    let filters = scope.resolve(&smf);
    for (track, filter) in smf.tracks.iter_mut().zip(filters) {
        *track = thin(std::mem::take(track), |ev| {
            let (tally, keep) = step(mapping, filter, &mut ev.kind);
            match tally {
                Some(Tally::Rewritten(note)) => report.record(note, mapping.get(note)),
                Some(Tally::Untouched) => report.record_untouched(),
                None => {}
            }
            keep
        })?;
    }
    Ok((smf, report))
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::{cc, choke, event, off, on};

    use super::*;
    use crate::{
        catalog::Catalog, note::n, overrides::Overrides, resolution::MissingDrums,
        translate::Unrecognized,
    };

    fn ggd_to_ezd(unrecognized: Unrecognized) -> Mapping<'static> {
        let catalog = Catalog::shared().unwrap();
        Mapping::new(
            catalog.get("ggd_invasion").unwrap(),
            catalog.get("ezdrummer").unwrap(),
            &Overrides::default(),
            MissingDrums::Nearest,
        )
        .with_unrecognized(unrecognized)
    }

    fn stepped(
        unrecognized: Unrecognized,
        filter: ChannelFilter,
        ev: TrackEvent<'static>,
    ) -> (Option<Tally>, bool, TrackEventKind<'static>) {
        let mut kind = ev.kind;
        let (tally, keep) = step(&ggd_to_ezd(unrecognized), filter, &mut kind);
        (tally, keep, kind)
    }

    #[test]
    fn a_hit_moves_to_where_the_target_plays_its_drum() {
        let (tally, keep, kind) = stepped(
            Unrecognized::Remove,
            ChannelFilter::All,
            event(0, 10, on(24)),
        );
        assert_eq!(tally, Some(Tally::Rewritten(n(24))));
        assert!(keep);
        assert_eq!(kind, event(0, 10, on(36)).kind);
    }

    #[test]
    fn a_hit_the_scope_skips_stays_as_it_is_and_counts_as_untouched() {
        let (tally, keep, kind) = stepped(
            Unrecognized::Remove,
            ChannelFilter::Skip,
            event(0, 10, on(24)),
        );
        assert_eq!(tally, Some(Tally::Untouched));
        assert!(keep);
        assert_eq!(kind, event(0, 10, on(24)).kind);
    }

    #[test]
    fn a_release_moves_with_its_note_but_tallies_nothing() {
        let (tally, keep, kind) = stepped(
            Unrecognized::Remove,
            ChannelFilter::All,
            event(0, 10, off(24)),
        );
        assert_eq!(tally, None);
        assert!(keep);
        assert_eq!(kind, event(0, 10, off(36)).kind);
    }

    #[test]
    fn an_unrecognized_note_leaves_unless_the_mapping_keeps_it() {
        let removed = stepped(
            Unrecognized::Remove,
            ChannelFilter::All,
            event(0, 10, choke(99)),
        );
        let kept = stepped(
            Unrecognized::Keep,
            ChannelFilter::All,
            event(0, 10, choke(99)),
        );
        assert!(!removed.1);
        assert!(kept.1);
    }

    #[test]
    fn other_messages_stay_and_tally_nothing() {
        let (tally, keep, _) =
            stepped(Unrecognized::Remove, ChannelFilter::All, event(0, 10, cc()));
        assert_eq!((tally, keep), (None, true));
    }

    #[test]
    fn thinning_folds_a_removed_events_delta_into_the_next_kept_one() {
        let events = vec![
            event(5, 10, cc()),
            event(7, 10, off(1)),
            event(11, 10, cc()),
        ];
        let kept = thin(events, |ev| ev.delta.as_int() != 7).unwrap();
        let deltas: Vec<u32> = kept.iter().map(|ev| ev.delta.as_int()).collect();
        assert_eq!(deltas, [5, 18]);
    }
}
