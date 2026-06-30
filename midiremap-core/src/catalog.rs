use std::collections::HashMap;

use crate::engine_map::{from_json, from_toml, EngineMap, MapError};

/// A source of engine maps, keyed by id.
pub trait MapProvider {
    fn get(&self, id: &str) -> Option<&EngineMap>;
    fn ids(&self) -> Vec<&str>;
}

/// Presets embedded with `include_str!` at compile time.
pub struct BuiltinMaps {
    maps: HashMap<String, EngineMap>,
}

impl BuiltinMaps {
    pub fn new() -> Self {
        let mut maps = HashMap::new();
        for src in [
            include_str!("../../engines/ggd_invasion.toml"),
            include_str!("../../engines/ezdrummer.toml"),
            include_str!("../../engines/addictive_drums2.toml"),
        ] {
            let m = from_toml(src).expect("embedded preset must be valid");
            maps.insert(m.id.clone(), m);
        }
        Self { maps }
    }
}

impl Default for BuiltinMaps {
    fn default() -> Self {
        Self::new()
    }
}

impl MapProvider for BuiltinMaps {
    fn get(&self, id: &str) -> Option<&EngineMap> {
        self.maps.get(id)
    }
    fn ids(&self) -> Vec<&str> {
        self.maps.keys().map(|s| s.as_str()).collect()
    }
}

/// User maps layered over a base provider. `get` hits overrides first, then the
/// base. Immutable composition — a user map never clobbers the embedded one in
/// place; it shadows it.
pub struct LayeredMaps<P: MapProvider> {
    base: P,
    overrides: HashMap<String, EngineMap>,
}

impl<P: MapProvider> LayeredMaps<P> {
    pub fn new(base: P) -> Self {
        Self {
            base,
            overrides: HashMap::new(),
        }
    }

    /// Add or override one engine from a JSON map document.
    pub fn with_user_json(mut self, json: &str) -> Result<Self, MapError> {
        let m = from_json(json)?;
        self.overrides.insert(m.id.clone(), m);
        Ok(self)
    }
}

impl<P: MapProvider> MapProvider for LayeredMaps<P> {
    fn get(&self, id: &str) -> Option<&EngineMap> {
        self.overrides.get(id).or_else(|| self.base.get(id))
    }
    fn ids(&self) -> Vec<&str> {
        let mut ids: Vec<&str> = self.base.ids();
        for k in self.overrides.keys() {
            if !ids.contains(&k.as_str()) {
                ids.push(k.as_str());
            }
        }
        ids
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine_map::{Decoder, Encoder};

    #[test]
    fn builtin_has_both_engines() {
        let b = BuiltinMaps::new();
        assert!(b.get("ggd_invasion").is_some());
        assert!(b.get("ezdrummer").is_some());
        assert!(b.get("addictive_drums2").is_some());
    }

    #[test]
    fn addictive_drums2_native_layout() {
        let b = BuiltinMaps::new();
        let ad2 = b.get("addictive_drums2").unwrap();
        // native AD2: closed hat is 49 (not GM 42), open A is 54, kick 36
        assert_eq!(ad2.decode(49), Some(crate::canon::Canon::HatClosed));
        assert_eq!(ad2.decode(36), Some(crate::canon::Canon::KickMain));
        assert_eq!(ad2.encode(crate::canon::Canon::HatOpen1), Some(54));
    }

    #[test]
    fn layered_override_shadows_base() {
        let json = r#"{"id":"ezdrummer","name":"Custom EZD","notes":[{"note":35,"canon":"KickMain","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        let ezd = p.get("ezdrummer").unwrap();
        assert_eq!(ezd.name, "Custom EZD");
        assert_eq!(ezd.encode(crate::canon::Canon::KickMain), Some(35));
    }

    #[test]
    fn layered_falls_through_to_base() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"KickMain","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        // ggd_invasion is untouched, still served by the base
        assert_eq!(
            p.get("ggd_invasion").unwrap().decode(24),
            Some(crate::canon::Canon::KickMain)
        );
        // and the user engine is present
        assert!(p.get("custom").is_some());
    }

    #[test]
    fn layered_ids_are_union() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"KickMain","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        let ids = p.ids();
        assert!(ids.contains(&"ggd_invasion"));
        assert!(ids.contains(&"ezdrummer"));
        assert!(ids.contains(&"custom"));
        // 3 builtin engines + 1 user engine
        assert_eq!(ids.len(), 4);
    }
}
