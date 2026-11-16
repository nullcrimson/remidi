use std::collections::BTreeSet;

use crate::canon::{HatZone, OpenLevel, Rung};

/// The rungs an engine's main hi-hat plays in each zone, loose first and then its open levels,
/// and which open level is its normal open hat.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HatLadder {
    played: BTreeSet<(HatZone, Rung)>,
    main: OpenLevel,
}

impl HatLadder {
    /// The rungs `played`, each in its zone, `main` the normal open hat's level among them;
    /// `None` when no zone plays `main`.
    pub fn new(played: impl IntoIterator<Item = (Rung, HatZone)>, main: OpenLevel) -> Option<Self> {
        let played: BTreeSet<(HatZone, Rung)> = played
            .into_iter()
            .map(|(rung, zone)| (zone, rung))
            .collect();
        played
            .iter()
            .any(|&(_, rung)| rung == Rung::Level(main))
            .then_some(Self { played, main })
    }

    /// The normal open hat's level.
    #[cfg(any(test, feature = "testing"))]
    pub fn main(&self) -> OpenLevel {
        self.main
    }

    /// The rungs [`toward`](Self::toward) counts among in `zone`, from the least open.
    #[cfg(any(test, feature = "testing"))]
    pub fn rungs_in(&self, zone: HatZone) -> Vec<Rung> {
        self.rungs(zone)
    }

    /// Whether `zone` plays an open level of its own, so that [`toward`](Self::toward) counts
    /// among its own rungs there.
    #[cfg(any(test, feature = "testing"))]
    pub fn plays_in(&self, zone: HatZone) -> bool {
        self.plays_level_in(zone)
    }

    /// The rung `target` plays this engine's `rung` at, hit in `zone`. Each engine counts among
    /// the rungs it plays in `zone`, or in every zone when `zone` plays no open level. The main
    /// level lands on `target`'s main level, or, where `target` does not play it there, on the
    /// rung nearest it, the less open one on a tie. A rung `k` steps from this engine's main
    /// level (one more than the rungs it plays between them) lands on the `k`-th of `target`'s
    /// rungs on that side of its main level, on the last of them when it has fewer, and where
    /// the main level lands when it has none.
    pub fn toward(&self, target: &HatLadder, rung: Rung, zone: HatZone) -> Rung {
        let (from_main, to_main) = (Rung::Level(self.main), Rung::Level(target.main));
        let among = target.rungs(zone);
        let main = closest(to_main, &among);
        let side = rung.cmp(&from_main);
        if side.is_eq() {
            return main;
        }
        let between = self
            .rungs(zone)
            .into_iter()
            .filter(|r| {
                r.cmp(&from_main) == side && r.distance(from_main) < rung.distance(from_main)
            })
            .count();
        let mut outward: Vec<Rung> = among
            .into_iter()
            .filter(|r| r.cmp(&to_main) == side)
            .collect();
        outward.sort_by_key(|r| r.distance(to_main));
        outward
            .get(between)
            .or(outward.last())
            .copied()
            .unwrap_or(main)
    }

    fn plays_level_in(&self, zone: HatZone) -> bool {
        self.played
            .iter()
            .any(|&(z, rung)| z == zone && rung.level().is_some())
    }

    fn rungs(&self, zone: HatZone) -> Vec<Rung> {
        let every_zone = !self.plays_level_in(zone);
        let rungs: BTreeSet<Rung> = self
            .played
            .iter()
            .filter(|&&(z, _)| every_zone || z == zone)
            .map(|&(_, rung)| rung)
            .collect();
        rungs.into_iter().collect()
    }
}

/// The member of `among` nearest `to`, the less open one on a tie.
fn closest(to: Rung, among: &[Rung]) -> Rung {
    *among
        .iter()
        .min_by_key(|&&r| (r.distance(to), r))
        .expect("played holds the main level, so every zone has a rung")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::idx;

    fn level(n: u8) -> Rung {
        Rung::Level(idx(n))
    }

    fn ladder(played: &[(Rung, HatZone)], main: u8) -> HatLadder {
        HatLadder::new(played.iter().copied(), idx(main)).unwrap()
    }

    fn plain(levels: &[u8]) -> Vec<(Rung, HatZone)> {
        levels.iter().map(|&n| (level(n), HatZone::Plain)).collect()
    }

    #[test]
    fn the_main_level_must_be_played() {
        let played = [(level(1), HatZone::Plain), (level(3), HatZone::Tip)];
        assert_eq!(HatLadder::new(played, idx(2)), None);
    }

    #[test]
    fn a_level_lands_among_the_levels_the_target_plays_in_its_zone() {
        let ggd = ladder(&plain(&[1, 2, 3]), 2);
        let mut hertz2 = plain(&[1, 2, 3, 4]);
        hertz2.push((level(5), HatZone::Tip));
        let hertz2 = ladder(&hertz2, 4);
        assert_eq!(ggd.toward(&hertz2, level(3), HatZone::Plain), level(4));
        assert_eq!(ggd.toward(&hertz2, level(3), HatZone::Tip), level(5));
    }

    #[test]
    fn a_zone_without_the_main_level_counts_its_steps_from_the_real_main() {
        let mut krimh = plain(&[1, 2, 3, 4, 5]);
        krimh.push((level(1), HatZone::Tip));
        let krimh = ladder(&krimh, 4);
        let ggd = ladder(&plain(&[1, 2, 3]), 2);
        assert_eq!(krimh.toward(&ggd, level(1), HatZone::Tip), level(1));
    }

    #[test]
    fn a_zone_without_the_main_level_takes_its_level_nearest_the_main() {
        let bfd3 = ladder(&[(level(1), HatZone::Tip)], 1);
        let krimh = ladder(&[(level(4), HatZone::Plain), (level(1), HatZone::Tip)], 4);
        assert_eq!(bfd3.toward(&krimh, level(1), HatZone::Tip), level(1));
    }

    #[test]
    fn a_zone_without_the_main_level_takes_the_less_open_of_two_rungs_as_near() {
        let source = ladder(&[(level(1), HatZone::Tip)], 1);
        let target = ladder(
            &[
                (level(1), HatZone::Plain),
                (Rung::Loose, HatZone::Tip),
                (level(2), HatZone::Tip),
            ],
            1,
        );
        assert_eq!(source.toward(&target, level(1), HatZone::Tip), Rung::Loose);
    }
}
