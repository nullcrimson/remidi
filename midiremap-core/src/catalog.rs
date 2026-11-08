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
        open_levels::OpenLevels,
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
    fn a_mapping_variant_opens_its_hat_like_its_base_kit() {
        let catalog = Catalog::builtin();
        let differ: Vec<&str> = catalog
            .engines()
            .filter_map(|v| Some((v, catalog.get(v.variant()?.of())?)))
            .filter(|(v, base)| {
                let base_main = base.open_levels().map(OpenLevels::main);
                let plays = |l| {
                    v.drums()
                        .iter()
                        .any(|d| d.entry.canon().opening().map(|(level, _)| level) == Some(l))
                };
                base_main.is_some_and(plays) && v.open_levels().map(OpenLevels::main) != base_main
            })
            .map(|(v, _)| v.id())
            .collect();
        assert_eq!(differ, Vec::<&str>::new());
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
    fn bfd3_plays_cymbal_1_as_crash_2_on_76_since_its_default_kit_has_no_crash_2() {
        assert_eq!(decoded("bfd3", 76), Some(k("crash.2.hit")));
        assert_eq!(decoded("bfd3", 80), Some(k("crash.2.mute")));
    }

    #[test]
    fn bfd3_plays_crash_2_as_crash_3_on_74() {
        assert_eq!(decoded("bfd3", 74), Some(k("crash.3.hit")));
        assert_eq!(decoded("bfd3", 78), Some(k("crash.3.mute")));
    }

    #[test]
    fn bfd3_plays_its_variable_hat_tip_shank_and_bell_on_18_20_22() {
        assert_eq!(decoded("bfd3", 18), Some(k("hat.cc.tip")));
        assert_eq!(decoded("bfd3", 20), Some(k("hat.cc.edge")));
        assert_eq!(decoded("bfd3", 22), Some(k("hat.cc.bell")));
    }

    #[test]
    fn bfd3_plays_the_half_edge_snare_as_the_off_center_snare_on_28() {
        assert_eq!(decoded("bfd3", 28), Some(k("snare1.side")));
    }

    #[test]
    fn bfd3_plays_the_bows_of_crash_1_and_crash_2_on_52_and_53() {
        assert_eq!(decoded("bfd3", 52), Some(k("crash.1.bow")));
        assert_eq!(decoded("bfd3", 53), Some(k("crash.3.bow")));
    }

    #[test]
    fn bfd3_plays_the_open_hat_shank_on_39() {
        assert_eq!(decoded("bfd3", 39), Some(k("hat.open3.edge")));
    }

    #[test]
    fn krimh_plays_its_plain_closed_hat_on_42() {
        assert_eq!(decoded("bogren_krimh", 42), Some(k("hat.closed")));
    }

    #[test]
    fn krimh_plays_crash_1_right_as_crash_2_on_54_and_55() {
        assert_eq!(decoded("bogren_krimh", 54), Some(k("crash.2.hit")));
        assert_eq!(decoded("bogren_krimh", 55), Some(k("crash.2.mute")));
    }

    #[test]
    fn krimh_plays_crash_2_left_as_crash_3_on_56_and_57() {
        assert_eq!(decoded("bogren_krimh", 56), Some(k("crash.3.hit")));
        assert_eq!(decoded("bogren_krimh", 57), Some(k("crash.3.mute")));
    }

    #[test]
    fn krimh_numbers_its_floor_toms_by_pitch_left_floor_tom_first() {
        assert_eq!(decoded("bogren_krimh", 37), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("bogren_krimh", 35), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("bogren_krimh", 36), Some(k("tom.floor3.hit")));
    }

    #[test]
    fn sleep_token_ii_plays_the_left_kick_on_35_and_the_right_on_36() {
        assert_eq!(decoded("mixwave_sleeptoken2", 35), Some(k("kick.left")));
        assert_eq!(decoded("mixwave_sleeptoken2", 36), Some(k("kick.main")));
    }

    #[test]
    fn sleep_token_ii_plays_its_snare_roll_as_a_ruff_on_25() {
        assert_eq!(decoded("mixwave_sleeptoken2", 25), Some(k("snare1.ruff")));
    }

    #[test]
    fn sleep_token_ii_plays_the_stack_tip_and_edge_on_62_and_63() {
        assert_eq!(
            decoded("mixwave_sleeptoken2", 62),
            Some(k("stack.1.bowtip"))
        );
        assert_eq!(decoded("mixwave_sleeptoken2", 63), Some(k("stack.1.hit")));
    }

    #[test]
    fn sleep_token_ii_plays_the_mini_stack_tip_and_edge_on_108_and_109() {
        assert_eq!(
            decoded("mixwave_sleeptoken2", 108),
            Some(k("stack.2.bowtip"))
        );
        assert_eq!(decoded("mixwave_sleeptoken2", 109), Some(k("stack.2.hit")));
    }

    #[test]
    fn sleep_token_ii_plays_the_china_on_52_and_its_manual_choke_on_64() {
        assert_eq!(decoded("mixwave_sleeptoken2", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("mixwave_sleeptoken2", 64), Some(k("china.1.mute")));
    }

    #[test]
    fn sleep_token_ii_plays_crash_4_on_95_and_its_manual_choke_on_107() {
        assert_eq!(decoded("mixwave_sleeptoken2", 95), Some(k("crash.4.hit")));
        assert_eq!(decoded("mixwave_sleeptoken2", 107), Some(k("crash.4.mute")));
    }

    #[test]
    fn sleep_token_ii_plays_the_ride_bell_tip_on_60_and_its_manual_choke_on_71() {
        assert_eq!(
            decoded("mixwave_sleeptoken2", 60),
            Some(k("ride.1.belltip"))
        );
        assert_eq!(decoded("mixwave_sleeptoken2", 71), Some(k("ride.1.mute")));
    }

    #[test]
    fn royster_numbers_its_rack_toms_by_size_piccolo_and_concert_first() {
        assert_eq!(decoded("mixwave_royster", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("mixwave_royster", 48), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("mixwave_royster", 47), Some(k("tom.rack3.hit")));
        assert_eq!(decoded("mixwave_royster", 45), Some(k("tom.rack4.hit")));
    }

    #[test]
    fn royster_keeps_each_rack_tom_rim_with_its_tom_on_23_and_21() {
        assert_eq!(decoded("mixwave_royster", 23), Some(k("tom.rack3.rim")));
        assert_eq!(decoded("mixwave_royster", 21), Some(k("tom.rack4.rim")));
    }

    #[test]
    fn odeholm_plays_tom_3_as_floor_tom_1_and_tom_4_as_floor_tom_2_on_43_and_41() {
        assert_eq!(decoded("odeholm", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("odeholm", 41), Some(k("tom.floor2.hit")));
    }

    #[test]
    fn odeholm_alt_plays_tom_3_as_floor_tom_1_and_tom_4_as_floor_tom_2_on_36_and_37() {
        assert_eq!(decoded("odeholm_alt", 36), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("odeholm_alt", 37), Some(k("tom.floor2.hit")));
    }

    #[test]
    fn gillespie_plays_its_side_snare_side_stick_and_flam_on_13_and_15() {
        assert_eq!(
            decoded("mixwave_gillespie", 13),
            Some(k("snare2.sidestick"))
        );
        assert_eq!(decoded("mixwave_gillespie", 15), Some(k("snare2.flam")));
    }

    #[test]
    fn ultimate_heavy_plays_its_closed_hat_edge_on_22_and_nothing_on_46() {
        assert_eq!(
            decoded("mdltone_ultimateheavy", 22),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("mdltone_ultimateheavy", 46), None);
    }

    #[test]
    fn ultimate_heavy_plays_crash_l_r_and_ll_as_crash_1_2_and_3() {
        assert_eq!(decoded("mdltone_ultimateheavy", 49), Some(k("crash.1.hit")));
        assert_eq!(
            decoded("mdltone_ultimateheavy", 50),
            Some(k("crash.1.mute"))
        );
        assert_eq!(decoded("mdltone_ultimateheavy", 57), Some(k("crash.2.hit")));
        assert_eq!(
            decoded("mdltone_ultimateheavy", 58),
            Some(k("crash.2.mute"))
        );
        assert_eq!(decoded("mdltone_ultimateheavy", 66), Some(k("crash.3.hit")));
        assert_eq!(
            decoded("mdltone_ultimateheavy", 67),
            Some(k("crash.3.mute"))
        );
    }

    #[test]
    fn ultimate_heavy_plays_its_right_ride_as_ride_1_on_51_and_53() {
        assert_eq!(decoded("mdltone_ultimateheavy", 51), Some(k("ride.1")));
        assert_eq!(decoded("mdltone_ultimateheavy", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("mdltone_ultimateheavy", 64), Some(k("ride.2")));
        assert_eq!(decoded("mdltone_ultimateheavy", 65), Some(k("ride.2.bell")));
    }

    #[test]
    fn ultimate_heavy_plays_its_right_china_as_china_1_on_52_and_54() {
        assert_eq!(decoded("mdltone_ultimateheavy", 52), Some(k("china.1.hit")));
        assert_eq!(
            decoded("mdltone_ultimateheavy", 54),
            Some(k("china.1.mute"))
        );
        assert_eq!(decoded("mdltone_ultimateheavy", 71), Some(k("china.2.hit")));
        assert_eq!(
            decoded("mdltone_ultimateheavy", 72),
            Some(k("china.2.mute"))
        );
    }

    #[test]
    fn studio_drummer_plays_the_halfway_snare_as_the_off_center_snare_on_40_84_86() {
        assert_eq!(decoded("ni_studiodrummer", 40), Some(k("snare1.side")));
        assert_eq!(decoded("ni_studiodrummer", 84), Some(k("snare1.side")));
        assert_eq!(decoded("ni_studiodrummer", 86), Some(k("snare1.side")));
    }

    #[test]
    fn spectre_master_kit_plays_its_ride_on_the_tip_bow_its_general_midi_preset_uses() {
        let spectre = "spectre_ele_masterkit";
        assert_eq!(decoded(spectre, 69), Some(k("ride.1")));
        assert_eq!(decoded(spectre, 70), Some(k("ride.1.belltip")));
        assert_eq!(decoded(spectre, 72), Some(k("ride.1.bell")));
    }

    #[test]
    fn spectre_master_kit_has_no_ride_rows_its_mapping_page_hides() {
        let spectre = "spectre_ele_masterkit";
        assert_eq!(decoded(spectre, 68), None);
        assert_eq!(decoded(spectre, 71), None);
        assert_eq!(decoded(spectre, 73), None);
        assert_eq!(decoded(spectre, 74), None);
    }

    #[test]
    fn addictive_drums_2_plays_toms_3_and_4_as_its_high_and_low_floor_toms() {
        let ad2 = "addictive_drums2";
        assert_eq!(decoded(ad2, 71), Some(k("tom.rack1.hit")));
        assert_eq!(decoded(ad2, 69), Some(k("tom.rack2.hit")));
        assert_eq!(decoded(ad2, 67), Some(k("tom.floor1.hit")));
        assert_eq!(decoded(ad2, 68), Some(k("tom.floor1.rimshot")));
        assert_eq!(decoded(ad2, 65), Some(k("tom.floor2.hit")));
        assert_eq!(decoded(ad2, 66), Some(k("tom.floor2.rimshot")));
    }

    #[test]
    fn addictive_drums_2_reads_its_cc_hi_hat_notes() {
        let ad2 = "addictive_drums2";
        assert_eq!(decoded(ad2, 7), Some(k("hat.cc.edge")));
        assert_eq!(decoded(ad2, 8), Some(k("hat.cc.tip")));
        assert_eq!(decoded(ad2, 9), Some(k("hat.cc.bell")));
    }

    #[test]
    fn addictive_drums_2_reads_its_cc_position_notes_as_the_drum_they_play() {
        let ad2 = "addictive_drums2";
        assert_eq!(decoded(ad2, 3), Some(k("ride.2")));
        assert_eq!(decoded(ad2, 4), Some(k("ride.1")));
        assert_eq!(decoded(ad2, 6), Some(k("snare1.hit")));
    }

    #[test]
    fn addictive_drums_2_reads_every_flexi_hit_as_a_kit_dependent_percussion() {
        let ad2 = "addictive_drums2";
        for note in [47, 73, 74, 76, 96, 97, 98, 99, 101, 102, 103, 104] {
            assert_eq!(decoded(ad2, note), Some(k("perc.misc")), "{note}");
        }
    }

    #[test]
    fn abbey_road_60s_early_kit_plays_one_rack_and_one_floor_tom() {
        let early = "ni_abbeyroad_60s_early";
        assert_eq!(decoded(early, 45), Some(k("tom.rack1.hit")));
        assert_eq!(decoded(early, 93), Some(k("tom.rack1.hit")));
        assert_eq!(decoded(early, 41), Some(k("tom.floor1.hit")));
        assert_eq!(decoded(early, 96), Some(k("tom.floor1.hit")));
    }

    #[test]
    fn abbey_road_60s_late_kit_plays_two_rack_toms_and_one_floor_tom() {
        let late = "ni_abbeyroad_60s_late";
        assert_eq!(decoded(late, 47), Some(k("tom.rack1.hit")));
        assert_eq!(decoded(late, 45), Some(k("tom.rack2.hit")));
        assert_eq!(decoded(late, 96), Some(k("tom.rack2.hit")));
        assert_eq!(decoded(late, 93), Some(k("tom.floor1.hit")));
        assert_eq!(decoded(late, 41), Some(k("tom.floor1.hit")));
    }

    #[test]
    fn abbey_road_60s_plays_its_felt_beater_as_the_second_kick_sound_on_60() {
        for kit in ["ni_abbeyroad_60s_early", "ni_abbeyroad_60s_late"] {
            assert_eq!(decoded(kit, 60), Some(k("kick.alt")));
            assert_eq!(decoded(kit, 36), Some(k("kick.main")));
        }
    }

    #[test]
    fn abbey_road_60s_plays_the_halfway_snare_as_the_off_center_snare_on_40() {
        for kit in ["ni_abbeyroad_60s_early", "ni_abbeyroad_60s_late"] {
            assert_eq!(decoded(kit, 40), Some(k("snare1.side")));
        }
    }

    #[test]
    fn abbey_road_60s_opens_the_hat_quarter_half_three_quarters_loose_full() {
        for kit in ["ni_abbeyroad_60s_early", "ni_abbeyroad_60s_late"] {
            assert_eq!(decoded(kit, 76), Some(k("hat.open1")));
            assert_eq!(decoded(kit, 77), Some(k("hat.open2")));
            assert_eq!(decoded(kit, 78), Some(k("hat.open3")));
            assert_eq!(decoded(kit, 79), Some(k("hat.loose")));
            assert_eq!(decoded(kit, 80), Some(k("hat.open4")));
            assert_eq!(decoded(kit, 46), Some(k("hat.cc")));
        }
    }

    #[test]
    fn ugritone_plays_the_10_inch_fx_cymbal_as_splash_2_on_56() {
        assert_eq!(decoded("ugritone", 56), Some(k("splash.2.hit")));
    }

    #[test]
    fn ugritone_plays_the_19_inch_fx_stack_on_59() {
        assert_eq!(decoded("ugritone", 59), Some(k("stack.1.hit")));
    }

    #[test]
    fn ugritone_plays_the_semi_open_hat_on_46_and_wide_open_on_32() {
        assert_eq!(decoded("ugritone", 46), Some(k("hat.open1")));
        assert_eq!(decoded("ugritone", 32), Some(k("hat.open2")));
    }

    #[test]
    fn ugritone_plays_the_ride_top_as_the_main_ride_on_51() {
        assert_eq!(decoded("ugritone", 51), Some(k("ride.1")));
    }

    #[test]
    fn counterkit_plays_a_rimshot_on_40() {
        assert_eq!(
            decoded("soundblind_counterkit", 40),
            Some(k("snare1.rimshot"))
        );
    }

    #[test]
    fn counterkit_plays_its_open_close_hats_as_the_cc_hat_side_on_64_and_top_on_65() {
        assert_eq!(decoded("soundblind_counterkit", 64), Some(k("hat.cc.edge")));
        assert_eq!(decoded("soundblind_counterkit", 65), Some(k("hat.cc.tip")));
    }

    #[test]
    fn mjolnir_plays_the_ride_bell_on_51_and_tip_on_53() {
        assert_eq!(decoded("solemntones_mjolnir", 51), Some(k("ride.1.bell")));
        assert_eq!(decoded("solemntones_mjolnir", 53), Some(k("ride.1")));
    }

    #[test]
    fn mjolnir_plays_tom_3_as_its_only_floor_tom_on_43() {
        assert_eq!(
            decoded("solemntones_mjolnir", 43),
            Some(k("tom.floor1.hit"))
        );
    }

    #[test]
    fn mjolnir_plays_the_hat_from_closed_to_open_on_42_41_45_46() {
        assert_eq!(decoded("solemntones_mjolnir", 42), Some(k("hat.closed")));
        assert_eq!(decoded("solemntones_mjolnir", 41), Some(k("hat.loose")));
        assert_eq!(decoded("solemntones_mjolnir", 45), Some(k("hat.open1")));
        assert_eq!(decoded("solemntones_mjolnir", 46), Some(k("hat.open2")));
        assert_eq!(decoded("solemntones_mjolnir", 44), Some(k("hat.pedal")));
    }

    #[test]
    fn mjolnir_plays_the_snare_ghost_on_39() {
        assert_eq!(decoded("solemntones_mjolnir", 39), Some(k("snare1.ghost")));
    }

    #[test]
    fn mjolnir_chokes_each_cymbal_one_key_above_its_hit() {
        assert_eq!(decoded("solemntones_mjolnir", 50), Some(k("crash.1.mute")));
        assert_eq!(decoded("solemntones_mjolnir", 58), Some(k("crash.2.mute")));
        assert_eq!(decoded("solemntones_mjolnir", 56), Some(k("splash.1.mute")));
        assert_eq!(decoded("solemntones_mjolnir", 54), Some(k("china.1.mute")));
    }

    #[test]
    fn sterling_plays_the_snare_roll_on_24_and_flam_on_39() {
        assert_eq!(decoded("mixwave_sterling", 24), Some(k("snare1.ruff")));
        assert_eq!(decoded("mixwave_sterling", 39), Some(k("snare1.flam")));
    }

    #[test]
    fn sterling_plays_the_tom_rim_flams_as_the_tom_rims() {
        assert_eq!(decoded("mixwave_sterling", 22), Some(k("tom.rack1.rim")));
        assert_eq!(decoded("mixwave_sterling", 18), Some(k("tom.floor1.rim")));
    }

    #[test]
    fn sterling_plays_one_rack_tom_and_one_floor_tom() {
        assert_eq!(decoded("mixwave_sterling", 47), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("mixwave_sterling", 43), Some(k("tom.floor1.hit")));
    }

    #[test]
    fn sterling_plays_the_open_pedal_hat_on_81() {
        assert_eq!(decoded("mixwave_sterling", 81), Some(k("hat.pedalsplash")));
    }

    #[test]
    fn fang_plays_timbale_1_as_the_high_timbale_on_5_to_8() {
        for note in 5..=8 {
            assert_eq!(decoded("mixwave_fang", note), Some(k("perc.timbale.high")));
        }
    }

    #[test]
    fn fang_plays_timbale_2_as_the_low_timbale_on_9_to_12() {
        for note in 9..=12 {
            assert_eq!(decoded("mixwave_fang", note), Some(k("perc.timbale.low")));
        }
    }

    #[test]
    fn fang_plays_its_only_rack_tom_as_rack_tom_1() {
        assert_eq!(decoded("mixwave_fang", 47), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("mixwave_fang", 45), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("mixwave_fang", 21), Some(k("tom.rack1.rim")));
    }

    #[test]
    fn fang_plays_the_stack_tip_on_56_and_edge_on_55() {
        assert_eq!(decoded("mixwave_fang", 56), Some(k("stack.1.bowtip")));
        assert_eq!(decoded("mixwave_fang", 55), Some(k("stack.1.hit")));
    }

    #[test]
    fn fang_plays_claves_on_112() {
        assert_eq!(decoded("mixwave_fang", 112), Some(k("perc.claves")));
    }

    #[test]
    fn studio_drummer_plays_its_ride_tip_as_the_main_ride_on_51() {
        assert_eq!(decoded("ni_studiodrummer", 51), Some(k("ride.1")));
    }

    #[test]
    fn general_midi_plays_the_gm2_sticks_on_31_and_shaker_on_82() {
        assert_eq!(decoded("general_midi", 31), Some(k("perc.sticks")));
        assert_eq!(decoded("general_midi", 82), Some(k("perc.shaker")));
    }

    #[test]
    fn general_midi_writes_its_shaker_on_the_gm1_maracas_70() {
        let catalog = Catalog::builtin();
        let gm = catalog.get("general_midi").unwrap();
        assert_eq!(gm.encode(k("perc.shaker")), Some(n(70)));
    }

    #[test]
    fn guitar_pro_reads_every_general_midi_note_it_shares_as_the_same_drum() {
        let differ: Vec<u8> = (35..=81)
            .filter(|&note| ![40, 59].contains(&note))
            .filter(|&note| decoded("guitar_pro", note) != decoded("general_midi", note))
            .collect();
        assert_eq!(differ, Vec::<u8>::new());
    }

    #[test]
    fn guitar_pro_plays_its_half_open_hat_on_92_below_the_open_hat() {
        assert_eq!(decoded("guitar_pro", 92), Some(k("hat.loose")));
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
        assert_eq!(decoded("guitar_pro", 54), Some(k("perc.tambourine")));
        assert_eq!(decoded("guitar_pro", 111), Some(k("perc.tambourine")));
        assert_eq!(decoded("guitar_pro", 112), Some(k("perc.tambourine")));
        assert_eq!(decoded("guitar_pro", 113), Some(k("perc.tambourine")));
    }

    #[test]
    fn guitar_pro_plays_its_shakers_maracas_and_cabasa_as_a_shaker() {
        assert_eq!(decoded("guitar_pro", 69), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 70), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 82), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 117), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 118), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 119), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 120), Some(k("perc.shaker")));
        assert_eq!(decoded("guitar_pro", 122), Some(k("perc.shaker")));
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

    #[test]
    fn invasion_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_invasion_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 48), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 41), Some(k("tom.floor3.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 57), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_invasion_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_invasion_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_invasion_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_invasion_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_invasion_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_invasion_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_invasion_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_invasion_gm", 55), Some(k("splash.1.hit")));
    }

    #[test]
    fn invasion_gm_plays_the_kick_on_36() {
        assert_eq!(decoded("ggd_invasion_gm", 36), Some(k("kick.main")));
    }

    #[test]
    fn invasion_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_invasion_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_invasion_halpern", 27), Some(k("snare1.flam")));
        assert_eq!(decoded("ggd_invasion_halpern", 28), Some(k("snare1.ruff")));
        assert_eq!(decoded("ggd_invasion_halpern", 29), Some(k("snare1.off")));
        assert_eq!(
            decoded("ggd_invasion_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 33),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 37),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 35),
            Some(k("tom.floor2.hit"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 39),
            Some(k("tom.floor3.hit"))
        );
        assert_eq!(decoded("ggd_invasion_halpern", 62), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_invasion_halpern", 64), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_invasion_halpern", 67), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_invasion_halpern", 69), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_invasion_halpern", 76), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_invasion_halpern", 77), Some(k("china.2.mute")));
        assert_eq!(decoded("ggd_invasion_halpern", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_invasion_halpern", 72), Some(k("ride.1")));
        assert_eq!(decoded("ggd_invasion_halpern", 73), Some(k("ride.1.edge")));
        assert_eq!(
            decoded("ggd_invasion_halpern", 45),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_invasion_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_invasion_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_invasion_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_invasion_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_invasion_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_invasion_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_invasion_halpern", 83), Some(k("splash.1.hit")));
        assert_eq!(
            decoded("ggd_invasion_halpern", 82),
            Some(k("splash.1.mute"))
        );
    }

    #[test]
    fn invasion_halpern_plays_the_kick_on_24() {
        assert_eq!(decoded("ggd_invasion_halpern", 24), Some(k("kick.main")));
    }

    #[test]
    fn brutal_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_brutal_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_brutal_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 43), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 48), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_brutal_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_brutal_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_brutal_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_brutal_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_brutal_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_brutal_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_brutal_gm", 55), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 49), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_brutal_gm", 57), Some(k("stack.1.hit")));
    }

    #[test]
    fn brutal_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_brutal_halpern", 24), Some(k("kick.main")));
        assert_eq!(decoded("ggd_brutal_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_brutal_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_brutal_halpern", 33), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 37), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 35), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 45), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_brutal_halpern", 58), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_brutal_halpern", 47), Some(k("hat.closed.tip")));
        assert_eq!(
            decoded("ggd_brutal_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_brutal_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_brutal_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_brutal_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_brutal_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_brutal_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_brutal_halpern", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_brutal_halpern", 72), Some(k("ride.1")));
        assert_eq!(decoded("ggd_brutal_halpern", 83), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 82), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_brutal_halpern", 62), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 64), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_brutal_halpern", 76), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_brutal_halpern", 77), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_brutal_halpern", 67), Some(k("stack.1.hit")));
    }

    #[test]
    fn brutal_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_brutal_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_brutal_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 40), Some(k("snare1.sidestick")));
        assert_eq!(decoded("ggd_brutal_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 45), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_brutal_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_brutal_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_brutal_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_brutal_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_brutal_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_brutal_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_brutal_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_brutal_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_brutal_ggd", 77), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 83), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_brutal_ggd", 58), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 59), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_brutal_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_brutal_ggd", 72), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_brutal_ggd", 61), Some(k("stack.1.hit")));
    }

    #[test]
    fn modern_fusion_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_modernfusion_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_modernfusion_gm", 38), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_modernfusion_gm", 37),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_modernfusion_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_modernfusion_gm", 48), Some(k("tom.rack2.hit")));
        assert_eq!(
            decoded("ggd_modernfusion_gm", 43),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(decoded("ggd_modernfusion_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_modernfusion_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_modernfusion_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_modernfusion_gm", 66), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_modernfusion_gm", 57), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_modernfusion_gm", 95), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_modernfusion_gm", 41), Some(k("hat.tight.tip")));
        assert_eq!(
            decoded("ggd_modernfusion_gm", 42),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_gm", 10),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_gm", 54),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_modernfusion_gm", 58), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_modernfusion_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_modernfusion_gm", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_modernfusion_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_modernfusion_gm", 55), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_modernfusion_gm", 64), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_modernfusion_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_modernfusion_gm", 74), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_modernfusion_gm", 69), Some(k("stack.1.hit")));
    }

    #[test]
    fn modern_fusion_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 24),
            Some(k("kick.main"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 26),
            Some(k("snare1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 33),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 37),
            Some(k("tom.rack2.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 35),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 74),
            Some(k("ride.1.bell"))
        );
        assert_eq!(decoded("ggd_modernfusion_halpern", 72), Some(k("ride.1")));
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 62),
            Some(k("crash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 64),
            Some(k("crash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 67),
            Some(k("crash.2.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 69),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 45),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 53),
            Some(k("hat.open1"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 54),
            Some(k("hat.open2"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 56),
            Some(k("hat.open3"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 44),
            Some(k("hat.open3"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 43),
            Some(k("hat.pedal"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 83),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 82),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 76),
            Some(k("china.1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_halpern", 77),
            Some(k("china.1.mute"))
        );
    }

    #[test]
    fn modern_fusion_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_modernfusion_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 40),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 42),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 45),
            Some(k("tom.rack2.hit"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 43),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(decoded("ggd_modernfusion_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 58), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 59), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 61), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 62), Some(k("crash.2.mute")));
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 48),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 54),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 49),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(decoded("ggd_modernfusion_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(
            decoded("ggd_modernfusion_ggd", 83),
            Some(k("splash.1.mute"))
        );
        assert_eq!(decoded("ggd_modernfusion_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_modernfusion_ggd", 72), Some(k("china.1.mute")));
    }

    #[test]
    fn pop_punk_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_poppunk_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_poppunk_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 48), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_poppunk_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_poppunk_gm", 55), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_poppunk_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_poppunk_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_poppunk_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_poppunk_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_poppunk_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_gm", 57), Some(k("crash.2.hit")));
    }

    #[test]
    fn pop_punk_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_poppunk_halpern", 24), Some(k("kick.main")));
        assert_eq!(decoded("ggd_poppunk_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_poppunk_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_poppunk_halpern", 33), Some(k("tom.rack1.hit")));
        assert_eq!(
            decoded("ggd_poppunk_halpern", 35),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(decoded("ggd_poppunk_halpern", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_poppunk_halpern", 72), Some(k("ride.1")));
        assert_eq!(decoded("ggd_poppunk_halpern", 83), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_halpern", 82), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_poppunk_halpern", 45), Some(k("hat.tight.tip")));
        assert_eq!(
            decoded("ggd_poppunk_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_poppunk_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_poppunk_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_poppunk_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_poppunk_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_poppunk_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_poppunk_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_poppunk_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_poppunk_halpern", 76), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_poppunk_halpern", 77), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_poppunk_halpern", 62), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_halpern", 64), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_poppunk_halpern", 67), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_poppunk_halpern", 69), Some(k("crash.2.mute")));
    }

    #[test]
    fn pop_punk_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_poppunk_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_poppunk_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 40), Some(k("snare1.sidestick")));
        assert_eq!(decoded("ggd_poppunk_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_poppunk_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_poppunk_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 83), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_poppunk_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_poppunk_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_poppunk_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_poppunk_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_poppunk_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_poppunk_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_poppunk_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_poppunk_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 72), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_poppunk_ggd", 58), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 59), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_poppunk_ggd", 61), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_poppunk_ggd", 62), Some(k("crash.2.mute")));
    }

    #[test]
    fn architects_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_architects_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_architects_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_architects_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_architects_gm", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_architects_gm", 48), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_architects_gm", 41), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_architects_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_architects_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_architects_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_architects_gm", 57), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_architects_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_architects_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_architects_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_architects_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_architects_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_architects_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_architects_gm", 55), Some(k("splash.1.hit")));
    }

    #[test]
    fn architects_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_architects_halpern", 24), Some(k("kick.main")));
        assert_eq!(decoded("ggd_architects_halpern", 28), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_architects_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 33),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 37),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 35),
            Some(k("tom.floor2.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 74),
            Some(k("ride.1.bell"))
        );
        assert_eq!(decoded("ggd_architects_halpern", 72), Some(k("ride.1")));
        assert_eq!(
            decoded("ggd_architects_halpern", 73),
            Some(k("ride.1.edge"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 62),
            Some(k("crash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 64),
            Some(k("crash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 67),
            Some(k("crash.2.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 69),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 45),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_architects_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_architects_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_architects_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_architects_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_architects_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(
            decoded("ggd_architects_halpern", 76),
            Some(k("china.1.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 77),
            Some(k("china.1.mute"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 83),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_architects_halpern", 82),
            Some(k("splash.1.mute"))
        );
    }

    #[test]
    fn architects_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_architects_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_architects_ggd", 39), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_architects_ggd", 40),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_architects_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 45), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 43), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_architects_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_architects_ggd", 76), Some(k("ride.1.edge")));
        assert_eq!(decoded("ggd_architects_ggd", 58), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 59), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_architects_ggd", 61), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 62), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_architects_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_architects_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_architects_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_architects_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_architects_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_architects_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_architects_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_architects_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 72), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_architects_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_architects_ggd", 83), Some(k("splash.1.mute")));
    }

    #[test]
    fn aggressive_rock_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_aggressiverock_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 38), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 37),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 50),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 48),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 41),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 42),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 10),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 54),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_aggressiverock_gm", 58), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_aggressiverock_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 66),
            Some(k("crash.1.mute"))
        );
        assert_eq!(decoded("ggd_aggressiverock_gm", 57), Some(k("crash.2.hit")));
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 95),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 55),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 64),
            Some(k("splash.1.mute"))
        );
        assert_eq!(decoded("ggd_aggressiverock_gm", 52), Some(k("china.1.hit")));
        assert_eq!(
            decoded("ggd_aggressiverock_gm", 74),
            Some(k("china.1.mute"))
        );
    }

    #[test]
    fn aggressive_rock_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 24),
            Some(k("kick.main"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 26),
            Some(k("snare1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 33),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 37),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 45),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 53),
            Some(k("hat.open1"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 54),
            Some(k("hat.open2"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 56),
            Some(k("hat.open3"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 44),
            Some(k("hat.open3"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 43),
            Some(k("hat.pedal"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 74),
            Some(k("ride.1.bell"))
        );
        assert_eq!(decoded("ggd_aggressiverock_halpern", 72), Some(k("ride.1")));
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 62),
            Some(k("crash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 64),
            Some(k("crash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 67),
            Some(k("crash.2.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 69),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 83),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 82),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 76),
            Some(k("china.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_halpern", 77),
            Some(k("china.1.mute"))
        );
    }

    #[test]
    fn aggressive_rock_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_aggressiverock_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_aggressiverock_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 40),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 42),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 45),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 48),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 54),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 49),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(decoded("ggd_aggressiverock_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_aggressiverock_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_aggressiverock_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_aggressiverock_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 74),
            Some(k("ride.1.bell"))
        );
        assert_eq!(decoded("ggd_aggressiverock_ggd", 73), Some(k("ride.1")));
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 58),
            Some(k("crash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 59),
            Some(k("crash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 61),
            Some(k("crash.2.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 62),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 77),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 83),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 71),
            Some(k("china.1.hit"))
        );
        assert_eq!(
            decoded("ggd_aggressiverock_ggd", 72),
            Some(k("china.1.mute"))
        );
    }

    #[test]
    fn p5_halpern_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_p5_halpern_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 48), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 49), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 57), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_p5_halpern_gm", 55), Some(k("splash.1.hit")));
    }

    #[test]
    fn p5_halpern_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_p5_halpern_halpern", 24), Some(k("kick.main")));
        assert_eq!(decoded("ggd_p5_halpern_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_p5_halpern_halpern", 29), Some(k("snare1.off")));
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 33),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 37),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 35),
            Some(k("tom.floor2.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 45),
            Some(k("hat.tight.tip"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_p5_halpern_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_p5_halpern_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_p5_halpern_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_p5_halpern_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_p5_halpern_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 62),
            Some(k("crash.2.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 64),
            Some(k("crash.2.mute"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 67),
            Some(k("crash.3.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 69),
            Some(k("crash.3.mute"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 83),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 82),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 74),
            Some(k("ride.1.bell"))
        );
        assert_eq!(decoded("ggd_p5_halpern_halpern", 72), Some(k("ride.1")));
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 76),
            Some(k("china.1.hit"))
        );
        assert_eq!(
            decoded("ggd_p5_halpern_halpern", 77),
            Some(k("china.1.mute"))
        );
    }

    #[test]
    fn p5_halpern_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_p5_halpern_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_p5_halpern_ggd", 40),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_p5_halpern_ggd", 41), Some(k("snare1.off")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 45), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 43), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 58), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 59), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 61), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 62), Some(k("crash.3.mute")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 83), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_p5_halpern_ggd", 72), Some(k("china.1.mute")));
    }

    #[test]
    fn metal_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_metal_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 43), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_metal_gm", 48), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 41), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_metal_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_metal_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_metal_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_metal_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_metal_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_metal_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_metal_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_metal_gm", 49), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 57), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_metal_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 55), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_metal_gm", 36), Some(k("kick.main")));
    }

    #[test]
    fn metal_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_metal_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_metal_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_metal_halpern", 33), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 37), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 35), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 39), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 45), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_metal_halpern", 58), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_metal_halpern", 47), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_metal_halpern", 48), Some(k("hat.closed.edge")));
        assert_eq!(decoded("ggd_metal_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_metal_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_metal_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_metal_halpern", 44), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_metal_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_metal_halpern", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_metal_halpern", 72), Some(k("ride.1")));
        assert_eq!(decoded("ggd_metal_halpern", 62), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 64), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_metal_halpern", 67), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 69), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_metal_halpern", 76), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 77), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_metal_halpern", 83), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_metal_halpern", 82), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_metal_halpern", 24), Some(k("kick.main")));
    }

    #[test]
    fn metal_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_metal_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 40), Some(k("snare1.sidestick")));
        assert_eq!(decoded("ggd_metal_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 45), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 46), Some(k("tom.floor2.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_metal_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_metal_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_metal_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_metal_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_metal_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_metal_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_metal_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_metal_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_metal_ggd", 58), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 59), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_metal_ggd", 61), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 62), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_metal_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 72), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_metal_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_metal_ggd", 83), Some(k("splash.1.mute")));
        assert_eq!(decoded("ggd_metal_ggd", 36), Some(k("kick.main")));
    }

    #[test]
    fn ml_drums_plays_the_ride_edge_on_60_and_the_bell_on_72() {
        assert_eq!(decoded("ml_drums", 60), Some(k("ride.1.edge")));
        assert_eq!(decoded("ml_drums_free", 60), Some(k("ride.1.edge")));
        assert_eq!(decoded("ml_drums", 72), Some(k("bell.1.hit")));
        assert_eq!(decoded("ml_drums_free", 72), None);
    }

    #[test]
    fn ml_drums_plays_rack_tom_3_on_45() {
        assert_eq!(decoded("ml_drums", 45), Some(k("tom.rack3.hit")));
        assert_eq!(decoded("ml_drums_free", 45), Some(k("tom.rack3.hit")));
        assert_eq!(decoded("ml_drums_free", 47), None);
    }

    #[test]
    fn ml_drums_opens_its_hats_from_semi_open_1_to_open() {
        assert_eq!(decoded("ml_drums", 68), Some(k("hat.open1")));
        assert_eq!(decoded("ml_drums", 69), Some(k("hat.open2")));
        assert_eq!(decoded("ml_drums", 70), Some(k("hat.open3")));
        assert_eq!(decoded("ml_drums", 46), Some(k("hat.open4")));
        assert_eq!(decoded("ml_drums", 71), Some(k("hat.open4")));
        assert_eq!(decoded("ml_drums", 67), Some(k("hat.closed.edge")));
        assert_eq!(decoded("ml_drums_free", 68), Some(k("hat.open1")));
        assert_eq!(decoded("ml_drums_free", 69), Some(k("hat.open2")));
        assert_eq!(decoded("ml_drums_free", 70), Some(k("hat.open3")));
        assert_eq!(decoded("ml_drums_free", 46), Some(k("hat.open4")));
        assert_eq!(decoded("ml_drums_free", 71), Some(k("hat.open4")));
        assert_eq!(decoded("ml_drums_free", 67), Some(k("hat.closed.edge")));
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
        assert_eq!(decoded("ssd5", 74), Some(k("perc.cowbell")));
        assert_eq!(decoded("ssd5", 75), Some(k("perc.cowbell")));
        assert_eq!(decoded("ssd5", 76), Some(k("perc.clap")));
        assert_eq!(decoded("ssd5", 77), Some(k("perc.tambourine")));
        assert_eq!(decoded("ssd5", 78), Some(k("perc.tambourine")));
        assert_eq!(decoded("ssd5", 79), Some(k("perc.tambourine")));
        assert_eq!(decoded("ssd5", 80), Some(k("perc.shaker")));
        assert_eq!(decoded("ssd5", 81), Some(k("perc.shaker")));
        assert_eq!(decoded("ssd5", 82), Some(k("perc.shaker")));
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
    fn room_sound_ballou_vol1_is_named_for_volume_1() {
        let b = Catalog::builtin();
        let ballou = b.get("roomsound_ballou_vol1").unwrap();
        assert!(ballou.name().ends_with("Vol. 1"), "{}", ballou.name());
        assert!(
            ballou.display_name().ends_with("Vol. 1"),
            "{}",
            ballou.display_name()
        );
    }

    #[test]
    fn room_sound_ballou_vol1_plays_its_splash_and_china_below_92() {
        assert_eq!(
            decoded("roomsound_ballou_vol1", 85),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("roomsound_ballou_vol1", 86),
            Some(k("splash.1.mute"))
        );
        assert_eq!(
            decoded("roomsound_ballou_vol1", 87),
            Some(k("splash.1.hit"))
        );
        assert_eq!(
            decoded("roomsound_ballou_vol1", 89),
            Some(k("china.1.mute"))
        );
        assert_eq!(
            decoded("roomsound_ballou_vol1", 90),
            Some(k("china.1.mute"))
        );
        assert_eq!(decoded("roomsound_ballou_vol1", 91), Some(k("china.1.hit")));
        assert_eq!(decoded("roomsound_ballou_vol1", 88), None);
        assert_eq!(decoded("roomsound_ballou_vol1", 92), None);
    }

    #[test]
    fn room_sound_ballou_vol1_has_two_rack_toms_and_no_stick_clicks() {
        assert_eq!(
            decoded("roomsound_ballou_vol1", 48),
            Some(k("tom.rack1.hit"))
        );
        assert_eq!(
            decoded("roomsound_ballou_vol1", 47),
            Some(k("tom.rack2.hit"))
        );
        assert_eq!(decoded("roomsound_ballou_vol1", 45), None);
        assert_eq!(decoded("roomsound_ballou_vol1", 31), None);
    }

    #[test]
    fn p4_halpern_plays_mini_hats_on_77_and_a_stick_click_on_79() {
        assert_eq!(decoded("ggd_p4_halpern", 77), Some(k("aux1.closed")));
        assert_eq!(decoded("ggd_p4_halpern", 79), Some(k("perc.sticks")));
    }

    #[test]
    fn p4_halpern_numbers_its_crashes_as_invasion_does() {
        assert_eq!(decoded("ggd_p4_halpern", 52), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_p4_halpern", 53), Some(k("crash.1.mute")));
        assert_eq!(decoded("ggd_p4_halpern", 54), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_p4_halpern", 55), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_p4_halpern", 56), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_p4_halpern", 57), Some(k("crash.3.mute")));
    }

    #[test]
    fn nu_metal_reads_the_second_keys_of_its_invasion_preset() {
        assert_eq!(decoded("ggd_numetal", 27), Some(k("snare2.hit")));
        assert_eq!(decoded("ggd_numetal", 56), Some(k("crash.1.hit")));
        assert_eq!(decoded("ggd_numetal", 57), Some(k("crash.1.mute")));
    }

    #[test]
    fn nu_metal_gm_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_numetal_gm", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_numetal_gm", 38), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 50), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 43), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 48), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 42), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_numetal_gm", 54), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_numetal_gm", 46), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_numetal_gm", 58), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_numetal_gm", 44), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_numetal_gm", 53), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_numetal_gm", 51), Some(k("ride.1")));
        assert_eq!(decoded("ggd_numetal_gm", 49), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 57), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 52), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_numetal_gm", 55), Some(k("splash.1.hit")));
    }

    #[test]
    fn nu_metal_halpern_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_numetal_halpern", 24), Some(k("kick.main")));
        assert_eq!(decoded("ggd_numetal_halpern", 26), Some(k("snare1.hit")));
        assert_eq!(
            decoded("ggd_numetal_halpern", 30),
            Some(k("snare1.sidestick"))
        );
        assert_eq!(decoded("ggd_numetal_halpern", 33), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_numetal_halpern", 37), Some(k("tom.rack2.hit")));
        assert_eq!(
            decoded("ggd_numetal_halpern", 35),
            Some(k("tom.floor1.hit"))
        );
        assert_eq!(decoded("ggd_numetal_halpern", 45), Some(k("hat.tight.tip")));
        assert_eq!(
            decoded("ggd_numetal_halpern", 58),
            Some(k("hat.tight.edge"))
        );
        assert_eq!(
            decoded("ggd_numetal_halpern", 47),
            Some(k("hat.closed.tip"))
        );
        assert_eq!(
            decoded("ggd_numetal_halpern", 48),
            Some(k("hat.closed.edge"))
        );
        assert_eq!(decoded("ggd_numetal_halpern", 53), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_numetal_halpern", 54), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_numetal_halpern", 56), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_numetal_halpern", 43), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_numetal_halpern", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_numetal_halpern", 72), Some(k("ride.1")));
        assert_eq!(decoded("ggd_numetal_halpern", 62), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_numetal_halpern", 64), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_numetal_halpern", 67), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_numetal_halpern", 69), Some(k("crash.3.mute")));
        assert_eq!(decoded("ggd_numetal_halpern", 76), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_numetal_halpern", 77), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_numetal_halpern", 83), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_numetal_halpern", 82), Some(k("splash.1.mute")));
    }

    #[test]
    fn nu_metal_ggd_plays_each_drum_the_default_map_plays() {
        assert_eq!(decoded("ggd_numetal_ggd", 36), Some(k("kick.main")));
        assert_eq!(decoded("ggd_numetal_ggd", 37), Some(k("snare1.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 40), Some(k("snare1.sidestick")));
        assert_eq!(decoded("ggd_numetal_ggd", 42), Some(k("tom.rack1.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 45), Some(k("tom.rack2.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 43), Some(k("tom.floor1.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 48), Some(k("hat.tight.tip")));
        assert_eq!(decoded("ggd_numetal_ggd", 54), Some(k("hat.tight.edge")));
        assert_eq!(decoded("ggd_numetal_ggd", 49), Some(k("hat.closed.tip")));
        assert_eq!(decoded("ggd_numetal_ggd", 52), Some(k("hat.open1")));
        assert_eq!(decoded("ggd_numetal_ggd", 53), Some(k("hat.open2")));
        assert_eq!(decoded("ggd_numetal_ggd", 57), Some(k("hat.open3")));
        assert_eq!(decoded("ggd_numetal_ggd", 55), Some(k("hat.pedal")));
        assert_eq!(decoded("ggd_numetal_ggd", 74), Some(k("ride.1.bell")));
        assert_eq!(decoded("ggd_numetal_ggd", 73), Some(k("ride.1")));
        assert_eq!(decoded("ggd_numetal_ggd", 58), Some(k("crash.2.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 59), Some(k("crash.2.mute")));
        assert_eq!(decoded("ggd_numetal_ggd", 61), Some(k("crash.3.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 62), Some(k("crash.3.mute")));
        assert_eq!(decoded("ggd_numetal_ggd", 71), Some(k("china.1.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 72), Some(k("china.1.mute")));
        assert_eq!(decoded("ggd_numetal_ggd", 77), Some(k("splash.1.hit")));
        assert_eq!(decoded("ggd_numetal_ggd", 83), Some(k("splash.1.mute")));
    }

    #[test]
    fn mangini_plays_its_second_hi_hat_as_a_second_hat() {
        assert_eq!(decoded("mixwave_mangini", 108), Some(k("aux2.closed.tip")));
        assert_eq!(decoded("mixwave_mangini", 109), Some(k("aux2.closed.edge")));
        assert_eq!(decoded("mixwave_mangini", 110), Some(k("aux2.open1")));
        assert_eq!(decoded("mixwave_mangini", 111), Some(k("aux2.open2")));
        assert_eq!(decoded("mixwave_mangini", 112), Some(k("aux2.open3")));
        assert_eq!(decoded("mixwave_mangini", 34), Some(k("aux2.cc")));
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
