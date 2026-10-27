use std::{collections::BTreeMap, error::Error};

use midiremap_core::{
    convert, note_hits, parse_preset, rack_file, sample_file as core_sample_file,
    source_fits as core_source_fits, Canon, CanonEntry, Catalog, ChannelScope, Converted, Drum,
    EngineId, EngineMap, Family, LoadedPreset, Mapping, MissingDrums, Note, NoteHits, OctaveBase,
    Overrides, PresetError, PresetName, RackFile, SourceFits, Unrecognized, VoicePlan,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_bytes::ByteBuf;
use tsify::{Ts, Tsify};
use wasm_bindgen::prelude::*;

/// Prints a panic's message and location to the browser console instead of a bare
/// `unreachable` trap.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Which side of a conversion an engine id was given for.
#[derive(Serialize, Tsify, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Source,
    Target,
}

/// The value every export throws. `detail` is the technical cause chain, shown to the
/// user untranslated.
#[derive(Serialize, Tsify, Debug, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WasmError {
    UnknownEngine { role: Role, id: String },
    BadOverrides { detail: String },
    BadMissing { detail: String },
    BadMidi { detail: String },
    BadPreset { detail: String },
    Internal { detail: String },
}

fn chain(err: &(dyn Error + 'static)) -> String {
    std::iter::successors(Some(err), |&e| e.source())
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(": ")
}

impl From<WasmError> for JsValue {
    fn from(err: WasmError) -> Self {
        err.into_ts()
            .map_or_else(|e| Self::from_str(&e.to_string()), Self::from)
    }
}

impl From<tsify::Error> for WasmError {
    fn from(err: tsify::Error) -> Self {
        Self::Internal {
            detail: err.to_string(),
        }
    }
}

fn catalog() -> Result<&'static Catalog, WasmError> {
    Catalog::shared().map_err(|e| WasmError::Internal { detail: chain(e) })
}

fn engine<'a>(catalog: &'a Catalog, id: &str, role: Role) -> Result<&'a EngineMap, WasmError> {
    catalog.get(id).ok_or_else(|| WasmError::UnknownEngine {
        role,
        id: id.to_owned(),
    })
}

fn from_js<T>(value: Option<Ts<T>>, error: fn(String) -> WasmError) -> Result<T, WasmError>
where
    T: Tsify + DeserializeOwned + Default,
    T::JsType: Clone,
{
    value.map_or_else(
        || Ok(T::default()),
        |v| v.to_rust().map_err(|e| error(e.to_string())),
    )
}

fn to_js_all<T: Tsify + Serialize>(items: &[T]) -> Result<Vec<Ts<T>>, WasmError> {
    items
        .iter()
        .map(|item| item.into_ts().map_err(WasmError::from))
        .collect()
}

struct Settings {
    scope: ChannelScope,
    missing: MissingDrums,
    unrecognized: Unrecognized,
}

/// The mapping a conversion and a rack read their settings through, the one way both do.
fn mapping<'c>(
    catalog: &'c Catalog,
    src_id: &str,
    tgt_id: &str,
    ov: &Overrides,
    missing: MissingDrums,
    unrecognized: Unrecognized,
) -> Result<Mapping<'c>, WasmError> {
    let src = engine(catalog, src_id, Role::Source)?;
    let tgt = engine(catalog, tgt_id, Role::Target)?;
    Ok(Mapping::new(src, tgt, ov, missing).with_unrecognized(unrecognized))
}

fn convert_file(
    catalog: &Catalog,
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    ov: &Overrides,
    settings: &Settings,
) -> Result<Converted, WasmError> {
    let mapping = mapping(
        catalog,
        src_id,
        tgt_id,
        ov,
        settings.missing,
        settings.unrecognized,
    )?;
    convert(mid, &mapping, settings.scope).map_err(|e| WasmError::BadMidi { detail: chain(&e) })
}

#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    overrides: Option<Ts<Overrides>>,
    channel: Option<Ts<ChannelScope>>,
    missing: Option<Ts<MissingDrums>>,
    unrecognized: Option<Ts<Unrecognized>>,
) -> Result<Ts<Converted>, WasmError> {
    let ov = from_js(overrides, |detail| WasmError::BadOverrides { detail })?;
    let settings = Settings {
        scope: from_js(channel, |detail| WasmError::Internal { detail })?,
        missing: from_js(missing, |detail| WasmError::BadMissing { detail })?,
        unrecognized: from_js(unrecognized, |detail| WasmError::Internal { detail })?,
    };
    let out = convert_file(catalog()?, mid, src_id, tgt_id, &ov, &settings)?;
    Ok(out.into_ts()?)
}

