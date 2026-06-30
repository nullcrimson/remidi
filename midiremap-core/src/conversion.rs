use crate::{
    canon::{DefaultFallbacks, FallbackResolver},
    engine_map::{Decoder, Encoder, EngineMap, MapError},
    midi::{CodecError, EventRewriter, MidiCodec, StandardMidiCodec},
    translate::{Report, Translator},
};

pub struct Converted {
    pub bytes: Vec<u8>,
    pub report: Report,
}

#[derive(thiserror::Error, Debug)]
pub enum ConversionError {
    #[error(transparent)]
    Codec(#[from] CodecError),
    #[error(transparent)]
    Map(#[from] MapError),
}

/// End-to-end conversion: bytes in, bytes + report out. Owns a [`Translator`]
/// (the engine→engine logic) and a [`MidiCodec`] (the container I/O).
pub struct Conversion<'a, C: MidiCodec = StandardMidiCodec> {
    translator: Translator<'a>,
    codec: C,
}

impl<'a> Conversion<'a, StandardMidiCodec> {
    /// Build a conversion with the default SMF codec.
    pub fn new(
        src: &'a dyn Decoder,
        tgt: &'a dyn Encoder,
        resolver: &'a dyn FallbackResolver,
    ) -> Self {
        Self {
            translator: Translator::new(src, tgt, resolver),
            codec: StandardMidiCodec,
        }
    }
}

impl<'a, C: MidiCodec> Conversion<'a, C> {
    pub fn with_codec(translator: Translator<'a>, codec: C) -> Self {
        Self { translator, codec }
    }

    pub fn run(&self, midi: &[u8]) -> Result<Converted, ConversionError> {
        let mut smf = self.codec.parse(midi)?;
        let mut report = Report::default();
        EventRewriter::new(&self.translator).rewrite(&mut smf, &mut report);
        let bytes = self.codec.write(&smf)?;
        Ok(Converted { bytes, report })
    }
}

/// Convenience: convert `mid` from `src` to `tgt` with the default codec and
/// fallback chains.
pub fn remap(mid: &[u8], src: &EngineMap, tgt: &EngineMap) -> Result<Converted, ConversionError> {
    let fb = DefaultFallbacks;
    let conv = Conversion::new(src, tgt, &fb);
    conv.run(mid)
}

#[cfg(test)]
mod tests {
    use midly::{
        num::{u15, u28, u4, u7},
        Format, Header, MidiMessage, Smf, Timing, Track, TrackEvent, TrackEventKind,
    };

    use super::*;
    use crate::{
        canon::Canon,
        catalog::{BuiltinMaps, MapProvider},
    };

    fn smf_from(events: &[(u32, MidiMessage)]) -> Vec<u8> {
        let mut track = Track::new();
        for (delta, msg) in events {
            track.push(TrackEvent {
                delta: u28::from_int_lossy(*delta),
                kind: TrackEventKind::Midi {
                    channel: u4::from_int_lossy(9),
                    message: *msg,
                },
            });
        }
        let smf = Smf {
            header: Header {
                format: Format::SingleTrack,
                timing: Timing::Metrical(u15::from_int_lossy(480)),
            },
            tracks: vec![track],
        };
        let mut buf = Vec::new();
        smf.write_std(&mut buf).unwrap();
        buf
    }

    fn on(note: u8) -> MidiMessage {
        MidiMessage::NoteOn {
            key: u7::from_int_lossy(note),
            vel: u7::from_int_lossy(100),
        }
    }
    fn off(note: u8) -> MidiMessage {
        MidiMessage::NoteOff {
            key: u7::from_int_lossy(note),
            vel: u7::from_int_lossy(0),
        }
    }

    /// Keys of all real note-ons (vel > 0), in order.
    fn note_on_keys(bytes: &[u8]) -> Vec<u8> {
        let smf = Smf::parse(bytes).unwrap();
        smf.tracks[0]
            .iter()
            .filter_map(|ev| match ev.kind {
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { key, vel },
                    ..
                } if vel.as_int() > 0 => Some(key.as_int()),
                _ => None,
            })
            .collect()
    }

