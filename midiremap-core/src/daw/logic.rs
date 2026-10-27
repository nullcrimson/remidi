use plist::{Dictionary, Value};
use uuid::Uuid;

use crate::{
    canon::{PercKind, Piece, RackIdx},
    engine_map::EngineMap,
    family::Family,
    note::Note,
};

/// The steps of each row, all off: a template holds rows, not a groove.
const STEPS: usize = 16;
/// The note a row's pitch is written against: Logic's C3.
const ROW_BASE_NOTE: i64 = 60;
/// The status byte Logic keeps under a row's note in its note id.
const NOTE_ON: i64 = 0x90;
/// The pattern's length and time signature as Logic stores them: one bar of 4/4.
const TIME_SIGNATURE: [u8; 24] = [
    4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0x80, 0, 0, 0, 0, 0, 0, 0,
];
/// The row order Logic keeps: as the file lists them.
const ROW_SORT_STATE: [u8; 24] = [
    1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/// The colour of a row of `family`: Logic's own colours for kick, snare, hats, cymbals and
/// percussion, toms between hats and cymbals.
fn row_colour(family: Family) -> i64 {
    let colour = match family {
        Family::Kick => 0x49,
        Family::Snare => 0x4B,
        Family::HiHat => 0x4D,
        Family::Aux => 0x4F,
        Family::Toms => 0x51,
        Family::Cymbals => 0x53,
        Family::Percussion => 0x57,
    };
    colour << 32 | 0xFFFF_FFFF
}

/// The picture Logic draws beside a row of `piece`.
fn instrument_icon(piece: Piece) -> i64 {
    match piece {
        Piece::Kick => 4521,
        Piece::Snare => 4524,
        Piece::RackTom(i) if i == RackIdx::FIRST => 4541,
        Piece::RackTom(_) => 4542,
        Piece::FloorTom => 4543,
        Piece::HatClosed => 4526,
        Piece::HatOpen => 4527,
        Piece::HatPedal => 4528,
        Piece::Crash => 4530,
        Piece::Ride => 4531,
        Piece::OtherCymbal => 4529,
        Piece::Perc(PercKind::Tambourine | PercKind::Shaker | PercKind::Vibraslap) => 4533,
        Piece::Perc(PercKind::Clap) => 4534,
        Piece::Perc(PercKind::Cowbell) => 4536,
        Piece::Perc(PercKind::Sticks) => 4537,
        Piece::Perc(PercKind::Misc) => 4535,
    }
}

fn dict<const N: usize>(entries: [(&str, Value); N]) -> Value {
    Value::Dictionary(
        entries
            .into_iter()
            .map(|(key, value)| (key.to_owned(), value))
            .collect::<Dictionary>(),
    )
}

fn int(value: i64) -> Value {
    Value::Integer(value.into())
}

/// The id Logic keys a row by: one per engine and note, so no two rows Logic knows share one.
fn row_id(engine: &str, note: Note) -> String {
    let name = format!("https://drumverter.com/drum-maps/{engine}/{}", note.get());
    format!(
        "{:X}",
        Uuid::new_v5(&Uuid::NAMESPACE_URL, name.as_bytes()).hyphenated()
    )
}

fn row(engine: &str, note: Note, name: String, family: Family, piece: Piece) -> Value {
    let from_base = i64::from(note.get()) - ROW_BASE_NOTE;
    let empty_step = dict([
        ("kStepSequenceSelectedKey", false.into()),
        ("kStepSequenceSkipEnabledKey", false.into()),
        ("kStepSequenceStepEnabledKey", false.into()),
        ("kStepSequenceTieEnabledKey", false.into()),
        (
            "propertyNodeKey",
            dict([("kStepSequenceNoteKey", dict([]))]),
        ),
    ]);
    dict([
        ("kStepSequenceEndIndexKey", int(STEPS as i64)),
        (
            "kStepSequenceInstrumentIconKey",
            int(instrument_icon(piece)),
        ),
        (
            "kStepSequenceNoteIDKey",
            int(i64::from(note.get()) << 8 | NOTE_ON),
        ),
        ("kStepSequenceRowIconKey", int(row_colour(family))),
        ("kStepSequenceRowNameKey", name.into()),
        ("kStepSequenceRowPlaybackStateKey", int(0)),
        ("kStepSequenceRowUUIDKey", row_id(engine, note).into()),
        ("kStepSequenceSelectedKey", false.into()),
        ("kStepSequenceStartIndexKey", int(0)),
        (
            "kStepSequenceStepsKey",
            Value::Array(vec![empty_step; STEPS]),
        ),
        (
            "propertyNodeKey",
            dict([(
                "kStepSequenceNoteKey",
                dict([
                    ("kStepSequenceNoteKey", int(ROW_BASE_NOTE)),
                    ("kStepSequenceNoteScaleQuantizeKey", false.into()),
                    (
                        "kStepSequenceNoteTransposeKey",
                        int(from_base.rem_euclid(12)),
                    ),
                    (
                        "kStepSequenceOctaveTransposeKey",
                        int(from_base.div_euclid(12)),
                    ),
                ]),
            )]),
        ),
    ])
}

fn sequence(rows: Vec<Value>) -> Value {
    dict([
        ("kStepSequenceLengthKey", int(1)),
        (
            "kStepSequenceRowSortStateKey",
            Value::Data(ROW_SORT_STATE.to_vec()),
        ),
        ("kStepSequenceRowsKey", Value::Array(rows)),
        (
            "kStepSequenceTimeSignatureKey",
            Value::Data(TIME_SIGNATURE.to_vec()),
        ),
        (
            "propertyNodeKey",
            dict([
                ("kStepSequenceModulationKey", dict([])),
                (
                    "kStepSequenceNoteKey",
                    dict([
                        (
                            "kStepSequenceNoteScaleKey",
                            dict([
                                (
                                    "kStepSequenceScaleIntervalsKey",
                                    Value::Array([0, 2, 4, 5, 7, 9, 11].map(int).to_vec()),
                                ),
                                ("kStepSequenceScaleModeKey", int(1)),
                                ("kStepSequenceScaleNameKey", "Major".into()),
                                ("kStepSequenceScaleTypeKey", int(1)),
                            ]),
                        ),
                        ("kStepSequenceNoteScaleRootKey", int(0)),
                    ]),
                ),
            ]),
        ),
    ])
}

/// A Logic Pro Step Sequencer template with one row per note `map` plays, by family, each
/// named after its drum and playing its note, with every step off.
pub(super) fn step_sequencer(map: &EngineMap) -> String {
    let mut drums = map.source_notes();
    drums.sort_by_key(|d| (d.entry.family(), d.entry.canon(), d.note));
    let row_states: Dictionary = drums
        .iter()
        .map(|d| {
            let state = dict([
                ("kStepSequencerRowStateSubRowsExpandedKey", false.into()),
                ("kStepSequencerRowStateSubRowsKey", Value::Array(vec![])),
            ]);
            (row_id(map.id(), d.note), state)
        })
        .collect();
    let rows = drums
        .into_iter()
        .map(|d| {
            let (family, piece) = (d.entry.family(), d.entry.canon().piece());
            row(map.id(), d.note, d.entry.into_label(), family, piece)
        })
        .collect();
    let session = dict([
        ("kColorModeKey", int(0)),
        ("kEditModeKey", int(0)),
        (
            "kEditModePageStateKey",
            dict([
                (
                    "kStepSequencerEditModeForPageKey",
                    dict([("0", int(0)), ("1", int(4))]),
                ),
                ("kStepSequencerEditModePageKey", int(0)),
            ]),
        ),
        ("kEventHandlingModeKey", int(0)),
        ("kHasUserDataKey", true.into()),
        ("kHeaderButtonsPageKey", int(0)),
        ("kMonoModeEnabledKey", false.into()),
        ("kPageZoomLevelKey", int(0)),
        ("kRowHeaderWidthKey", Value::Real(326.0)),
        ("kRowStatesKey", Value::Dictionary(row_states)),
        ("kScaleKeyTransposeEnabledKey", true.into()),
        ("kSecondaryEditModeKey", int(1)),
        ("kSequenceDataKey", sequence(rows)),
        ("kStepDetailViewHiddenKey", true.into()),
        ("kStepValueTextModeKey", int(1)),
        ("kStepViewPageKey", int(0)),
        ("kVersionKey", int(1)),
        ("kVerticalAutoZoomEnabledKey", false.into()),
        ("kVerticalZoomKey", Value::Real(0.4198)),
        ("kZoomSelectedRowEnabledKey", false.into()),
    ]);
    let mut out = Vec::new();
    dict([("kSessionDataKey", session)])
        .to_writer_xml(&mut out)
        .expect("writing into memory cannot fail");
    let mut text = String::from_utf8(out).expect("the writer emits the UTF-8 it is given");
    text.push('\n');
    text
}
