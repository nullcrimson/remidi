use plist::{Dictionary, Value};

use crate::{engine_map::EngineMap, family::Family, note::Note};

/// The steps of each row, all off: a template holds rows, not a groove.
const STEPS: usize = 16;
/// The note a row's pitch is written against: Logic's C3.
const ROW_BASE_NOTE: i64 = 60;
/// The status byte Logic keeps under a row's note in its note id.
const NOTE_ON: i64 = 0x90;
/// The low half of a row icon: the icon's own colour.
const ICON_COLOUR: i64 = 0xFFFF_FFFF;
/// The pattern's length and time signature as Logic stores them: one bar of 4/4.
const TIME_SIGNATURE: [u8; 24] = [
    4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0x80, 0, 0, 0, 0, 0, 0, 0,
];
/// The row order Logic keeps: as the file lists them.
const ROW_SORT_STATE: [u8; 24] = [
    1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/// The pictures Logic shows beside a row: the row's icon and its instrument icon.
struct Icon {
    row: i64,
    instrument: i64,
}

fn icon(family: Family) -> Icon {
    let (row, instrument) = match family {
        Family::Kick => (0x49, 4521),
        Family::Snare | Family::Toms => (0x4B, 4524),
        Family::HiHat => (0x4D, 4526),
        Family::Cymbals => (0x53, 4530),
        Family::Percussion | Family::Aux => (0x57, 4456),
    };
    Icon {
        row: row << 32 | ICON_COLOUR,
        instrument,
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

/// The id Logic keys a row's open state by; one per note, so unique in the file.
fn row_id(note: Note) -> String {
    format!("6D726D70-0000-4000-8000-{:012X}", note.get())
}

fn row(note: Note, name: String, family: Family) -> Value {
    let from_base = i64::from(note.get()) - ROW_BASE_NOTE;
    let icon = icon(family);
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
        ("kStepSequenceInstrumentIconKey", int(icon.instrument)),
        (
            "kStepSequenceNoteIDKey",
            int(i64::from(note.get()) << 8 | NOTE_ON),
        ),
        ("kStepSequenceRowIconKey", int(icon.row)),
        ("kStepSequenceRowNameKey", name.into()),
        ("kStepSequenceRowPlaybackStateKey", int(0)),
        ("kStepSequenceRowUUIDKey", row_id(note).into()),
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
            (row_id(d.note), state)
        })
        .collect();
    let rows = drums
        .into_iter()
        .map(|d| {
            let family = d.entry.family();
            row(d.note, d.entry.into_label(), family)
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