    fn convert(mid: &[u8], src_id: &str, tgt_id: &str) -> Converted {
        let b = BuiltinMaps::new();
        let src = b.get(src_id).unwrap();
        let tgt = b.get(tgt_id).unwrap();
        remap(mid, src, tgt).unwrap()
    }

    #[test]
    fn ggd_kick_to_ezd_kick() {
        let out = convert(
            &smf_from(&[(0, on(24)), (48, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(note_on_keys(&out.bytes), vec![36]);
    }

    #[test]
    fn lr_kicks_collide_to_one_note() {
        // GGD 23 and 24 both -> KickMain -> EZD 36
        let out = convert(
            &smf_from(&[(0, on(23)), (10, off(23)), (0, on(24)), (10, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(note_on_keys(&out.bytes), vec![36, 36]);
    }

    #[test]
    fn hat_open3_falls_back() {
        let out = convert(
            &smf_from(&[(0, on(47)), (48, off(47))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert_eq!(note_on_keys(&out.bytes), vec![46]);
        assert_eq!(out.report.fallback_used.get(&Canon::HatOpen3), Some(&1));
    }

    #[test]
    fn unmapped_dropped_and_reported() {
        let out = convert(
            &smf_from(&[(0, on(99)), (48, off(99))]),
            "ggd_invasion",
            "ezdrummer",
        );
        assert!(note_on_keys(&out.bytes).is_empty());
        assert_eq!(out.report.unmapped_source.get(&99), Some(&1));
    }

    #[test]
    fn cc_events_pass_through_untouched() {
        let cc = MidiMessage::Controller {
            controller: u7::from_int_lossy(4),
            value: u7::from_int_lossy(77),
        };
        let out = convert(
            &smf_from(&[(0, cc), (0, on(24)), (48, off(24))]),
            "ggd_invasion",
            "ezdrummer",
        );
        let smf = Smf::parse(&out.bytes).unwrap();
        let found = smf.tracks[0].iter().any(|ev| {
            matches!(ev.kind,
                TrackEventKind::Midi { message: MidiMessage::Controller { controller, value }, .. }
                if controller.as_int() == 4 && value.as_int() == 77)
        });
        assert!(found, "CC event must survive untouched");
    }

    #[test]
    fn dropped_note_delta_folds_into_next_kept() {
        // kept(24) on@0 off@100 ; dropped(99) on@50 off@10 ; kept(26) on@200
        let out = convert(
            &smf_from(&[
                (0, on(24)),
                (100, off(24)),
                (50, on(99)),
                (10, off(99)),
                (200, on(26)),
            ]),
            "ggd_invasion",
            "ezdrummer",
        );
        let smf = Smf::parse(&out.bytes).unwrap();
        let mut acc = Vec::new();
        for ev in &smf.tracks[0] {
            if let TrackEventKind::Midi {
                message: MidiMessage::NoteOn { key, vel },
                ..
            } = ev.kind
            {
                if vel.as_int() > 0 {
                    acc.push((key.as_int(), ev.delta.as_int()));
                }
            }
        }
        // second kept note-on (38) absorbed the dropped 50+10 deltas: 200+60 = 260
        assert_eq!(acc, vec![(36, 0), (38, 260)]);
    }

    #[test]
    fn round_trip_stable_on_primary_subset() {
        let notes = [24u8, 26, 30, 33, 45];
        let mut events = Vec::new();
        for (i, n) in notes.iter().enumerate() {
            events.push((if i == 0 { 0 } else { 10 }, on(*n)));
            events.push((10, off(*n)));
        }
        let fwd = convert(&smf_from(&events), "ggd_invasion", "ezdrummer");
        let back = convert(&fwd.bytes, "ezdrummer", "ggd_invasion");
        assert_eq!(note_on_keys(&back.bytes), notes.to_vec());
    }
}
