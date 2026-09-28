use std::collections::BTreeMap;

use midiremap_core::{
    convert, parse_preset, plan as core_plan, Canon, Catalog, ChannelScope, ChannelScopeError,
    LoadedPreset, Mapping, MissingDrums, MissingDrumsParseError, Note, Overrides, PlanStatus,
    Report, VoicePlan,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Prints a panic's message and location to the browser console instead of a bare
/// `unreachable` trap.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize)]
struct Output {
    #[serde(with = "serde_bytes")]
    bytes: Vec<u8>,
    report: Report,
}

fn parse_overrides(overrides_json: Option<String>) -> Result<Overrides, JsValue> {
    overrides_json.map_or_else(
        || Ok(Overrides::default()),
        |s| serde_json::from_str(&s).map_err(|e| JsValue::from_str(&e.to_string())),
    )
}

fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_missing_as_null(true);
    value
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn parse_channel(channel: Option<String>) -> Result<ChannelScope, JsValue> {
    channel.map_or(Ok(ChannelScope::Auto), |s| {
        s.parse()
            .map_err(|e: ChannelScopeError| JsValue::from_str(&e.to_string()))
    })
}

fn missing_of(missing: Option<&str>) -> Result<MissingDrums, MissingDrumsParseError> {
    missing.map_or(Ok(MissingDrums::default()), str::parse)
}

fn parse_missing(missing: Option<String>) -> Result<MissingDrums, JsValue> {
    missing_of(missing.as_deref()).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
    channel: Option<String>,
    missing: Option<String>,
) -> Result<JsValue, JsValue> {
    let provider = Catalog::shared();
    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;
    let ov = parse_overrides(overrides_json)?;
    let scope = parse_channel(channel)?;
    let missing = parse_missing(missing)?;
    let out = convert(mid, &Mapping::new(src, tgt, &ov, missing), scope)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let payload = Output {
        bytes: out.bytes,
        report: out.report,
    };
    to_js(&payload)
}

#[derive(Serialize)]
struct VoiceRow {
    canon: String,
    label: String,
    src_notes: Vec<Note>,
    tgt_note: Option<Note>,
    default_tgt_note: Option<Note>,
    status: &'static str,
    other_drum: bool,
}

impl From<VoicePlan> for VoiceRow {
    fn from(v: VoicePlan) -> Self {
        Self {
            canon: v.canon.to_string(),
            label: v.canon.label(),
            src_notes: v.src_notes,
            tgt_note: v.tgt_note,
            default_tgt_note: v.default_tgt_note,
            status: match v.status {
                PlanStatus::Direct => "direct",
                PlanStatus::Fallback => "fallback",
                PlanStatus::Dropped => "dropped",
            },
            other_drum: v.other_drum,
        }
    }
}

#[wasm_bindgen]
pub fn plan(
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
    missing: Option<String>,
) -> Result<JsValue, JsValue> {
    let provider = Catalog::shared();
    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;
    let ov = parse_overrides(overrides_json)?;
    let missing = parse_missing(missing)?;
    let rows: Vec<VoiceRow> = core_plan(src, tgt, &ov, missing)
        .into_iter()
        .map(VoiceRow::from)
        .collect();
    to_js(&rows)
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PresetView {
    name: String,
    src: String,
    tgt: String,
    edits: BTreeMap<String, u8>,
    src_edits: BTreeMap<String, Option<String>>,
    skipped: Vec<String>,
}

fn preset_view(json: &str, catalog: &Catalog) -> Result<PresetView, String> {
    let LoadedPreset { preset, skipped } = parse_preset(json).map_err(|e| e.to_string())?;
    let engine = |id: &str| {
        catalog
            .canonical_id(id)
            .map(str::to_owned)
            .ok_or_else(|| format!("unknown engine '{id}'"))
    };
    Ok(PresetView {
        src: engine(&preset.src)?,
        tgt: engine(&preset.tgt)?,
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
        name: preset.name,
        skipped,
    })
}

/// Reads a preset file for import: engines resolved to current ids, unreadable edits
/// listed in `skipped`.
#[wasm_bindgen]
pub fn parse_preset_file(json: &str) -> Result<JsValue, JsValue> {
    let view = preset_view(json, Catalog::shared()).map_err(|e| JsValue::from_str(&e))?;
    to_js(&view)
}

#[derive(Serialize)]
struct DrumView {
    note: Note,
    canon: String,
    label: String,
    family: String,
}

#[wasm_bindgen]
pub fn engine_drums(tgt_id: &str) -> Result<JsValue, JsValue> {
    let provider = Catalog::shared();
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;
    let drums: Vec<DrumView> = tgt
        .drums()
        .into_iter()
        .map(|d| DrumView {
            note: d.note,
            canon: d.canon.to_string(),
            label: d.label,
            family: d.family.to_string(),
        })
        .collect();
    to_js(&drums)
}

#[wasm_bindgen]
pub fn engine_notes(src_id: &str) -> Result<JsValue, JsValue> {
    let provider = Catalog::shared();
    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let notes: Vec<DrumView> = src
        .source_notes()
        .into_iter()
        .map(|d| DrumView {
            note: d.note,
            canon: d.canon.to_string(),
            label: d.label,
            family: d.family.to_string(),
        })
        .collect();
    to_js(&notes)
}

#[derive(Serialize)]
struct CanonView {
    canon: String,
    label: String,
    family: String,
}

#[wasm_bindgen]
pub fn canon_catalog() -> Result<JsValue, JsValue> {
    let items: Vec<CanonView> = Canon::all()
        .iter()
        .map(|&c| CanonView {
            canon: c.to_string(),
            label: c.label(),
            family: c.family().to_string(),
        })
        .collect();
    to_js(&items)
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct EngineInfo {
    id: String,
    name: String,
    full_name: String,
}

fn engine_infos(catalog: &Catalog) -> Vec<EngineInfo> {
    let mut ids = catalog.ids();
    ids.sort_unstable();
    ids.into_iter()
        .filter_map(|id| catalog.get(id))
        .map(|m| EngineInfo {
            id: m.id.clone(),
            name: m.display_name().to_string(),
            full_name: m.name.clone(),
        })
        .collect()
}

#[wasm_bindgen]
pub fn engine_catalog() -> Result<JsValue, JsValue> {
    to_js(&engine_infos(Catalog::shared()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_names_engines_by_display_name_and_keeps_the_full_name() {
        let infos = engine_infos(&Catalog::builtin());
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
        let catalog = Catalog::builtin().with_user_json(with_alias).unwrap();
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
        assert_eq!(view.skipped, ["unknown drum 'bogus.drum'"]);
    }

    #[test]
    fn preset_view_rejects_unknown_engines_and_bad_files() {
        let catalog = Catalog::builtin();
        let unknown = FIXTURE.replace("ezdrummer", "gone_engine");
        assert_eq!(
            preset_view(&unknown, &catalog).err().as_deref(),
            Some("unknown engine 'gone_engine'")
        );
        assert!(preset_view("{}", &catalog).is_err());
    }

    #[test]
    fn missing_defaults_to_nearest_and_rejects_unknown_values() {
        assert_eq!(missing_of(None), Ok(MissingDrums::Nearest));
        assert_eq!(missing_of(Some("drop")), Ok(MissingDrums::Drop));
        assert!(missing_of(Some("maybe")).is_err());
    }

    #[test]
    fn voice_rows_carry_other_drum_and_the_drop_status() {
        let catalog = Catalog::builtin();
        let rows: Vec<VoiceRow> = core_plan(
            catalog.get("ggd_invasion").unwrap(),
            catalog.get("ezdrummer").unwrap(),
            &Overrides::default(),
            MissingDrums::Drop,
        )
        .into_iter()
        .map(VoiceRow::from)
        .collect();
        let china = rows.iter().find(|r| r.canon == "china.1.hit").unwrap();
        assert!(china.other_drum);
        assert_eq!(china.status, "dropped");
        let kick = rows.iter().find(|r| r.canon == "kick.main").unwrap();
        assert!(!kick.other_drum);
        assert_eq!(kick.status, "direct");
    }
}
