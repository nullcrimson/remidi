use std::collections::BTreeMap;

use midiremap_core::{
    plan as core_plan, remap_with_overrides, BuiltinMaps, MapProvider, Overrides, PlanStatus,
    Report,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
struct ReportView {
    unmapped_source: BTreeMap<String, u32>,
    fallback_used: BTreeMap<String, u32>,
    dropped: BTreeMap<String, u32>,
}

impl From<Report> for ReportView {
    fn from(r: Report) -> Self {
        ReportView {
            unmapped_source: r
                .unmapped_source
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
            fallback_used: r
                .fallback_used
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
            dropped: r
                .dropped
                .into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect(),
        }
    }
}

#[derive(Serialize)]
struct Output {
    bytes: Vec<u8>,
    report: ReportView,
}

fn parse_overrides(overrides_json: Option<String>) -> Result<Overrides, JsValue> {
    let ov = match overrides_json {
        Some(s) => {
            serde_json::from_str::<Overrides>(&s).map_err(|e| JsValue::from_str(&e.to_string()))?
        }
        None => Overrides::default(),
    };
    ov.validate()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(ov)
}

#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
) -> Result<JsValue, JsValue> {
    let provider = BuiltinMaps::new();
    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;
    let ov = parse_overrides(overrides_json)?;
    let out =
        remap_with_overrides(mid, src, tgt, &ov).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let payload = Output {
        bytes: out.bytes,
        report: out.report.into(),
    };
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    payload
        .serialize(&serializer)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[derive(Serialize)]
struct VoiceRow {
    canon: String,
    label: String,
    src_note: u8,
    tgt_note: Option<u8>,
    status: &'static str,
}

#[wasm_bindgen]
pub fn plan(
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
) -> Result<JsValue, JsValue> {
    let provider = BuiltinMaps::new();
    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;
    let ov = parse_overrides(overrides_json)?;
    let rows: Vec<VoiceRow> = core_plan(src, tgt, &ov)
        .into_iter()
        .map(|v| VoiceRow {
            canon: v.canon.to_string(),
            label: v.canon.label(),
            src_note: v.src_note,
            tgt_note: v.tgt_note,
            status: match v.status {
                PlanStatus::Direct => "direct",
                PlanStatus::Fallback => "fallback",
                PlanStatus::Dropped => "dropped",
            },
        })
        .collect();
    serde_wasm_bindgen::to_value(&rows).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[derive(Serialize)]
struct EngineInfo {
    id: String,
    name: String,
}

#[wasm_bindgen]
pub fn engine_catalog() -> Result<JsValue, JsValue> {
    let b = BuiltinMaps::new();
    let mut ids = b.ids();
    ids.sort_unstable();
    let infos: Vec<EngineInfo> = ids
        .into_iter()
        .map(|id| {
            let m = b.get(id).expect("id from ids() must resolve");
            EngineInfo {
                id: m.id.clone(),
                name: m.name.clone(),
            }
        })
        .collect();
    serde_wasm_bindgen::to_value(&infos).map_err(|e| JsValue::from_str(&e.to_string()))
}
