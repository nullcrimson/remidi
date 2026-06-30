use std::collections::HashMap;

use crate::map::{self, EngineMap, MapError};

pub struct Registry {
    maps: HashMap<String, EngineMap>,
}

impl Registry {
    pub fn get(&self, id: &str) -> Option<&EngineMap> {
        self.maps.get(id)
    }

    pub fn add_or_override(&mut self, m: EngineMap) {
        self.maps.insert(m.id.clone(), m);
    }

    pub fn load_user_json(&mut self, json: &str) -> Result<(), MapError> {
        let m = map::from_json(json)?;
        self.add_or_override(m);
        Ok(())
    }

    pub fn ids(&self) -> Vec<&str> {
        self.maps.keys().map(|s| s.as_str()).collect()
    }
}

pub fn builtin() -> Registry {
    let mut maps = HashMap::new();
    for src in [
        include_str!("../../engines/ggd_invasion.toml"),
        include_str!("../../engines/ezdrummer.toml"),
    ] {
        let m = map::from_toml(src).expect("embedded preset must be valid");
        maps.insert(m.id.clone(), m);
    }
    Registry { maps }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_has_both_engines() {
        let r = builtin();
        assert!(r.get("ggd_invasion").is_some());
        assert!(r.get("ezdrummer").is_some());
    }

    #[test]
    fn user_json_adds_engine() {
        let mut r = builtin();
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"KickMain","primary":true}]}"#;
        r.load_user_json(json).unwrap();
        assert_eq!(
            r.get("custom")
                .unwrap()
                .from_canon
                .get(&crate::canon::Canon::KickMain),
            Some(&60)
        );
    }

    #[test]
    fn user_json_overrides_existing() {
        let mut r = builtin();
        let json = r#"{"id":"ezdrummer","name":"Custom EZD","notes":[{"note":35,"canon":"KickMain","primary":true}]}"#;
        r.load_user_json(json).unwrap();
        assert_eq!(r.get("ezdrummer").unwrap().name, "Custom EZD");
        assert_eq!(
            r.get("ezdrummer")
                .unwrap()
                .from_canon
                .get(&crate::canon::Canon::KickMain),
            Some(&35)
        );
    }
}
