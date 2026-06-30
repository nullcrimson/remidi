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
            include_str!("../../engines/general_midi.toml"),
            include_str!("../../engines/guitar_pro.toml"),
            include_str!("../../engines/superior_drummer3.toml"),
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
    fn builtin_has_all_engines() {
        let b = BuiltinMaps::new();
        for id in [
            "ggd_invasion",
            "ezdrummer",
            "addictive_drums2",
            "general_midi",
            "guitar_pro",
            "superior_drummer3",
        ] {
            assert!(b.get(id).is_some(), "missing builtin engine {id}");
        }
    }

    #[test]
    fn engine_specific_decodes() {
        use crate::canon::Canon;
        let b = BuiltinMaps::new();
        // GM: classic percussion notes
        assert_eq!(
            b.get("general_midi").unwrap().decode(36),
            Some(Canon::KickMain)
        );
        assert_eq!(
            b.get("general_midi").unwrap().decode(42),
            Some(Canon::HatClosed)
        );
        // Guitar Pro is pure GM
        assert_eq!(
            b.get("guitar_pro").unwrap().decode(38),
            Some(Canon::SnareCenter)
        );
        // SD3 has real rimshot (40) and ruff (39) articulations
        assert_eq!(
            b.get("superior_drummer3").unwrap().decode(40),
            Some(Canon::SnareRim)
        );
        assert_eq!(
            b.get("superior_drummer3").unwrap().decode(39),
            Some(Canon::SnareRuff)
        );
    }

    #[test]
    fn ggd_cymbal_ranges_have_no_gaps() {
        let b = BuiltinMaps::new();
        let ggd = b.get("ggd_invasion").unwrap();
        // every note across the cymbal/stack blocks decodes to something
        for note in [53u8, 54, 55, 57, 58, 59, 66, 67, 68, 74, 75, 76, 79, 80] {
            assert!(ggd.decode(note).is_some(), "GGD note {note} should map");
        }
        assert_eq!(ggd.decode(54), Some(crate::canon::Canon::CrashChoke));
        assert_eq!(ggd.decode(67), Some(crate::canon::Canon::CrashChoke));
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
        // 6 builtin engines + 1 user engine
        assert_eq!(ids.len(), 7);
    }
}
