use std::{collections::BTreeMap, error::Error};

use midiremap_core::{
    convert, parse_preset, plan as core_plan, Canon, Catalog, ChannelScope, Drum, EngineMap,
    Family, LoadedPreset, Mapping, MissingDrums, Note, OctaveBase, Overrides, Report, SkippedEdit,
    VoicePlan,
};
use serde::{de::DeserializeOwned, Serialize};
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
    BadChannel { detail: String },
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

/// The result of [`remap`]: the converted file and what happened to its notes.
#[derive(Serialize, Tsify)]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct RemapOutput {
    #[serde(with = "serde_bytes")]
    #[tsify(type = "Uint8Array<ArrayBuffer>")]
    bytes: Vec<u8>,
    report: Report,
}

fn convert_file(
    catalog: &Catalog,
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    ov: &Overrides,
    channel: Option<&str>,
    missing: MissingDrums,
) -> Result<RemapOutput, WasmError> {
    let src = engine(catalog, src_id, Role::Source)?;
    let tgt = engine(catalog, tgt_id, Role::Target)?;
    let scope: ChannelScope = channel
        .map_or(Ok(ChannelScope::Auto), str::parse)
        .map_err(|e| WasmError::BadChannel {
            detail: e.to_string(),
        })?;
    let out = convert(mid, &Mapping::new(src, tgt, ov, missing), scope)
        .map_err(|e| WasmError::BadMidi { detail: chain(&e) })?;
    Ok(RemapOutput {
        bytes: out.bytes,
        report: out.report,
    })
}

#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    overrides: Option<Ts<Overrides>>,
    channel: Option<String>,
    missing: Option<Ts<MissingDrums>>,
) -> Result<Ts<RemapOutput>, WasmError> {
    let ov = from_js(overrides, |detail| WasmError::BadOverrides { detail })?;
    let missing = from_js(missing, |detail| WasmError::BadMissing { detail })?;
    let out = convert_file(
        catalog()?,
        mid,
        src_id,
        tgt_id,
        &ov,
        channel.as_deref(),
        missing,
    )?;
    Ok(out.into_ts()?)
}

/// One drum of the edit preview with its display label.
#[derive(Serialize, Tsify)]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct VoiceRow {
    #[serde(flatten)]
    plan: VoicePlan,
    label: String,
}

impl From<VoicePlan> for VoiceRow {
    fn from(plan: VoicePlan) -> Self {
        Self {
            label: plan.canon.label(),
            plan,
        }
    }
}

fn voice_rows(
    catalog: &Catalog,
    src_id: &str,
    tgt_id: &str,
    ov: &Overrides,
    missing: MissingDrums,
) -> Result<Vec<VoiceRow>, WasmError> {
    let src = engine(catalog, src_id, Role::Source)?;
    let tgt = engine(catalog, tgt_id, Role::Target)?;
    Ok(core_plan(src, tgt, ov, missing)
        .into_iter()
        .map(VoiceRow::from)
        .collect())
}

#[wasm_bindgen]
pub fn plan(
    src_id: &str,
    tgt_id: &str,
    overrides: Option<Ts<Overrides>>,
    missing: Option<Ts<MissingDrums>>,
) -> Result<Vec<Ts<VoiceRow>>, WasmError> {
    let ov = from_js(overrides, |detail| WasmError::BadOverrides { detail })?;
    let missing = from_js(missing, |detail| WasmError::BadMissing { detail })?;
    to_js_all(&voice_rows(catalog()?, src_id, tgt_id, &ov, missing)?)
}

/// A preset file read for import: engines resolved to current ids, unreadable edits
/// listed in `skipped`.
#[derive(Serialize, Tsify, Debug)]
#[serde(rename_all = "camelCase")]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct PresetView {
    name: String,
    src: String,
    tgt: String,
    edits: BTreeMap<String, u8>,
    src_edits: BTreeMap<String, Option<String>>,
    skipped: Vec<SkippedEdit>,
}

