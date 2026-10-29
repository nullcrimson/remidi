use std::{
    collections::{BTreeMap, HashMap},
    sync::LazyLock,
};

use crate::engine_map::{many_from_json, EngineMap, MapError, Variant};

const EMBEDDED: &str = include_str!(concat!(env!("OUT_DIR"), "/engines.json"));

static SHARED: LazyLock<Catalog> = LazyLock::new(Catalog::builtin);

/// Engine maps keyed by engine id, in id order; former ids resolve through each map's
/// aliases.
pub struct Catalog {
    maps: BTreeMap<String, EngineMap>,
    aliases: HashMap<String, String>,
}

impl Catalog {
    /// Every `engines/*.toml`, embedded at build time.
    pub fn builtin() -> Self {
        embedded().expect("the embedded engine maps load, as every_embedded_engine_loads proves")
    }

    /// The builtin catalog, parsed once per process.
    pub fn shared() -> &'static Self {
        &SHARED
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
        for (id, map) in &maps {
            let Some(of) = map.variant().map(Variant::of) else {
                continue;
            };
            let base = maps.get(of).ok_or_else(|| MapError::UnknownVariantBase {
                variant: id.clone(),
                of: of.to_owned(),
            })?;
            if base.variant().is_some() {
                return Err(MapError::VariantOfVariant(id.clone()));
            }
        }
        Ok(Self { maps, aliases })
    }

    /// The engines that are other mappings of `base`, each after its label, in id order.
    pub fn variants<'a>(
        &'a self,
        base: &'a EngineMap,
    ) -> impl Iterator<Item = (&'a str, &'a EngineMap)> {
        self.maps.values().filter_map(move |m| {
            m.variant()
                .filter(|v| v.of() == base.id())
                .map(|v| (v.label(), m))
        })
    }

    /// The engine `map` is another mapping of, when it is a variant.
    pub fn base_of(&self, map: &EngineMap) -> Option<&EngineMap> {
        map.variant().and_then(|v| self.maps.get(v.of()))
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

fn embedded() -> Result<Catalog, MapError> {
    Catalog::from_maps(many_from_json(EMBEDDED)?)
}

#[cfg(test)]
mod tests {
    use midiremap_testkit::engine_json;

    use super::*;
    use crate::{
        canon::{k, Canon},
        note::n,
    };

    #[test]
    fn every_builtin_names_its_vendor() {
        let b = Catalog::builtin();
        for id in b.ids() {
            assert!(b.get(id).and_then(EngineMap::vendor).is_some(), "{id}");
        }
    }

    fn decoded(engine: &str, note: u8) -> Option<Canon> {
        Catalog::builtin().get(engine).unwrap().decode(n(note))
    }

    #[test]
    fn ujam_plays_no_drum_on_its_mute_keys() {
        assert_eq!(decoded("ujam_heavy", 58), None);
        assert_eq!(decoded("ujam_heavy", 59), None);
    }

    #[test]
    fn ujam_plays_a_clap_on_39() {
        assert_eq!(decoded("ujam_heavy", 39), Some(k("perc.clap")));
    }

    #[test]
    fn ujam_plays_the_rimshot_on_40() {
        assert_eq!(decoded("ujam_heavy", 40), Some(k("snare1.rimshot")));
    }

    #[test]
    fn perfect_drums_plays_ghost_notes_on_39() {
        assert_eq!(decoded("perfectdrums", 39), Some(k("snare1.ghost")));
    }

    #[test]
    fn perfect_drums_plays_the_splash_tip_on_54() {
        assert_eq!(decoded("perfectdrums", 54), Some(k("splash.1.bowtip")));
    }

    #[test]
    fn perfect_drums_repeats_its_hats_on_62_64_67() {
        assert_eq!(decoded("perfectdrums", 62), Some(k("hat.pedal")));
        assert_eq!(decoded("perfectdrums", 64), Some(k("hat.closed.edge")));
        assert_eq!(decoded("perfectdrums", 67), Some(k("hat.open4")));
    }

    #[test]
    fn royotoms_plays_its_highest_drum_on_68_and_its_lowest_on_62() {
        assert_eq!(decoded("alanvista_royotoms", 68), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("alanvista_royotoms", 62), Some(k("tom.floor3.hit")));
    }

    #[test]
    fn bfd3_plays_its_ride_on_60() {
        assert_eq!(decoded("bfd3", 60), Some(k("ride.1")));
    }

    #[test]
    fn bfd3_plays_cymbal_1_as_crash_3_on_76() {
        assert_eq!(decoded("bfd3", 76), Some(k("crash.3.hit")));
    }

    #[test]
    fn bfd3_has_no_drum_on_its_unmapped_hat_keys() {
        assert_eq!(decoded("bfd3", 18), None);
        assert_eq!(decoded("bfd3", 20), None);
        assert_eq!(decoded("bfd3", 22), None);
    }

    #[test]
    fn bfd3_plays_the_open_hat_shank_on_39() {
        assert_eq!(decoded("bfd3", 39), Some(k("hat.open3.edge")));
    }

    #[test]
    fn guitar_pro_plays_a_side_stick_on_31_and_33() {
        assert_eq!(decoded("guitar_pro", 31), Some(k("snare1.sidestick")));
        assert_eq!(decoded("guitar_pro", 33), Some(k("snare1.sidestick")));
    }

    #[test]
    fn guitar_pro_plays_the_ride_edge_on_59() {
        assert_eq!(decoded("guitar_pro", 59), Some(k("ride.1.edge")));
    }

    #[test]
    fn guitar_pro_plays_the_kick_on_35() {
        assert_eq!(decoded("guitar_pro", 35), Some(k("kick.main")));
    }

    #[test]
    fn guitar_pro_plays_the_snare_on_34_and_40() {
        assert_eq!(decoded("guitar_pro", 34), Some(k("snare1.hit")));
        assert_eq!(decoded("guitar_pro", 40), Some(k("snare1.hit")));
    }

    #[test]
    fn guitar_pro_plays_the_ride_choke_on_29() {
        assert_eq!(decoded("guitar_pro", 29), Some(k("ride.1.mute")));
    }

    #[test]
    fn guitar_pro_plays_the_main_ride_on_126_and_127() {
        assert_eq!(decoded("guitar_pro", 126), Some(k("ride.1")));
        assert_eq!(decoded("guitar_pro", 127), Some(k("ride.1.bell")));
    }

    #[test]
    fn guitar_pro_plays_a_hand_clap_on_39() {
        assert_eq!(decoded("guitar_pro", 39), Some(k("perc.clap")));
    }

    #[test]
    fn guitar_pro_plays_its_tambourines_as_a_tambourine() {
        for key in [54, 111, 112, 113] {
            assert_eq!(
                decoded("guitar_pro", key),
                Some(k("perc.tambourine")),
                "{key}"
            );
        }
    }

    #[test]
    fn guitar_pro_plays_its_shakers_maracas_and_cabasa_as_a_shaker() {
        for key in [69, 70, 82, 117, 118, 119, 120, 122] {
            assert_eq!(decoded("guitar_pro", key), Some(k("perc.shaker")), "{key}");
        }
    }

    #[test]
    fn addictive_drums2_plays_a_flexi_slot_on_101() {
        assert_eq!(decoded("addictive_drums2", 101), Some(k("perc.misc")));
    }

    #[test]
    fn abbey_road_plays_its_high_crash_as_crash_1_on_49() {
        assert_eq!(decoded("ni_abbeyroad_modern", 49), Some(k("crash.1.hit")));
    }

    #[test]
    fn general_midi_plays_a_hand_clap_on_39() {
        assert_eq!(decoded("general_midi", 39), Some(k("perc.clap")));
    }

    #[test]
    fn general_midi_plays_the_electric_snare_on_40() {
        assert_eq!(decoded("general_midi", 40), Some(k("snare2.hit")));
    }

    #[test]
    fn modern_massive_plays_floor_tom_1_on_its_second_key_35() {
        assert_eq!(decoded("ggd_modernmassive", 35), Some(k("tom.floor1.hit")));
    }

    #[test]
    fn modern_massive_plays_the_hat_ching_on_44() {
        assert_eq!(decoded("ggd_modernmassive", 44), Some(k("hat.pedalsplash")));
    }

    #[test]
    fn modern_massive_ggd_counts_its_openings_like_the_base_map() {
        assert_eq!(decoded("ggd_modernmassive_ggd", 52), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_modernmassive_ggd", 54), Some(k("hat.open4")));
    }

    #[test]
    fn modern_massive_gm_plays_the_hat_ching_on_56() {
        assert_eq!(
            decoded("ggd_modernmassive_gm", 56),
            Some(k("hat.pedalsplash"))
        );
    }

    #[test]
    fn modern_massive_gm_plays_floor_tom_1_on_its_second_key_48() {
        assert_eq!(
            decoded("ggd_modernmassive_gm", 48),
            Some(k("tom.floor1.hit"))
        );
    }

    #[test]
    fn dry_and_funky_reads_the_second_keys_of_its_invasion_preset() {
        assert_eq!(decoded("ggd_dryfunky", 36), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_dryfunky", 55), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_dryfunky", 54), Some(k("ride.1.edge")));
    }

    #[test]
    fn invasion_ggd_plays_floor_tom_1_on_45() {
        assert_eq!(decoded("ggd_invasion_ggd", 45), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_invasion_ggd", 46), Some(k("tom.floor3.hit")));
    }

    #[test]
    fn invasion_ggd_plays_the_main_left_crash_as_crash_1_on_58() {
        assert_eq!(decoded("ggd_invasion_ggd", 58), Some(k("crash.1.hit")));
    }

    #[test]
    fn invasion_ggd_plays_the_right_china_choke_on_72() {
        assert_eq!(decoded("ggd_invasion_ggd", 72), Some(k("china.2.mute")));
    }

    fn plays_what_the_default_plays(variant: &str, base: &str, keys: &[(u8, u8)]) {
        for &(key, base_key) in keys {
            assert_eq!(
                decoded(variant, key),
                decoded(base, base_key),
                "{variant} {key} against {base} {base_key}"
            );
            assert!(decoded(variant, key).is_some(), "{variant} {key}");
        }
    }

    #[test]
    fn invasion_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_invasion_gm",
            "ggd_invasion",
            &[
                (38, 26),
                (50, 33),
                (43, 36),
                (48, 37),
                (41, 38),
                (49, 52),
                (57, 54),
                (52, 65),
                (53, 61),
                (51, 62),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (55, 73),
            ],
        );
    }

    #[test]
    fn invasion_gm_plays_the_kick_on_36() {
        assert_eq!(decoded("ggd_invasion_gm", 36), Some(k("kick.main")));
    }

    #[test]
    fn invasion_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_invasion_halpern",
            "ggd_invasion",
            &[
                (26, 26),
                (27, 27),
                (28, 28),
                (29, 29),
                (30, 30),
                (33, 33),
                (37, 36),
                (35, 37),
                (39, 38),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (76, 65),
                (77, 68),
                (74, 61),
                (72, 62),
                (73, 63),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (83, 73),
                (82, 74),
            ],
        );
    }

    #[test]
    fn invasion_halpern_plays_the_kick_on_24() {
        assert_eq!(decoded("ggd_invasion_halpern", 24), Some(k("kick.main")));
    }

    #[test]
    fn brutal_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_brutal_gm",
            "ggd_brutal",
            &[
                (36, 24),
                (38, 26),
                (50, 33),
                (43, 34),
                (48, 35),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (53, 61),
                (51, 62),
                (55, 73),
                (49, 52),
                (52, 65),
                (57, 75),
            ],
        );
    }

    #[test]
    fn brutal_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_brutal_halpern",
            "ggd_brutal",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (33, 33),
                (37, 34),
                (35, 35),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (74, 61),
                (72, 62),
                (83, 73),
                (82, 74),
                (62, 52),
                (64, 53),
                (76, 65),
                (77, 66),
                (67, 75),
            ],
        );
    }

    #[test]
    fn brutal_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_brutal_ggd",
            "ggd_brutal",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (42, 33),
                (45, 34),
                (43, 35),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (74, 61),
                (73, 62),
                (77, 73),
                (83, 74),
                (58, 52),
                (59, 53),
                (71, 65),
                (72, 66),
                (61, 75),
            ],
        );
    }

    #[test]
    fn modern_fusion_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_modernfusion_gm",
            "ggd_modernfusion",
            &[
                (36, 24),
                (38, 26),
                (37, 30),
                (50, 33),
                (48, 34),
                (43, 35),
                (53, 61),
                (51, 62),
                (49, 52),
                (66, 53),
                (57, 54),
                (95, 55),
                (41, 41),
                (42, 42),
                (10, 43),
                (54, 44),
                (58, 45),
                (46, 46),
                (56, 47),
                (44, 48),
                (55, 73),
                (64, 74),
                (52, 65),
                (74, 66),
                (69, 78),
            ],
        );
    }

    #[test]
    fn modern_fusion_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_modernfusion_halpern",
            "ggd_modernfusion",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (33, 33),
                (37, 34),
                (35, 35),
                (74, 61),
                (72, 62),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (83, 73),
                (82, 74),
                (76, 65),
                (77, 66),
            ],
        );
    }

    #[test]
    fn modern_fusion_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_modernfusion_ggd",
            "ggd_modernfusion",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (42, 33),
                (45, 34),
                (43, 35),
                (74, 61),
                (73, 62),
                (58, 52),
                (59, 53),
                (61, 54),
                (62, 55),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (77, 73),
                (83, 74),
                (71, 65),
                (72, 66),
            ],
        );
    }

    #[test]
    fn pop_punk_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_poppunk_gm",
            "ggd_poppunk",
            &[
                (36, 24),
                (38, 26),
                (50, 33),
                (48, 35),
                (53, 61),
                (51, 62),
                (55, 73),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (52, 65),
                (49, 52),
                (57, 58),
            ],
        );
    }

    #[test]
    fn pop_punk_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_poppunk_halpern",
            "ggd_poppunk",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (33, 33),
                (35, 35),
                (74, 61),
                (72, 62),
                (83, 73),
                (82, 74),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (76, 65),
                (77, 66),
                (62, 52),
                (64, 53),
                (67, 58),
                (69, 59),
            ],
        );
    }

    #[test]
    fn pop_punk_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_poppunk_ggd",
            "ggd_poppunk",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (42, 33),
                (43, 35),
                (74, 61),
                (73, 62),
                (77, 73),
                (83, 74),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (71, 65),
                (72, 66),
                (58, 52),
                (59, 53),
                (61, 58),
                (62, 59),
            ],
        );
    }

    #[test]
    fn architects_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_architects_gm",
            "ggd_architects",
            &[
                (36, 24),
                (38, 26),
                (50, 35),
                (43, 36),
                (48, 37),
                (41, 37),
                (53, 61),
                (51, 62),
                (49, 52),
                (57, 54),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (52, 67),
                (55, 73),
            ],
        );
    }

    #[test]
    fn architects_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_architects_halpern",
            "ggd_architects",
            &[
                (24, 24),
                (28, 26),
                (30, 30),
                (33, 35),
                (37, 36),
                (35, 37),
                (74, 61),
                (72, 62),
                (73, 63),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (76, 67),
                (77, 68),
                (83, 73),
                (82, 74),
            ],
        );
    }

    #[test]
    fn architects_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_architects_ggd",
            "ggd_architects",
            &[
                (36, 24),
                (39, 26),
                (40, 30),
                (42, 35),
                (45, 36),
                (43, 37),
                (74, 61),
                (73, 62),
                (76, 63),
                (58, 52),
                (59, 53),
                (61, 54),
                (62, 55),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (71, 67),
                (72, 68),
                (77, 73),
                (83, 74),
            ],
        );
    }

    #[test]
    fn aggressive_rock_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_aggressiverock_gm",
            "ggd_aggressiverock",
            &[
                (36, 24),
                (38, 26),
                (37, 30),
                (50, 33),
                (48, 34),
                (41, 41),
                (42, 42),
                (10, 43),
                (54, 44),
                (58, 45),
                (46, 46),
                (56, 47),
                (44, 48),
                (53, 61),
                (51, 62),
                (49, 52),
                (66, 53),
                (57, 54),
                (95, 55),
                (55, 73),
                (64, 74),
                (52, 65),
                (74, 66),
            ],
        );
    }

    #[test]
    fn aggressive_rock_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_aggressiverock_halpern",
            "ggd_aggressiverock",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (33, 33),
                (37, 34),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (74, 61),
                (72, 62),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (83, 73),
                (82, 74),
                (76, 65),
                (77, 66),
            ],
        );
    }

    #[test]
    fn aggressive_rock_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_aggressiverock_ggd",
            "ggd_aggressiverock",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (42, 33),
                (45, 34),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (74, 61),
                (73, 62),
                (58, 52),
                (59, 53),
                (61, 54),
                (62, 55),
                (77, 73),
                (83, 74),
                (71, 65),
                (72, 66),
            ],
        );
    }

    #[test]
    fn p5_halpern_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_p5_halpern_gm",
            "ggd_p5_halpern",
            &[
                (36, 24),
                (38, 26),
                (50, 33),
                (43, 34),
                (48, 35),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (53, 61),
                (51, 62),
                (52, 65),
                (49, 52),
                (57, 54),
                (55, 73),
            ],
        );
    }

    #[test]
    fn p5_halpern_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_p5_halpern_halpern",
            "ggd_p5_halpern",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (29, 29),
                (33, 33),
                (37, 34),
                (35, 35),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (83, 73),
                (82, 74),
                (74, 61),
                (72, 62),
                (76, 65),
                (77, 66),
            ],
        );
    }

    #[test]
    fn p5_halpern_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_p5_halpern_ggd",
            "ggd_p5_halpern",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (41, 29),
                (42, 33),
                (45, 34),
                (43, 35),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (58, 52),
                (59, 53),
                (61, 54),
                (62, 55),
                (77, 73),
                (83, 74),
                (74, 61),
                (73, 62),
                (71, 65),
                (72, 66),
            ],
        );
    }

    #[test]
    fn metal_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_metal_gm",
            "ggd_metal",
            &[
                (38, 26),
                (50, 33),
                (43, 34),
                (48, 35),
                (41, 36),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (53, 61),
                (51, 62),
                (49, 52),
                (57, 54),
                (52, 65),
                (55, 73),
            ],
        );
        assert_eq!(decoded("ggd_metal_gm", 36), Some(k("kick.main")));
    }

    #[test]
    fn metal_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_metal_halpern",
            "ggd_metal",
            &[
                (26, 26),
                (30, 30),
                (33, 33),
                (37, 34),
                (35, 35),
                (39, 36),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (44, 47),
                (43, 48),
                (74, 61),
                (72, 62),
                (62, 52),
                (64, 53),
                (67, 54),
                (69, 55),
                (76, 65),
                (77, 66),
                (83, 73),
                (82, 74),
            ],
        );
        assert_eq!(decoded("ggd_metal_halpern", 24), Some(k("kick.main")));
    }

    #[test]
    fn metal_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_metal_ggd",
            "ggd_metal",
            &[
                (37, 26),
                (40, 30),
                (42, 33),
                (45, 34),
                (43, 35),
                (46, 36),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (74, 61),
                (73, 62),
                (58, 52),
                (59, 53),
                (61, 54),
                (62, 55),
                (71, 65),
                (72, 66),
                (77, 73),
                (83, 74),
            ],
        );
        assert_eq!(decoded("ggd_metal_ggd", 36), Some(k("kick.main")));
    }

    #[test]
    fn ml_drums_plays_the_ride_edge_on_60_and_the_bell_on_72() {
        for engine in ["ml_drums", "ml_drums_free"] {
            assert_eq!(decoded(engine, 60), Some(k("ride.1.edge")), "{engine}");
        }
        assert_eq!(decoded("ml_drums", 72), Some(k("bell.1.hit")));
        assert_eq!(decoded("ml_drums_free", 72), None);
    }

    #[test]
    fn ml_drums_plays_rack_tom_3_on_45() {
        for engine in ["ml_drums", "ml_drums_free"] {
            assert_eq!(decoded(engine, 45), Some(k("tom.rack3.hit")), "{engine}");
        }
        assert_eq!(decoded("ml_drums_free", 47), None);
    }

    #[test]
    fn ml_drums_opens_its_hats_from_semi_open_1_to_open() {
        for engine in ["ml_drums", "ml_drums_free"] {
            assert_eq!(decoded(engine, 68), Some(k("hat.open1")), "{engine}");
            assert_eq!(decoded(engine, 69), Some(k("hat.open2")), "{engine}");
            assert_eq!(decoded(engine, 70), Some(k("hat.open3")), "{engine}");
            assert_eq!(decoded(engine, 46), Some(k("hat.open4")), "{engine}");
            assert_eq!(decoded(engine, 71), Some(k("hat.open4")), "{engine}");
            assert_eq!(decoded(engine, 67), Some(k("hat.closed.edge")), "{engine}");
        }
    }

    #[test]
    fn ml_drums_free_plays_china_r_on_57_and_65() {
        assert_eq!(decoded("ml_drums_free", 57), Some(k("china.2.hit")));
        assert_eq!(decoded("ml_drums_free", 65), Some(k("china.2.mute")));
    }

    #[test]
    fn ssd5_plays_its_extra_cymbals_as_crash_3_and_4() {
        assert_eq!(decoded("ssd5", 28), Some(k("crash.3.hit")));
        assert_eq!(decoded("ssd5", 27), Some(k("crash.3.mute")));
        assert_eq!(decoded("ssd5", 95), Some(k("crash.3.bowtip")));
        assert_eq!(decoded("ssd5", 29), Some(k("crash.4.hit")));
        assert_eq!(decoded("ssd5", 30), Some(k("crash.4.mute")));
        assert_eq!(decoded("ssd5", 94), Some(k("crash.4.bowtip")));
    }

    #[test]
    fn ssd5_plays_its_bells_on_83_and_84() {
        assert_eq!(decoded("ssd5", 83), Some(k("bell.1.hit")));
        assert_eq!(decoded("ssd5", 84), Some(k("bell.2.hit")));
    }

    #[test]
    fn ssd5_plays_the_splash_tip_on_90() {
        assert_eq!(decoded("ssd5", 90), Some(k("splash.1.bowtip")));
    }

    #[test]
    fn ssd5_controls_its_hat_shank_on_26_and_tip_on_46() {
        assert_eq!(decoded("ssd5", 26), Some(k("hat.cc.edge")));
        assert_eq!(decoded("ssd5", 46), Some(k("hat.cc.tip")));
    }

    #[test]
    fn ssd5_plays_its_percussion_on_74_to_82() {
        for (key, drum) in [
            (74, "perc.cowbell"),
            (75, "perc.cowbell"),
            (76, "perc.clap"),
            (77, "perc.tambourine"),
            (78, "perc.tambourine"),
            (79, "perc.tambourine"),
            (80, "perc.shaker"),
            (81, "perc.shaker"),
            (82, "perc.shaker"),
        ] {
            assert_eq!(decoded("ssd5", key), Some(k(drum)), "{key}");
        }
    }

    #[test]
    fn guitar_pro_plays_a_vibraslap_on_58() {
        assert_eq!(decoded("guitar_pro", 58), Some(k("perc.vibraslap")));
    }

    #[test]
    fn room_sound_ballou_is_named_for_volume_2() {
        let b = Catalog::builtin();
        let ballou = b.get("roomsound_ballou").unwrap();
        assert!(ballou.name().ends_with("Vol. 2"), "{}", ballou.name());
        assert!(
            ballou.display_name().ends_with("Vol. 2"),
            "{}",
            ballou.display_name()
        );
    }

    #[test]
    fn nu_metal_reads_the_second_keys_of_its_invasion_preset() {
        assert_eq!(decoded("ggd_numetal", 27), Some(k("snare2.hit")));
        assert_eq!(decoded("ggd_numetal", 56), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_numetal", 57), Some(k("crash.1.mute")));
    }

    #[test]
    fn nu_metal_gm_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_numetal_gm",
            "ggd_numetal",
            &[
                (36, 24),
                (38, 26),
                (50, 33),
                (43, 34),
                (48, 35),
                (42, 41),
                (54, 43),
                (46, 46),
                (58, 47),
                (44, 48),
                (53, 61),
                (51, 62),
                (49, 52),
                (57, 58),
                (52, 65),
                (55, 75),
            ],
        );
    }

    #[test]
    fn nu_metal_halpern_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_numetal_halpern",
            "ggd_numetal",
            &[
                (24, 24),
                (26, 26),
                (30, 30),
                (33, 33),
                (37, 34),
                (35, 35),
                (45, 41),
                (58, 42),
                (47, 43),
                (48, 44),
                (53, 45),
                (54, 46),
                (56, 47),
                (43, 48),
                (74, 61),
                (72, 62),
                (62, 52),
                (64, 53),
                (67, 58),
                (69, 59),
                (76, 65),
                (77, 66),
                (83, 75),
                (82, 76),
            ],
        );
    }

    #[test]
    fn nu_metal_ggd_plays_each_drum_the_default_map_plays() {
        plays_what_the_default_plays(
            "ggd_numetal_ggd",
            "ggd_numetal",
            &[
                (36, 24),
                (37, 26),
                (40, 30),
                (42, 33),
                (45, 34),
                (43, 35),
                (48, 41),
                (54, 42),
                (49, 43),
                (52, 45),
                (53, 46),
                (57, 47),
                (55, 48),
                (74, 61),
                (73, 62),
                (58, 52),
                (59, 53),
                (61, 58),
                (62, 59),
                (71, 65),
                (72, 66),
                (77, 75),
                (83, 76),
            ],
        );
    }

    #[test]
    fn mangini_plays_its_second_hi_hat_as_a_second_hat() {
        for (key, drum) in [
            (108, "aux2.closed.tip"),
            (109, "aux2.closed.edge"),
            (110, "aux2.open1"),
            (111, "aux2.open2"),
            (112, "aux2.open3"),
            (34, "aux2.cc"),
        ] {
            assert_eq!(decoded("mixwave_mangini", key), Some(k(drum)), "{key}");
        }
    }

    const LATIN_GM: [(u8, &str); 20] = [
        (60, "perc.bongo.high"),
        (61, "perc.bongo.low"),
        (62, "perc.conga.high.mute"),
        (63, "perc.conga.high"),
        (64, "perc.conga.low"),
        (65, "perc.timbale.high"),
        (66, "perc.timbale.low"),
        (67, "perc.agogo.high"),
        (68, "perc.agogo.low"),
        (71, "perc.whistle.short"),
        (72, "perc.whistle.long"),
        (73, "perc.guiro.short"),
        (74, "perc.guiro.long"),
        (75, "perc.claves"),
        (76, "perc.woodblock.high"),
        (77, "perc.woodblock.low"),
        (78, "perc.cuica.mute"),
        (79, "perc.cuica"),
        (80, "perc.triangle.mute"),
        (81, "perc.triangle"),
    ];

    fn assert_plays_latin_gm(engine: &str) {
        let catalog = Catalog::builtin();
        let map = catalog.get(engine).unwrap();
        for (note, key) in LATIN_GM {
            assert_eq!(decoded(engine, note), Some(k(key)), "{engine} {note}");
            assert_eq!(map.encode(k(key)), Some(n(note)), "{engine} {key}");
        }
    }

    #[test]
    fn general_midi_plays_its_latin_percussion_on_60_to_81() {
        assert_plays_latin_gm("general_midi");
    }

    #[test]
    fn guitar_pro_plays_its_latin_percussion_where_general_midi_does() {
        assert_plays_latin_gm("guitar_pro");
    }

    #[test]
    fn guitar_pro_folds_its_extra_bongo_and_conga_strokes_into_the_drum() {
        assert_eq!(decoded("guitar_pro", 104), Some(k("perc.bongo.high")));
        assert_eq!(decoded("guitar_pro", 105), Some(k("perc.bongo.high")));
        assert_eq!(decoded("guitar_pro", 106), Some(k("perc.bongo.low")));
        assert_eq!(decoded("guitar_pro", 107), Some(k("perc.bongo.low")));
        assert_eq!(decoded("guitar_pro", 108), Some(k("perc.conga.low")));
        assert_eq!(decoded("guitar_pro", 109), Some(k("perc.conga.low")));
        assert_eq!(decoded("guitar_pro", 110), Some(k("perc.conga.high")));
    }

    #[test]
    fn guitar_pro_leaves_its_orchestral_and_bell_percussion_unrecognized() {
        assert_eq!(decoded("guitar_pro", 83), None);
        assert_eq!(decoded("guitar_pro", 84), None);
        assert_eq!(decoded("guitar_pro", 85), None);
        assert_eq!(decoded("guitar_pro", 86), None);
        assert_eq!(decoded("guitar_pro", 87), None);
        assert_eq!(decoded("guitar_pro", 114), None);
        assert_eq!(decoded("guitar_pro", 115), None);
        assert_eq!(decoded("guitar_pro", 116), None);
        assert_eq!(decoded("guitar_pro", 123), None);
        assert_eq!(decoded("guitar_pro", 124), None);
        assert_eq!(decoded("guitar_pro", 125), None);
    }

    #[test]
    fn goran_grooves_handy_plays_its_triangles_on_80_and_81() {
        assert_eq!(
            decoded("goran_grooves_handy", 80),
            Some(k("perc.triangle.mute"))
        );
        assert_eq!(decoded("goran_grooves_handy", 81), Some(k("perc.triangle")));
    }

    #[test]
    fn duplantier_plays_its_timbales_on_12_to_15() {
        assert_eq!(
            decoded("mixwave_duplantier", 12),
            Some(k("perc.timbale.high"))
        );
        assert_eq!(
            decoded("mixwave_duplantier", 13),
            Some(k("perc.timbale.high"))
        );
        assert_eq!(
            decoded("mixwave_duplantier", 14),
            Some(k("perc.timbale.low"))
        );
        assert_eq!(
            decoded("mixwave_duplantier", 15),
            Some(k("perc.timbale.low"))
        );
        let catalog = Catalog::builtin();
        let duplantier = catalog.get("mixwave_duplantier").unwrap();
        assert_eq!(duplantier.encode(k("perc.timbale.high")), Some(n(12)));
        assert_eq!(duplantier.encode(k("perc.timbale.low")), Some(n(14)));
    }

    #[test]
    fn architects_has_no_drum_on_28() {
        assert_eq!(decoded("ggd_architects", 28), None);
    }

    #[test]
    fn ezdrummer_plays_a_snare_ruff_on_39() {
        assert_eq!(decoded("ezdrummer", 39), Some(k("snare1.ruff")));
    }

    #[test]
    fn ezdrummer_plays_a_snare_flam_on_69() {
        assert_eq!(decoded("ezdrummer", 69), Some(k("snare1.flam")));
    }

    #[test]
    fn superior_drummer3_plays_a_snare_ruff_on_39() {
        assert_eq!(decoded("superior_drummer3", 39), Some(k("snare1.ruff")));
    }

    #[test]
    fn general_midi_decodes_36_as_the_main_kick() {
        assert_eq!(decoded("general_midi", 36), Some(k("kick.main")));
    }

    #[test]
    fn general_midi_decodes_42_as_the_closed_hat() {
        assert_eq!(decoded("general_midi", 42), Some(k("hat.closed")));
    }

    #[test]
    fn guitar_pro_decodes_38_as_the_first_snare() {
        assert_eq!(decoded("guitar_pro", 38), Some(k("snare1.hit")));
    }

    #[test]
    fn ggd_cymbal_layout_is_fixed() {
        assert_eq!(decoded("ggd_invasion", 54), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_invasion", 67), Some(k("china.2.hit")));
        assert_eq!(decoded("ggd_invasion", 75), Some(k("splash.2.hit")));
        assert_eq!(decoded("ggd_invasion", 53), Some(k("crash.1.mute")));
    }

    #[test]
    fn addictive_drums2_decodes_its_native_layout() {
        assert_eq!(decoded("addictive_drums2", 49), Some(k("hat.tight.tip")));
        assert_eq!(decoded("addictive_drums2", 36), Some(k("kick.main")));
    }

    #[test]
    fn addictive_drums2_encodes_its_native_layout() {
        let b = Catalog::builtin();
        let ad2 = b.get("addictive_drums2").unwrap();
        assert_eq!(ad2.encode(k("hat.open1")), Some(n(55)));
    }

    #[test]
    fn layered_override_shadows_base() {
        let json = r#"{"id":"ezdrummer","name":"Custom EZD","notes":[{"note":35,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        let ezd = p.get("ezdrummer").unwrap();
        assert_eq!(ezd.name(), "Custom EZD");
        assert_eq!(ezd.encode(k("kick.main")), Some(n(35)));
    }

    #[test]
    fn layered_falls_through_to_base() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        assert_eq!(
            p.get("ggd_invasion").unwrap().decode(n(24)),
            Some(k("kick.main"))
        );
    }

    #[test]
    fn layered_serves_the_added_engine() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        assert!(p.get("custom").is_some());
    }

    fn catalog_with_an_alias() -> Catalog {
        let json = r#"{"id":"custom","name":"Custom","aliases":["legacy_kit"],"notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        Catalog::builtin().with_user_json(json).unwrap()
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
            Catalog::builtin().with_user_json(json),
            Err(MapError::AliasCollision(alias)) if alias == "ezdrummer"
        ));
    }

    #[test]
    fn every_embedded_engine_loads() {
        assert!(embedded().is_ok());
    }

    #[test]
    fn layered_ids_are_union() {
        let json = r#"{"id":"custom","name":"Custom","notes":[{"note":60,"canon":"kick.main","primary":true}]}"#;
        let p = Catalog::builtin().with_user_json(json).unwrap();
        let n = Catalog::builtin().ids().count();
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
        Catalog::builtin().with_user_json(json).unwrap()
    }

    #[test]
    fn shared_is_parsed_once() {
        let shared = Catalog::shared();
        assert!(std::ptr::eq(shared, Catalog::shared()));
    }

    #[test]
    fn shared_holds_the_builtin_engines() {
        let shared = Catalog::shared();
        assert!(shared.ids().eq(Catalog::builtin().ids()));
    }

    fn kit(id: &str, variant_of: Option<&str>) -> EngineMap {
        let mut json = engine_json(id, &[(36, "kick.main")]);
        if let Some(of) = variant_of {
            json["name"] = format!("{id} (Mapping '{id}')").into();
            json["variant"] = serde_json::json!({ "of": of });
        }
        EngineMap::from_json(&json.to_string()).unwrap()
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
        let ids: Vec<&str> = c.variants(base).map(|(_, m)| m.id()).collect();
        assert_eq!(ids, ["base_ggd", "base_gm"]);
    }

    #[test]
    fn variants_of_a_base_come_with_their_labels() {
        let c = Catalog::from_maps([kit("base", None), kit("base_gm", Some("base"))]).unwrap();
        let labels: Vec<&str> = c
            .variants(c.get("base").unwrap())
            .map(|(label, _)| label)
            .collect();
        assert_eq!(labels, ["Mapping 'base_gm'"]);
    }

    #[test]
    fn base_of_a_variant_is_its_base() {
        let c = Catalog::from_maps([kit("base", None), kit("base_gm", Some("base"))]).unwrap();
        let variant = c.get("base_gm").unwrap();
        assert_eq!(c.base_of(variant).map(EngineMap::id), Some("base"));
    }

    #[test]
    fn a_base_has_no_base() {
        let c = Catalog::from_maps([kit("base", None), kit("base_gm", Some("base"))]).unwrap();
        assert!(c.base_of(c.get("base").unwrap()).is_none());
    }

    #[test]
    fn a_variant_has_no_variants() {
        let c = Catalog::from_maps([kit("base", None), kit("base_gm", Some("base"))]).unwrap();
        assert_eq!(c.variants(c.get("base_gm").unwrap()).count(), 0);
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
}
