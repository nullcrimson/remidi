use std::{
    collections::{BTreeMap, HashMap},
    sync::LazyLock,
};

use crate::engine_map::{many_from_json, EngineMap, MapError};

const EMBEDDED: &str = include_str!(concat!(env!("OUT_DIR"), "/engines.json"));

static SHARED: LazyLock<Result<Catalog, MapError>> = LazyLock::new(Catalog::builtin);

/// Engine maps keyed by engine id, in id order; former ids resolve through each map's
/// aliases.
pub struct Catalog {
    maps: BTreeMap<String, EngineMap>,
    aliases: HashMap<String, String>,
}

impl Catalog {
    /// Parses every `engines/*.toml`, embedded at build time.
    pub fn builtin() -> Result<Self, MapError> {
        Self::from_maps(many_from_json(EMBEDDED)?)
    }

    /// The builtin catalog, parsed once per process.
    pub fn shared() -> Result<&'static Self, &'static MapError> {
        SHARED.as_ref()
    }

    /// Later maps with the same id replace earlier ones; fails on an alias that is also an
    /// engine id or belongs to two engines.
    pub fn from_maps(maps: impl IntoIterator<Item = EngineMap>) -> Result<Self, MapError> {
        let maps: BTreeMap<String, EngineMap> =
            maps.into_iter().map(|m| (m.id().to_owned(), m)).collect();
        let mut aliases = HashMap::new();
        for (id, map) in &maps {
            for alias in map.aliases() {
                if maps.contains_key(alias) || aliases.insert(alias.clone(), id.clone()).is_some() {
                    return Err(MapError::AliasCollision(alias.clone()));
                }
            }
        }
        Ok(Self { maps, aliases })
    }

    /// Adds a user map from JSON; it shadows a builtin with the same id.
    pub fn with_user_json(self, json: &str) -> Result<Self, MapError> {
        let map = EngineMap::from_json(json)?;
        Self::from_maps(self.maps.into_values().chain([map]))
    }

    /// An engine by id, or by one of its former ids.
    pub fn get(&self, id: &str) -> Option<&EngineMap> {
        self.maps
            .get(id)
            .or_else(|| self.aliases.get(id).and_then(|real| self.maps.get(real)))
    }

    /// The current id for an id or a former id.
    pub fn canonical_id(&self, id: &str) -> Option<&str> {
        self.get(id).map(EngineMap::id)
    }

    /// Every engine id, sorted.
    pub fn ids(&self) -> Vec<&str> {
        self.maps.keys().map(String::as_str).collect()
    }

    /// Every engine, sorted by id.
    pub fn engines(&self) -> impl Iterator<Item = &EngineMap> {
        self.maps.values()
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
        let b = Catalog::builtin().unwrap();
        for id in b.ids() {
            assert!(b.get(id).and_then(EngineMap::vendor).is_some(), "{id}");
        }
    }

    #[test]
    fn builtin_has_known_slugs() {
        let b = Catalog::builtin().unwrap();
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
        let b = Catalog::builtin().unwrap();
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
        let b = Catalog::builtin().unwrap();
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
        let b = Catalog::builtin().unwrap();
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
        let p = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        let ezd = p.get("ezdrummer").unwrap();
        assert_eq!(ezd.name(), "Custom EZD");
        assert_eq!(ezd.encode(Canon::Kick(KickKind::Main)), Some(n(35)));
    }

    #[test]
    fn layered_falls_through_to_base() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        assert_eq!(
            p.get("ggd_invasion").unwrap().decode(n(24)),
            Some(Canon::Kick(KickKind::Main))
        );
        assert!(p.get("custom").is_some());
    }

    #[test]
    fn an_alias_resolves_to_its_engine() {
        let json = r#"{"id":"custom","name":"Custom","aliases":["legacy_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        assert_eq!(p.get("legacy_kit").map(EngineMap::id), Some("custom"));
        assert_eq!(p.canonical_id("legacy_kit"), Some("custom"));
        assert_eq!(p.canonical_id("custom"), Some("custom"));
        assert_eq!(p.canonical_id("nope"), None);
        assert!(!p.ids().contains(&"legacy_kit"));
    }

    #[test]
    fn an_alias_may_not_shadow_an_engine_id() {
        let json = r#"{"id":"custom","name":"Custom","aliases":["ezdrummer"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        assert!(matches!(
            Catalog::builtin().unwrap().with_user_json(json),
            Err(MapError::AliasCollision(alias)) if alias == "ezdrummer"
        ));
    }

    #[test]
    fn every_embedded_engine_loads() {
        assert!(Catalog::builtin().is_ok());
    }

    #[test]
    fn layered_ids_are_union() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        let n = Catalog::builtin().unwrap().ids().len();
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
        assert_eq!(Catalog::builtin().unwrap().ids(), stems);
    }

    #[test]
    fn ids_and_engines_come_sorted_by_id() {
        let json = r#"{"id":"aaa_first","name":"First","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let c = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        let ids = c.ids();
        assert!(ids.is_sorted(), "{ids:?}");
        assert_eq!(ids[0], "aaa_first");
        assert_eq!(c.engines().map(EngineMap::id).collect::<Vec<_>>(), ids);
    }

    #[test]
    fn shared_is_parsed_once() {
        let shared = Catalog::shared().unwrap();
        assert!(std::ptr::eq(shared, Catalog::shared().unwrap()));
        assert_eq!(shared.ids().len(), Catalog::builtin().unwrap().ids().len());
    }
}
