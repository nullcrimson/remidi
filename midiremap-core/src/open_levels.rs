use std::collections::BTreeSet;

use crate::canon::{HatZone, OpenLevel};

/// How far an engine's main hi-hat opens: the levels it plays in each zone and which level is
/// its normal open hat.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OpenLevels {
    played: BTreeSet<(HatZone, OpenLevel)>,
    main: OpenLevel,
}

impl OpenLevels {
    /// The levels `played`, each in its zone, `main` the normal open hat among them; `None`
    /// when no zone plays `main`.
    pub(crate) fn new(
        played: impl IntoIterator<Item = (OpenLevel, HatZone)>,
        main: OpenLevel,
    ) -> Option<Self> {
        let played: BTreeSet<(HatZone, OpenLevel)> = played
            .into_iter()
            .map(|(level, zone)| (zone, level))
            .collect();
        played
            .iter()
            .any(|&(_, level)| level == main)
            .then_some(Self { played, main })
    }

    /// The normal open hat's level.
    #[cfg(test)]
    pub(crate) fn main(&self) -> OpenLevel {
        self.main
    }

    /// The level `target` plays this engine's `level` at, hit in `zone`. Each engine counts
    /// among the levels it plays in `zone` (in any zone when it plays none there), its main there
    /// the one nearest its main: the main lands on `target`'s main, a less open level on the
    /// nearest of `target`'s less open ones, a more open level on the nearest of its more open
    /// ones, and on the main when `target` has none on that side.
    pub(crate) fn toward(&self, target: &OpenLevels, level: OpenLevel, zone: HatZone) -> OpenLevel {
        let (_, from_main) = self.in_zone(zone);
        let (among, main) = target.in_zone(zone);
        let side = level.cmp(&from_main);
        if side.is_eq() {
            return main;
        }
        closest(level, among.into_iter().filter(|l| l.cmp(&main) == side)).unwrap_or(main)
    }

    /// The levels played in `zone`, in any zone when none is, and the one of them nearest the
    /// main level.
    fn in_zone(&self, zone: HatZone) -> (Vec<OpenLevel>, OpenLevel) {
        let among = self.levels_in(zone);
        let main = closest(self.main, among.iter().copied())
            .expect("played holds the main level, so every zone has a level");
        (among, main)
    }

    fn levels_in(&self, zone: HatZone) -> Vec<OpenLevel> {
        let in_zone: Vec<OpenLevel> = self
            .played
            .iter()
            .filter(|&&(z, _)| z == zone)
            .map(|&(_, level)| level)
            .collect();
        if in_zone.is_empty() {
            self.played.iter().map(|&(_, level)| level).collect()
        } else {
            in_zone
        }
    }
}

/// The member of `among` nearest `to`, the less open one on a tie.
fn closest(to: OpenLevel, among: impl Iterator<Item = OpenLevel>) -> Option<OpenLevel> {
    among.min_by_key(|&l| (l.distance(to), l))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::idx;

    fn plain(played: &[u8], main: u8) -> OpenLevels {
        let played = played.iter().map(|&n| (idx(n), HatZone::Plain));
        OpenLevels::new(played, idx(main)).unwrap()
    }

    fn landings(from: &OpenLevels, to: &OpenLevels, played: &[u8]) -> Vec<u8> {
        played
            .iter()
            .map(|&n| from.toward(to, idx(n), HatZone::Plain).get())
            .collect()
    }

    #[test]
    fn the_main_level_must_be_played() {
        let played = [(idx(1), HatZone::Plain), (idx(3), HatZone::Tip)];
        assert_eq!(OpenLevels::new(played, idx(2)), None);
    }

    #[test]
    fn a_less_open_level_stays_below_and_a_more_open_one_above_the_main() {
        let ggd = plain(&[1, 2, 3], 2);
        let krimh = plain(&[1, 2, 3, 4, 5], 4);
        assert_eq!(landings(&ggd, &krimh, &[1, 3]), [1, 5]);
        assert_eq!(landings(&krimh, &ggd, &[1, 2, 3, 5]), [1, 1, 1, 3]);
    }

    #[test]
    fn a_side_the_target_lacks_lands_on_its_main() {
        let ggd = plain(&[1, 2, 3], 2);
        let mangini = plain(&[1, 2, 3], 3);
        assert_eq!(landings(&ggd, &mangini, &[1, 3]), [1, 3]);
        let ezd2 = plain(&[1, 2, 3, 4], 1);
        assert_eq!(landings(&ggd, &ezd2, &[1, 3]), [1, 3]);
    }

    #[test]
    fn ties_go_to_the_less_open_level() {
        let one_to_five = plain(&[1, 2, 3, 4, 5], 1);
        let drumlab = plain(&[2, 4, 6], 2);
        assert_eq!(one_to_five.toward(&drumlab, idx(5), HatZone::Plain), idx(4));
    }

    #[test]
    fn a_zone_counts_from_its_own_level_nearest_the_main_on_both_sides() {
        let trivium = OpenLevels::new(
            [(idx(4), HatZone::Edge)]
                .into_iter()
                .chain([1, 2, 3, 5].map(|n| (idx(n), HatZone::Tip))),
            idx(4),
        )
        .unwrap();
        assert_eq!(trivium.toward(&trivium, idx(3), HatZone::Tip), idx(3));
        assert_eq!(trivium.toward(&trivium, idx(2), HatZone::Tip), idx(2));
    }

    #[test]
    fn a_zone_without_the_main_level_takes_its_level_nearest_the_main() {
        let bfd3 = OpenLevels::new([(idx(1), HatZone::Tip)], idx(1)).unwrap();
        let krimh =
            OpenLevels::new([(idx(4), HatZone::Plain), (idx(1), HatZone::Tip)], idx(4)).unwrap();
        assert_eq!(bfd3.toward(&krimh, idx(1), HatZone::Tip), idx(1));
    }
}
