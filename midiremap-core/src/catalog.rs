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
    variants: HashMap<String, Vec<String>>,
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
    /// engine id or belongs to two engines, and on a variant of an engine that is missing or
    /// is itself a variant.
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
        let mut variants: HashMap<String, Vec<String>> = HashMap::new();
        for (id, map) in &maps {
            let Some(of) = map.variant_of() else {
                continue;
            };
            let base = maps.get(of).ok_or_else(|| MapError::UnknownVariantBase {
                variant: id.clone(),
                of: of.to_owned(),
            })?;
            if base.variant_of().is_some() {
                return Err(MapError::VariantOfVariant(id.clone()));
            }
            variants.entry(of.to_owned()).or_default().push(id.clone());
        }
        Ok(Self {
            maps,
            aliases,
            variants,
        })
    }

    /// The engines that are other mappings of `base`, in id order.
    pub fn variants(&self, base: &EngineMap) -> impl Iterator<Item = &EngineMap> {
        self.variants
            .get(base.id())
            .into_iter()
            .flatten()
            .filter_map(|id| self.maps.get(id))
    }

    /// The engine `map` is another mapping of, when it is a variant.
    pub fn base_of(&self, map: &EngineMap) -> Option<&EngineMap> {
        map.variant_of().and_then(|of| self.maps.get(of))
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
    pub fn ids(&self) -> impl Iterator<Item = &str> {
        self.maps.keys().map(String::as_str)
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
    fn general_midi_decodes_36_as_the_main_kick() {
        let b = Catalog::builtin().unwrap();
        assert_eq!(
            b.get("general_midi").unwrap().decode(n(36)),
            Some(Canon::Kick(KickKind::Main))
        );
    }

    #[test]
    fn general_midi_decodes_42_as_the_closed_hat() {
        let b = Catalog::builtin().unwrap();
        assert_eq!(
            b.get("general_midi").unwrap().decode(n(42)),
            Some(Canon::Hat(HatOpen::Closed, HatZone::Plain))
        );
    }

    #[test]
    fn guitar_pro_decodes_38_as_the_first_snare() {
        let b = Catalog::builtin().unwrap();
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
    fn addictive_drums2_decodes_its_native_layout() {
        let b = Catalog::builtin().unwrap();
        let ad2 = b.get("addictive_drums2").unwrap();
        assert_eq!(
            ad2.decode(n(49)),
            Some(Canon::Hat(HatOpen::Tight, HatZone::Tip))
        );
        assert_eq!(ad2.decode(n(36)), Some(Canon::Kick(KickKind::Main)));
    }

    #[test]
    fn addictive_drums2_encodes_its_native_layout() {
        let b = Catalog::builtin().unwrap();
        let ad2 = b.get("addictive_drums2").unwrap();
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
    }

    #[test]
    fn layered_serves_the_added_engine() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().unwrap().with_user_json(json).unwrap();
        assert!(p.get("custom").is_some());
    }

    fn catalog_with_an_alias() -> Catalog {
        let json = r#"{"id":"custom","name":"Custom","aliases":["legacy_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        Catalog::builtin().unwrap().with_user_json(json).unwrap()
    }

    #[test]
    fn an_alias_resolves_to_its_engine() {
        let p = catalog_with_an_alias();
        assert_eq!(p.get("legacy_kit").map(EngineMap::id), Some("custom"));
    }

    #[test]
    fn canonical_id_resolves_an_alias() {
        let p = catalog_with_an_alias();
        assert_eq!(p.canonical_id("legacy_kit"), Some("custom"));
    }

    #[test]
    fn canonical_id_keeps_an_engine_id() {
        let p = catalog_with_an_alias();
        assert_eq!(p.canonical_id("custom"), Some("custom"));
    }

    #[test]
    fn canonical_id_of_an_unknown_name_is_none() {
        let p = catalog_with_an_alias();
        assert_eq!(p.canonical_id("nope"), None);
    }

    #[test]
    fn an_alias_is_not_listed_among_the_ids() {
        let p = catalog_with_an_alias();
        assert!(!p.ids().any(|id| id == "legacy_kit"));
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
        let n = Catalog::builtin().unwrap().ids().count();
        assert_eq!(p.ids().count(), n + 1);
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
        assert!(Catalog::builtin()
            .unwrap()
            .ids()
            .eq(stems.iter().map(String::as_str)));
    }

    #[test]
    fn ids_come_sorted() {
        let c = catalog_with_aaa_first();
        assert!(c.ids().is_sorted());
        assert_eq!(c.ids().next(), Some("aaa_first"));
    }

    #[test]
    fn engines_come_in_id_order() {
        let c = catalog_with_aaa_first();
        assert!(c.engines().map(EngineMap::id).eq(c.ids()));
    }

    fn catalog_with_aaa_first() -> Catalog {
        let json = r#"{"id":"aaa_first","name":"First","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        Catalog::builtin().unwrap().with_user_json(json).unwrap()
    }

    #[test]
    fn shared_is_parsed_once() {
        let shared = Catalog::shared().unwrap();
        assert!(std::ptr::eq(shared, Catalog::shared().unwrap()));
    }

    #[test]
    fn shared_holds_the_builtin_engines() {
        let shared = Catalog::shared().unwrap();
        assert!(shared.ids().eq(Catalog::builtin().unwrap().ids()));
    }

    fn kit(id: &str, variant_of: Option<&str>) -> EngineMap {
        let variant = variant_of
            .map(|of| format!(r#","variant":{{"of":"{of}","label":"Mapping '{id}'"}}"#))
            .unwrap_or_default();
        EngineMap::from_json(&format!(
            r#"{{"id":"{id}","name":"{id}"{variant},"notes":[{{"note":36,"canon":"kick.main","primary":true}}]}}"#
        ))
        .unwrap()
    }

    #[test]
    fn variants_of_a_base_are_listed_in_id_order() {
        let c = Catalog::from_maps([
            kit("base_gm", Some("base")),
            kit("base", None),
            kit("base_ggd", Some("base")),
        ])
        .unwrap();
        let base = c.get("base").unwrap();
        let ids: Vec<&str> = c.variants(base).map(EngineMap::id).collect();
        assert_eq!(ids, ["base_ggd", "base_gm"]);
        assert_eq!(
            c.get("base_gm").unwrap().variant_label(),
            Some("Mapping 'base_gm'")
        );
        assert_eq!(base.variant_label(), None);
    }

    #[test]
    fn base_of_a_variant_is_its_base() {
        let c = Catalog::from_maps([kit("base", None), kit("base_gm", Some("base"))]).unwrap();
        let variant = c.get("base_gm").unwrap();
        assert_eq!(c.base_of(variant).map(EngineMap::id), Some("base"));
        assert!(c.base_of(c.get("base").unwrap()).is_none());
        assert_eq!(c.variants(variant).count(), 0);
    }

    #[test]
    fn an_unknown_variant_base_is_an_error() {
        assert!(matches!(
            Catalog::from_maps([kit("base_gm", Some("base"))]),
            Err(MapError::UnknownVariantBase { variant, of }) if variant == "base_gm" && of == "base"
        ));
    }

    #[test]
    fn a_variant_of_a_variant_is_an_error() {
        assert!(matches!(
            Catalog::from_maps([
                kit("base", None),
                kit("base_gm", Some("base")),
                kit("base_gm_ggd", Some("base_gm")),
            ]),
            Err(MapError::VariantOfVariant(id)) if id == "base_gm_ggd"
        ));
    }

    #[test]
    fn every_builtin_variant_has_a_builtin_base() {
        let b = Catalog::builtin().unwrap();
        let nested: usize = b.engines().map(|m| b.variants(m).count()).sum();
        let variants = b.engines().filter(|m| b.base_of(m).is_some()).count();
        assert_eq!(nested, variants);
        assert!(variants > 0);
    }
}
