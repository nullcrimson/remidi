use std::{collections::HashMap, sync::LazyLock};

use crate::engine_map::{from_json, many_from_json, EngineMap, MapError};

const EMBEDDED: &str = include_str!(concat!(env!("OUT_DIR"), "/engines.json"));

static SHARED: LazyLock<Catalog> = LazyLock::new(Catalog::builtin);

/// Engine maps keyed by engine id.
pub struct Catalog {
    maps: HashMap<String, EngineMap>,
}

impl Catalog {
    /// Parses every `engines/*.toml`, embedded at build time.
    pub fn builtin() -> Self {
        Self::from_maps(many_from_json(EMBEDDED).expect("embedded presets must be valid"))
    }

    /// The builtin catalog, parsed once per process.
    pub fn shared() -> &'static Self {
        &SHARED
    }

    /// Later maps with the same id replace earlier ones.
    pub fn from_maps(maps: impl IntoIterator<Item = EngineMap>) -> Self {
        Self {
            maps: maps.into_iter().map(|m| (m.id.clone(), m)).collect(),
        }
    }

    /// Adds a user map from JSON; it shadows a builtin with the same id.
    pub fn with_user_json(mut self, json: &str) -> Result<Self, MapError> {
        let map = from_json(json)?;
        self.maps.insert(map.id.clone(), map);
        Ok(self)
    }

    pub fn get(&self, id: &str) -> Option<&EngineMap> {
        self.maps.get(id)
    }

    pub fn ids(&self) -> Vec<&str> {
        self.maps.keys().map(String::as_str).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        canon::{idx, Canon, HatOpen, HatZone, KickKind, SnareArtic},
        note::n,
    };

    #[test]
    fn every_builtin_names_its_vendor() {
        let b = Catalog::builtin();
        for id in b.ids() {
            assert!(b.get(id).and_then(EngineMap::vendor).is_some(), "{id}");
        }
    }

    #[test]
    fn builtin_has_known_slugs() {
        let b = Catalog::builtin();
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
        let b = Catalog::builtin();
        assert_eq!(
            b.get("general_midi").unwrap().decode(n(36)),
            Some(Canon::Kick(KickKind::Main))
        );
        assert_eq!(
            b.get("general_midi").unwrap().decode(n(42)),
            Some(Canon::Hat(HatOpen::Closed, HatZone::Plain))
        );
        assert_eq!(
            b.get("guitar_pro").unwrap().decode(n(38)),
            Some(Canon::Snare(idx(1), SnareArtic::Hit))
        );
    }

    #[test]
    fn ggd_cymbal_layout_is_fixed() {
        let b = Catalog::builtin();
        let ggd = b.get("ggd_invasion").unwrap();
        assert_eq!(
            ggd.decode(n(54)),
            Some("crash.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(n(67)),
            Some("china.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(n(75)),
            Some("splash.2.hit".parse::<Canon>().unwrap())
        );
        assert_eq!(
            ggd.decode(n(53)),
            Some("crash.1.mute".parse::<Canon>().unwrap())
        );
    }

    #[test]
    fn addictive_drums2_native_layout() {
        let b = Catalog::builtin();
        let ad2 = b.get("addictive_drums2").unwrap();
        assert_eq!(
            ad2.decode(n(49)),
            Some(Canon::Hat(HatOpen::Tight, HatZone::Tip))
        );
        assert_eq!(ad2.decode(n(36)), Some(Canon::Kick(KickKind::Main)));
        assert_eq!(
            ad2.encode(Canon::Hat(HatOpen::Open(idx(1)), HatZone::Plain)),
            Some(n(55))
        );
    }

    #[test]
    fn layered_override_shadows_base() {
        let json = r#"{"id":"ezdrummer","name":"Custom EZD","notes":[{"note":35,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        let ezd = p.get("ezdrummer").unwrap();
        assert_eq!(ezd.name, "Custom EZD");
        assert_eq!(ezd.encode(Canon::Kick(KickKind::Main)), Some(n(35)));
    }

    #[test]
    fn layered_falls_through_to_base() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        assert_eq!(
            p.get("ggd_invasion").unwrap().decode(n(24)),
            Some(Canon::Kick(KickKind::Main))
        );
        assert!(p.get("custom").is_some());
    }

    #[test]
    fn layered_ids_are_union() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        let n = Catalog::builtin().ids().len();
        assert_eq!(p.ids().len(), n + 1);
        assert!(p.get("custom").is_some());
    }

    #[test]
    fn every_engine_file_is_builtin() {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../engines");
        let mut stems: Vec<String> = std::fs::read_dir(dir)
            .unwrap()
            .filter_map(|e| {
                let path = e.unwrap().path();
                (path.extension()? == "toml")
                    .then(|| path.file_stem()?.to_str().map(str::to_owned))?
            })
            .collect();
        stems.sort_unstable();
        let b = Catalog::builtin();
        let mut ids = b.ids();
        ids.sort_unstable();
        assert_eq!(ids, stems);
    }

    #[test]
    fn shared_is_parsed_once() {
        assert!(std::ptr::eq(Catalog::shared(), Catalog::shared()));
        assert_eq!(
            Catalog::shared().ids().len(),
            Catalog::builtin().ids().len()
        );
    }
}