/// The Ableton rack that plays drum MIDI written for `src_id` on `tgt_id` with these edits and
/// settings, as [`remap`] would convert it, named after `preset_name` when one is given.
#[wasm_bindgen]
pub fn remap_rack(
    src_id: &str,
    tgt_id: &str,
    overrides: Option<Ts<Overrides>>,
    missing: Option<Ts<MissingDrums>>,
    unrecognized: Option<Ts<Unrecognized>>,
    preset_name: Option<Ts<PresetName>>,
) -> Result<Ts<RackFile>, WasmError> {
    let ov = from_js(overrides, |detail| WasmError::BadOverrides { detail })?;
    let missing = from_js(missing, |detail| WasmError::BadMissing { detail })?;
    let unrecognized = from_js(unrecognized, |detail| WasmError::Internal { detail })?;
    let preset = preset_name
        .map(|name| name.to_rust())
        .transpose()
        .map_err(|e| WasmError::BadPreset {
            detail: e.to_string(),
        })?;
    let mapping = mapping(catalog()?, src_id, tgt_id, &ov, missing, unrecognized)?;
    Ok(rack_file(&mapping, preset.as_ref()).into_ts()?)
}

fn voice_rows(
    catalog: &Catalog,
    src_id: &str,
    tgt_id: &str,
    ov: &Overrides,
    missing: MissingDrums,
) -> Result<Vec<VoicePlan>, WasmError> {
    let unrecognized = Unrecognized::default();
    Ok(mapping(catalog, src_id, tgt_id, ov, missing, unrecognized)?.preview())
}

#[wasm_bindgen]
pub fn plan(
    src_id: &str,
    tgt_id: &str,
    overrides: Option<Ts<Overrides>>,
    missing: Option<Ts<MissingDrums>>,
) -> Result<Vec<Ts<VoicePlan>>, WasmError> {
    let ov = from_js(overrides, |detail| WasmError::BadOverrides { detail })?;
    let missing = from_js(missing, |detail| WasmError::BadMissing { detail })?;
    to_js_all(&voice_rows(catalog()?, src_id, tgt_id, &ov, missing)?)
}

fn preset_view(json: &str, catalog: &Catalog) -> Result<LoadedPreset, WasmError> {
    parse_preset(json, catalog).map_err(|e| match e {
        PresetError::UnknownSource(id) => WasmError::UnknownEngine {
            role: Role::Source,
            id,
        },
        PresetError::UnknownTarget(id) => WasmError::UnknownEngine {
            role: Role::Target,
            id,
        },
        e @ (PresetError::Parse(_) | PresetError::Format(_) | PresetError::Version(_)) => {
            WasmError::BadPreset { detail: chain(&e) }
        }
    })
}

/// Reads a preset file for import: engines resolved to current ids, unreadable edits
/// listed in `skipped`.
#[wasm_bindgen]
pub fn parse_preset_file(json: &str) -> Result<Ts<LoadedPreset>, WasmError> {
    Ok(preset_view(json, catalog()?)?.into_ts()?)
}

fn drums_of(catalog: &Catalog, id: &str, role: Role) -> Result<Vec<Drum>, WasmError> {
    let map = engine(catalog, id, role)?;
    Ok(match role {
        Role::Source => map.source_notes(),
        Role::Target => map.drums(),
    })
}

#[wasm_bindgen]
pub fn engine_drums(tgt_id: &str) -> Result<Vec<Ts<Drum>>, WasmError> {
    to_js_all(&drums_of(catalog()?, tgt_id, Role::Target)?)
}

#[wasm_bindgen]
pub fn engine_notes(src_id: &str) -> Result<Vec<Ts<Drum>>, WasmError> {
    to_js_all(&drums_of(catalog()?, src_id, Role::Source)?)
}

#[wasm_bindgen]
pub fn canon_catalog() -> Result<Vec<Ts<CanonEntry>>, WasmError> {
    let entries: Vec<CanonEntry> = Canon::all().iter().map(|&c| c.into()).collect();
    to_js_all(&entries)
}

/// Every drum family, in the order the app lists them.
#[wasm_bindgen]
pub fn family_order() -> Result<Vec<Ts<Family>>, WasmError> {
    to_js_all(Family::ALL)
}

/// How the 128 notes are written in one octave convention: each note's name and the
/// number of the octave it is in, by note number.
#[derive(Serialize, Tsify)]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct NoteNaming {
    names: Vec<String>,
    octaves: Vec<i8>,
}