fn preset_view(json: &str, catalog: &Catalog) -> Result<PresetView, WasmError> {
    let LoadedPreset { preset, skipped } =
        parse_preset(json).map_err(|e| WasmError::BadPreset { detail: chain(&e) })?;
    let engine = |id: &str, role| {
        catalog
            .canonical_id(id)
            .map(str::to_owned)
            .ok_or_else(|| WasmError::UnknownEngine {
                role,
                id: id.to_owned(),
            })
    };
    Ok(PresetView {
        src: engine(preset.src.as_str(), Role::Source)?,
        tgt: engine(preset.tgt.as_str(), Role::Target)?,
        edits: preset
            .edits
            .iter()
            .map(|(canon, note)| (canon.to_string(), note.get()))
            .collect(),
        src_edits: preset
            .src_edits
            .iter()
            .map(|(note, canon)| (note.get().to_string(), canon.map(|c| c.to_string())))
            .collect(),
        name: preset.name.into(),
        skipped,
    })
}

/// Reads a preset file for import: engines resolved to current ids, unreadable edits
/// listed in `skipped`.
#[wasm_bindgen]
pub fn parse_preset_file(json: &str) -> Result<Ts<PresetView>, WasmError> {
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

/// One entry of the canonical drum vocabulary.
#[derive(Serialize, Tsify)]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct CanonInfo {
    canon: Canon,
    label: String,
    family: Family,
}

#[wasm_bindgen]
pub fn canon_catalog() -> Result<Vec<Ts<CanonInfo>>, WasmError> {
    let items: Vec<CanonInfo> = Canon::all()
        .iter()
        .map(|&c| CanonInfo {
            canon: c,
            label: c.label(),
            family: c.family(),
        })
        .collect();
    to_js_all(&items)
}

/// Every drum family, in the order the app lists them.
#[wasm_bindgen]
pub fn family_order() -> Result<Vec<Ts<Family>>, WasmError> {
    to_js_all(Family::ALL)
}

/// The names of all 128 notes in the given octave convention.
#[wasm_bindgen]
pub fn note_names(base: Ts<OctaveBase>) -> Result<Vec<String>, WasmError> {
    let base: OctaveBase = base.to_rust().map_err(|e| WasmError::Internal {
        detail: e.to_string(),
    })?;
    Ok(Note::ALL.map(|n| n.name(base)).to_vec())
}

/// An engine as the pickers list it.
#[derive(Serialize, Tsify, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
#[tsify(missing_as_null, hashmap_as_object)]
pub struct EngineInfo {
    id: String,
    name: String,
    full_name: String,
}

fn engine_infos(catalog: &Catalog) -> Vec<EngineInfo> {
    catalog
        .engines()
        .map(|m| EngineInfo {
            id: m.id().to_owned(),
            name: m.display_name().to_owned(),
            full_name: m.name().to_owned(),
        })
        .collect()
}

#[wasm_bindgen]
pub fn engine_catalog() -> Result<Vec<Ts<EngineInfo>>, WasmError> {
    to_js_all(&engine_infos(catalog()?))
}

#[cfg(test)]
mod tests {
    use midiremap_core::PlanOutcome;

    use super::*;

    #[test]
    fn catalog_names_engines_by_display_name_and_keeps_the_full_name() {
        let infos = engine_infos(&Catalog::builtin().unwrap());
        let ezd = infos.iter().find(|i| i.id == "ezdrummer").unwrap();
        assert_eq!(ezd.name, "EZdrummer 3");
        assert_eq!(ezd.full_name, "Toontrack EZdrummer 3");
        let hertz = infos.iter().find(|i| i.id == "hertz").unwrap();
        assert_eq!(hertz.name, hertz.full_name);
    }

    const FIXTURE: &str = include_str!("../../app/test/fixtures/my-kit.drumverter.json");

