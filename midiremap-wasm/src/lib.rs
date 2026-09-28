use midiremap_core::{
    convert, plan as core_plan, Canon, Catalog, ChannelScope, ChannelScopeError, Mapping, Note,
    Overrides, PlanStatus, Report,
};
use serde::Serialize;
use wasm_bindgen::prelude::*;

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

#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
    channel: Option<String>,
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
    let out = convert(mid, &Mapping::new(src, tgt, &ov), scope)
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
}

#[wasm_bindgen]
pub fn plan(
    src_id: &str,
    tgt_id: &str,
    overrides_json: Option<String>,
) -> Result<JsValue, JsValue> {
    let provider = Catalog::shared();
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
            src_notes: v.src_notes,
            tgt_note: v.tgt_note,
            default_tgt_note: v.default_tgt_note,
            status: match v.status {
                PlanStatus::Direct => "direct",
                PlanStatus::Fallback => "fallback",
                PlanStatus::Dropped => "dropped",
            },
        })
        .collect();
    to_js(&rows)
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
}