/// How the notes are written in every octave convention.
#[derive(Serialize, Tsify)]
#[serde(transparent)]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct NoteNamings(BTreeMap<OctaveBase, NoteNaming>);

fn note_namings() -> NoteNamings {
    NoteNamings(
        OctaveBase::ALL
            .iter()
            .map(|&base| {
                let naming = NoteNaming {
                    names: Note::ALL.map(|n| n.name(base)).to_vec(),
                    octaves: Note::ALL.map(|n| n.octave(base)).to_vec(),
                };
                (base, naming)
            })
            .collect(),
    )
}

/// The names and octave numbers of all 128 notes in every octave convention. The app's
/// build writes them to a file, so the app names notes without calling the module.
#[wasm_bindgen]
pub fn note_naming() -> Result<Ts<NoteNamings>, WasmError> {
    Ok(note_namings().into_ts()?)
}

/// An engine as the pickers list it.
#[derive(Serialize, Tsify, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct Engine {
    id: EngineId,
    name: String,
    full_name: String,
}

fn engines(catalog: &Catalog) -> Vec<Engine> {
    catalog
        .engines()
        .map(|m| Engine {
            id: m.into(),
            name: m.display_name().to_owned(),
            full_name: m.name().to_owned(),
        })
        .collect()
}

#[wasm_bindgen]
pub fn engine_catalog() -> Result<Vec<Ts<Engine>>, WasmError> {
    to_js_all(&engines(catalog()?))
}

/// The bytes of the files a fit is computed over.
#[derive(Deserialize, Tsify)]
#[serde(transparent)]
#[tsify(type = "Uint8Array[]")]
pub struct MidiFiles(Vec<ByteBuf>);

fn fits_of(catalog: &Catalog, mids: &[ByteBuf], scope: ChannelScope) -> SourceFits {
    let hits: NoteHits = mids
        .iter()
        .filter_map(|mid| note_hits(mid, scope).ok())
        .sum();
    core_source_fits(catalog, &hits)
}

/// Every engine fitted to the hits of all `mids` that a conversion with `channel` reads,
/// best first. A file that does not parse is left out: converting it says why.
#[wasm_bindgen]
pub fn source_fits(
    mids: Ts<MidiFiles>,
    channel: Option<Ts<ChannelScope>>,
) -> Result<Ts<SourceFits>, WasmError> {
    let MidiFiles(mids) = mids.to_rust()?;
    let scope = from_js(channel, |detail| WasmError::Internal { detail })?;
    Ok(fits_of(catalog()?, &mids, scope).into_ts()?)
}

fn sample_of(catalog: &Catalog, engine_id: &str) -> Result<Vec<u8>, WasmError> {
    Ok(core_sample_file(engine(catalog, engine_id, Role::Source)?))
}

/// A two-bar groove of kick, snare, closed hi-hat and crash on the notes `engine` plays them
/// on, for trying the converter without a file of one's own.
#[wasm_bindgen]
pub fn sample_file(engine: &str) -> Result<Vec<u8>, WasmError> {
    sample_of(catalog()?, engine)
}

#[cfg(test)]
mod tests {
    use midiremap_core::SkippedEdit;
    use midiremap_testkit::{drums, on};

    use super::*;

    #[test]
    fn catalog_names_engines_by_display_name() {
        let engines = engines(&Catalog::builtin().unwrap());
        let ezd = engines
            .iter()
            .find(|e| e.id.as_str() == "ezdrummer")
            .unwrap();
        assert_eq!(ezd.name, "EZdrummer 3");
    }

    #[test]
    fn catalog_keeps_the_full_name() {
        let engines = engines(&Catalog::builtin().unwrap());
        let ezd = engines
            .iter()
            .find(|e| e.id.as_str() == "ezdrummer")
            .unwrap();
        assert_eq!(ezd.full_name, "Toontrack EZdrummer 3");
    }

    #[test]
    fn catalog_gives_an_engine_without_a_short_name_the_same_name_and_full_name() {
        let engines = engines(&Catalog::builtin().unwrap());
        let hertz = engines.iter().find(|e| e.id.as_str() == "hertz").unwrap();
        assert_eq!(hertz.name, hertz.full_name);
    }

    const FIXTURE: &str = include_str!("../../midiremap-core/tests/golden/my-kit.drumverter.json");

