use std::collections::{HashMap, HashSet};

use crate::engine_map::{from_json, from_toml, EngineMap, MapError};

pub trait MapProvider {
    fn get(&self, id: &str) -> Option<&EngineMap>;
    fn ids(&self) -> Vec<&str>;
}

pub struct BuiltinMaps {
    maps: HashMap<String, EngineMap>,
}

impl BuiltinMaps {
    pub fn new() -> Self {
        let mut maps = HashMap::new();
        for src in crate::embedded_engines::EMBEDDED {
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
        let base_ids: HashSet<&str> = ids.iter().copied().collect();
        for k in self.overrides.keys() {
            if !base_ids.contains(k.as_str()) {
                ids.push(k.as_str());
            }
        }
        ids
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{Canon, HatOpen, HatZone, KickKind, SnareArtic},
        engine_map::{Decoder, Encoder},
    };

    #[test]
    fn builtin_has_known_slugs() {
        let b = BuiltinMaps::new();
        for id in [
            "ggd_invasion",
            "ezdrummer",
            "general_midi",
            "guitar_pro",
            "addictive_drums2",
            "superior_drummer3",
        ] {
            assert!(b.get(id).is_some(), "missing {id}");
        }
        assert!(
            b.ids().len() >= 40,
            "expected ~50 engines, got {}",
            b.ids().len()
        );
    }

    #[test]
    fn engine_specific_decodes() {
        let b = BuiltinMaps::new();
        assert_eq!(
            b.get("general_midi").unwrap().decode(36),
            Some(Canon::Kick(KickKind::Main))
        );
        assert_eq!(
            b.get("general_midi").unwrap().decode(42),
            Some(Canon::Hat(HatOpen::Closed, HatZone::Plain))
        );
        assert_eq!(
            b.get("guitar_pro").unwrap().decode(38),
            Some(Canon::Snare(1, SnareArtic::Hit))
        );
    }

    #[test]
    fn ggd_cymbal_layout_is_fixed() {
        let b = BuiltinMaps::new();
        let ggd = b.get("ggd_invasion").unwrap();
        assert_eq!(
            ggd.decode(54),
            Some("crash.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(67),
            Some("china.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(75),
            Some("splash.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(53),
            Some("crash.1.mute".parse::<Canon>().unwrap())
        );
    }

    #[test]
    fn addictive_drums2_native_layout() {
        let b = BuiltinMaps::new();
        let ad2 = b.get("addictive_drums2").unwrap();
        assert_eq!(
            ad2.decode(49),
            Some(Canon::Hat(HatOpen::Tight, HatZone::Tip))
        );
        assert_eq!(ad2.decode(36), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(
            ad2.encode(Canon::Hat(HatOpen::Open(1), HatZone::Plain)),
            Some(55)
        );
    }

    #[test]
    fn layered_override_shadows_base() {
        let json = r#"{"id":"ezdrummer","name":"Custom EZD","notes":[{"note":35,"canon":"kick.main","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        let ezd = p.get("ezdrummer").unwrap();
        assert_eq!(ezd.name, "Custom EZD");
        assert_eq!(ezd.encode(Canon::Kick(KickKind::Main)), Some(35));
    }

    #[test]
    fn layered_falls_through_to_base() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        assert_eq!(
            p.get("ggd_invasion").unwrap().decode(24),
            Some(Canon::Kick(KickKind::Main))
        );
        assert!(p.get("custom").is_some());
    }

    #[test]
    fn layered_ids_are_union() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = LayeredMaps::new(BuiltinMaps::new())
            .with_user_json(json)
            .unwrap();
        let n = BuiltinMaps::new().ids().len();
        assert_eq!(p.ids().len(), n + 1);
        assert!(p.get("custom").is_some());
    }
}