    #[test]
    fn preset_view_resolves_engines_and_lists_skipped_edits() {
        let with_alias = r#"{"id":"custom","name":"Custom","aliases":["old_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let catalog = Catalog::builtin()
            .unwrap()
            .with_user_json(with_alias)
            .unwrap();
        let json = FIXTURE
            .replace("ggd_invasion", "old_kit")
            .replace("\"kick.main\": 35", "\"bogus.drum\": 35");
        let view = preset_view(&json, &catalog).unwrap();
        assert_eq!(view.src, "custom");
        assert_eq!(view.tgt, "ezdrummer");
        assert_eq!(view.name, "My kit");
        assert_eq!(view.edits.get("china.1.hit"), Some(&52));
        assert_eq!(
            view.src_edits.get("24"),
            Some(&Some("snare1.hit".to_owned()))
        );
        assert_eq!(view.src_edits.get("60"), Some(&None));
        assert_eq!(
            view.skipped,
            [SkippedEdit::UnknownDrum {
                key: "bogus.drum".into()
            }]
        );
    }

    #[test]
    fn preset_view_names_an_unknown_engine_and_rejects_bad_files() {
        let catalog = Catalog::builtin().unwrap();
        let unknown = FIXTURE.replace("ezdrummer", "gone_engine");
        assert_eq!(
            preset_view(&unknown, &catalog).unwrap_err(),
            WasmError::UnknownEngine {
                role: Role::Target,
                id: "gone_engine".to_owned(),
            }
        );
        assert!(matches!(
            preset_view("{}", &catalog).unwrap_err(),
            WasmError::BadPreset { .. }
        ));
    }

    #[test]
    fn an_unknown_engine_error_names_its_role_and_id() {
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
        assert_eq!(
            drums_of(&catalog, "gone", Role::Target).err().unwrap(),
            WasmError::UnknownEngine {
                role: Role::Target,
                id: "gone".to_owned(),
            }
        );
    }

    #[test]
    fn a_wasm_error_serializes_as_a_tagged_object() {
        assert_eq!(
            serde_json::to_value(WasmError::BadMidi {
                detail: "invalid midi".into()
            })
            .unwrap(),
            serde_json::json!({ "kind": "badMidi", "detail": "invalid midi" })
        );
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
    fn conversion_errors_are_typed() {
        let catalog = Catalog::builtin().unwrap();
        let err = |mid: &[u8], channel: Option<&str>| {
            convert_file(
                &catalog,
                mid,
                "ggd_invasion",
                "ezdrummer",
                &Overrides::default(),
                channel,
                MissingDrums::Nearest,
            )
            .err()
        };
        assert!(matches!(
            err(b"nope", None),
            Some(WasmError::BadMidi { .. })
        ));
        assert!(matches!(
            err(b"nope", Some("17")),
            Some(WasmError::BadChannel { .. })
        ));
    }

    #[test]
    fn a_bad_files_detail_carries_its_cause() {
        let catalog = Catalog::builtin().unwrap();
        let midi = convert_file(
            &catalog,
            b"garbage",
            "ggd_invasion",
            "ezdrummer",
            &Overrides::default(),
            None,
            MissingDrums::Nearest,
        )
        .err()
        .unwrap();
        assert_eq!(
            midi,
            WasmError::BadMidi {
                detail: "MIDI parse error: invalid midi: not a midi file".to_owned()
            }
        );
        let WasmError::BadPreset { detail } = preset_view("{", &catalog).unwrap_err() else {
            panic!("not BadPreset");
        };
        assert!(
            detail.starts_with("not a preset file: EOF while parsing"),
            "{detail}"
        );
    }

    #[test]
    fn voice_rows_flatten_the_plan_and_add_the_label() {
        let catalog = Catalog::builtin().unwrap();
        let rows = voice_rows(
            &catalog,
            "ggd_invasion",
            "ezdrummer",
            &Overrides::default(),
            MissingDrums::Drop,
        )
        .unwrap();
        let find = |key: &str| {
            rows.iter()
                .find(|r| r.plan.canon.to_string() == key)
                .unwrap()
        };
        let china = find("china.1.hit");
        let json = serde_json::to_value(china).unwrap();
        assert_eq!(
            json["outcome"],
            serde_json::json!({ "status": "dropped", "otherDrum": true })
        );
        assert_eq!(json["label"], china.plan.canon.label());
        assert!(matches!(
            find("kick.main").plan.outcome,
            PlanOutcome::Direct { .. }
        ));
    }
}