    fn view_through_an_alias_with_a_bogus_edit() -> LoadedPreset {
        let with_alias = r#"{"id":"custom","name":"Custom","aliases":["old_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let catalog = Catalog::builtin()
            .unwrap()
            .with_user_json(with_alias)
            .unwrap();
        let json = FIXTURE
            .replace("ggd_invasion", "old_kit")
            .replace("\"kick.main\": 35", "\"bogus.drum\": 35");
        preset_view(&json, &catalog).unwrap()
    }

    #[test]
    fn preset_view_resolves_a_source_alias() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(view.preset.src.as_str(), "custom");
    }

    #[test]
    fn preset_view_keeps_the_target_engine() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(view.preset.tgt.as_str(), "ezdrummer");
    }

    #[test]
    fn preset_view_carries_the_preset_name() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(view.preset.name.as_str(), "My kit");
    }

    #[test]
    fn a_rack_for_an_unknown_engine_is_an_unknown_engine_error() {
        let err = mapping(
            &Catalog::builtin().unwrap(),
            "ggd_invasion",
            "gone",
            &Overrides::default(),
            MissingDrums::Nearest,
            Unrecognized::Remove,
        )
        .err()
        .unwrap();
        assert_eq!(
            err,
            WasmError::UnknownEngine {
                role: Role::Target,
                id: "gone".to_owned(),
            }
        );
    }

    #[test]
    fn a_blank_preset_name_is_refused() {
        assert!(serde_json::from_str::<PresetName>(r#"" \t""#).is_err());
    }

    #[test]
    fn a_preset_name_serializes_as_its_text() {
        let name: PresetName = serde_json::from_str(r#""My kit""#).unwrap();
        assert_eq!(serde_json::to_string(&name).unwrap(), r#""My kit""#);
    }

    #[test]
    fn preset_view_lists_the_target_edits_it_can_read() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(
            serde_json::to_value(&view.preset.overrides).unwrap()["edits"],
            serde_json::json!({ "china.1.hit": 52 })
        );
    }

    #[test]
    fn preset_view_lists_the_source_edits() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(
            serde_json::to_value(&view.preset.overrides).unwrap()["srcEdits"],
            serde_json::json!({ "24": "snare1.hit", "60": null })
        );
    }

    #[test]
    fn preset_view_lists_the_skipped_edits() {
        let view = view_through_an_alias_with_a_bogus_edit();
        assert_eq!(
            view.skipped,
            [SkippedEdit::UnknownDrum {
                key: "bogus.drum".into()
            }]
        );
    }

    #[test]
    fn preset_view_names_an_unknown_target_engine() {
        let catalog = Catalog::builtin().unwrap();
        let unknown = FIXTURE.replace("ezdrummer", "gone_engine");
        assert_eq!(
            preset_view(&unknown, &catalog).unwrap_err(),
            WasmError::UnknownEngine {
                role: Role::Target,
                id: "gone_engine".to_owned(),
            }
        );
    }

    #[test]
    fn an_unknown_source_engine_error_names_its_role_and_id() {
        let catalog = Catalog::builtin().unwrap();
        let err = voice_rows(
            &catalog,
            "nope",
            "ezdrummer",
            &Overrides::default(),
            MissingDrums::Nearest,
        )
        .err()
        .unwrap();
        assert_eq!(
            err,
            WasmError::UnknownEngine {
                role: Role::Source,
                id: "nope".to_owned(),
            }
        );
    }

    #[test]
    fn an_unknown_target_engine_error_names_its_role_and_id() {
        let catalog = Catalog::builtin().unwrap();
        assert_eq!(
            drums_of(&catalog, "gone", Role::Target).err().unwrap(),
            WasmError::UnknownEngine {
                role: Role::Target,
                id: "gone".to_owned(),
            }
        );
    }

    #[test]
    fn a_bad_midi_error_serializes_as_a_tagged_object() {
        assert_eq!(
            serde_json::to_value(WasmError::BadMidi {
                detail: "invalid midi".into()
            })
            .unwrap(),
            serde_json::json!({ "kind": "badMidi", "detail": "invalid midi" })
        );
    }

    #[test]
    fn an_unknown_engine_error_serializes_as_a_tagged_object() {
        assert_eq!(
            serde_json::to_value(WasmError::UnknownEngine {
                role: Role::Target,
                id: "x".into()
            })
            .unwrap(),
            serde_json::json!({ "kind": "unknownEngine", "role": "target", "id": "x" })
        );
    }

    #[test]
    fn the_typescript_channel_scope_lists_exactly_the_scopes() {
        let scopes: Vec<String> = ChannelScope::all()
            .map(|scope| format!("\"{scope}\""))
            .collect();
        let declared = <ChannelScope as Tsify>::DECL;
        assert!(
            declared.ends_with(&format!(
                "export type ChannelScope = {};",
                scopes.join(" | ")
            )),
            "{declared}"
        );
    }

    #[test]
    fn a_bad_midi_files_detail_carries_its_cause() {
        let catalog = Catalog::builtin().unwrap();
        let midi = convert_file(
            &catalog,
            b"garbage",
            "ggd_invasion",
            "ezdrummer",
            &Overrides::default(),
            &Settings {
                scope: ChannelScope::Auto,
                missing: MissingDrums::Nearest,
                unrecognized: Unrecognized::Remove,
            },
        )
        .err()
        .unwrap();
        assert_eq!(
            midi,
            WasmError::BadMidi {
                detail: "MIDI parse error: invalid midi: not a midi file".to_owned()
            }
        );
    }

    fn converted_unrecognized(unrecognized: Unrecognized) -> Converted {
        convert_file(
            &Catalog::builtin().unwrap(),
            &drums(&[(0, on(99))]),
            "ggd_invasion",
            "ezdrummer",
            &Overrides::default(),
            &Settings {
                scope: ChannelScope::Auto,
                missing: MissingDrums::Nearest,
                unrecognized,
            },
        )
        .unwrap()
    }

    #[test]
    fn a_kept_unrecognized_note_is_written_out_unchanged() {
        let out = converted_unrecognized(Unrecognized::Keep);
        assert_eq!(out.bytes, drums(&[(0, on(99))]));
    }

    #[test]
    fn a_removed_unrecognized_note_is_left_out() {
        let out = converted_unrecognized(Unrecognized::Remove);
        assert_ne!(out.bytes, drums(&[(0, on(99))]));
    }

    #[test]
    fn a_kept_unrecognized_note_is_still_reported() {
        let out = converted_unrecognized(Unrecognized::Keep);
        assert_eq!(out.report.unmapped_source().count(), 1);
    }

    #[test]
    fn the_typescript_unrecognized_lists_exactly_the_choices() {
        let declared = <Unrecognized as Tsify>::DECL;
        assert!(
            declared.ends_with(r#"export type Unrecognized = "remove" | "keep";"#),
            "{declared}"
        );
    }

    #[test]
    fn a_bad_preset_files_detail_carries_its_cause() {
        let catalog = Catalog::builtin().unwrap();
        let WasmError::BadPreset { detail } = preset_view("{", &catalog).unwrap_err() else {
            panic!("not BadPreset");
        };
        assert!(
            detail.starts_with("not a preset file: EOF while parsing"),
            "{detail}"
        );
    }

    fn ggd_fit(mids: &[&[u8]]) -> (u32, u32) {
        let mids: Vec<ByteBuf> = mids.iter().map(|mid| ByteBuf::from(*mid)).collect();
        let fits = fits_of(&Catalog::builtin().unwrap(), &mids, ChannelScope::Auto);
        let ggd = fits
            .ranked()
            .iter()
            .find(|fit| fit.engine().as_str() == "ggd_invasion")
            .unwrap();
        (ggd.recognized(), fits.hits())
    }

    #[test]
    fn source_fits_sum_the_hits_of_every_file() {
        let one = drums(&[(0, on(24)), (0, on(99))]);
        let two = drums(&[(0, on(26))]);
        assert_eq!(ggd_fit(&[&one, &two]), (2, 3));
    }

    #[test]
    fn source_fits_leave_out_a_file_that_does_not_parse() {
        let good = drums(&[(0, on(24))]);
        assert_eq!(ggd_fit(&[&good, b"garbage"]).1, 1);
    }

    #[test]
    fn a_sample_is_recognized_whole_by_the_engine_it_was_made_for() {
        let sample = sample_of(&Catalog::builtin().unwrap(), "ggd_invasion").unwrap();
        let (recognized, hits) = ggd_fit(&[&sample]);
        assert!(hits > 0 && recognized == hits, "{recognized} of {hits}");
    }

    #[test]
    fn a_sample_for_an_unknown_engine_names_it_as_the_source() {
        assert_eq!(
            sample_of(&Catalog::builtin().unwrap(), "gone").unwrap_err(),
            WasmError::UnknownEngine {
                role: Role::Source,
                id: "gone".to_owned(),
            }
        );
    }

    #[test]
    fn a_preset_name_is_typed_for_typescript_as_a_brand() {
        assert!(
            <PresetName as Tsify>::DECL.ends_with(
                r#"export type PresetName = string & { readonly __brand: "PresetName" };"#
            ),
            "{}",
            <PresetName as Tsify>::DECL
        );
    }
}
