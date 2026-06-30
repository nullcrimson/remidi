use midiremap_core::{BuiltinMaps, Conversion, DefaultFallbacks, LayeredMaps, MapProvider, Report};
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
struct Output {
    bytes: Vec<u8>,
    report: Report,
}

/// Convert a drum `.mid` from `src_id` to `tgt_id`.
///
/// `user_maps_json`, if present, is a single engine-map JSON document that adds
/// or overrides an engine before the conversion. Returns `{ bytes, report }`.
#[wasm_bindgen]
pub fn remap(
    mid: &[u8],
    src_id: &str,
    tgt_id: &str,
    user_maps_json: Option<String>,
) -> Result<JsValue, JsValue> {
    let mut provider = LayeredMaps::new(BuiltinMaps::new());
    if let Some(json) = user_maps_json {
        provider = provider
            .with_user_json(&json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
    }

    let src = provider
        .get(src_id)
        .ok_or_else(|| JsValue::from_str("unknown source engine"))?;
    let tgt = provider
        .get(tgt_id)
        .ok_or_else(|| JsValue::from_str("unknown target engine"))?;

    let fb = DefaultFallbacks;
    let conv = Conversion::new(src, tgt, &fb);
    let out = conv
        .run(mid)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let payload = Output {
        bytes: out.bytes,
        report: out.report,
    };
    serde_wasm_bindgen::to_value(&payload).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// List the built-in engine ids available without any user maps.
#[wasm_bindgen]
pub fn list_engines() -> Vec<String> {
    let mut ids: Vec<String> = BuiltinMaps::new()
        .ids()
        .iter()
        .map(|s| s.to_string())
        .collect();
    ids.sort_unstable();
    ids
}
