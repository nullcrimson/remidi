#![no_main]

use std::sync::LazyLock;

use libfuzzer_sys::fuzz_target;
use midiremap_core::{
    convert, Catalog, Channel, ChannelScope, EngineMap, Mapping, MissingDrums, Overrides, Report,
};
use midly::{MidiMessage, Smf, TrackEventKind};

static CATALOG: LazyLock<Catalog> = LazyLock::new(Catalog::builtin);
static ENGINES: LazyLock<Vec<&EngineMap>> = LazyLock::new(|| CATALOG.engines().collect());

fn engine(pick: u8) -> &'static EngineMap {
    ENGINES[usize::from(pick) % ENGINES.len()]
}

fn setting(byte: u8) -> (MissingDrums, ChannelScope) {
    let missing = if byte & 1 == 0 {
        MissingDrums::Nearest
    } else {
        MissingDrums::Drop
    };
    let scope = match (byte >> 1) % 18 {
        0 => ChannelScope::Auto,
        n => Channel::new(n - 1).map_or(ChannelScope::All, ChannelScope::Only),
    };
    (missing, scope)
}

fn hits(smf: &Smf) -> u32 {
    let count = smf
        .tracks
        .iter()
        .flatten()
        .filter(|ev| {
            matches!(
                ev.kind,
                TrackEventKind::Midi {
                    message: MidiMessage::NoteOn { vel, .. },
                    ..
                } if vel.as_int() > 0
            )
        })
        .count();
    u32::try_from(count).expect("a parsed file has fewer than 2^32 events")
}

fn counted(report: &Report) -> u32 {
    report.converted()
        + report.dropped().values().sum::<u32>()
        + report.unmapped_source().values().sum::<u32>()
        + report.untouched()
}

fuzz_target!(|data: &[u8]| {
    let [src, tgt, byte, midi @ ..] = data else {
        return;
    };
    let (missing, scope) = setting(*byte);
    let mapping = Mapping::new(engine(*src), engine(*tgt), &Overrides::default(), missing);
    let Ok(out) = convert(midi, &mapping, scope) else {
        return;
    };
    Smf::parse(&out.bytes).expect("a converted file parses");
    let input = Smf::parse(midi).expect("convert parsed this file");
    assert_eq!(counted(&out.report), hits(&input));
});
