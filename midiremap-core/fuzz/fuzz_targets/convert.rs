#![no_main]

use std::sync::LazyLock;

use libfuzzer_sys::fuzz_target;
use midiremap_core::{
    convert, Catalog, Channel, ChannelScope, EngineMap, Mapping, MissingDrums, Overrides,
};
use midiremap_testkit::hits;
use midly::Smf;

static ENGINES: LazyLock<Vec<&EngineMap>> =
    LazyLock::new(|| Catalog::shared().engines().collect());

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
    assert_eq!(out.report.hits(), hits(midi));
});
