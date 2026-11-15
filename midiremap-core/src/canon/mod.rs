mod fallback;
mod family;
mod key;
mod label;
mod piece;
#[cfg(test)]
pub(crate) mod rules;
mod slot;

use std::sync::LazyLock;

#[cfg(test)]
use self::slot::CongaPitch;
use self::slot::{each, hat_slots, tom_positions};
pub use self::{family::Family, key::CanonParseError, label::CanonEntry};
pub(crate) use self::{
    piece::Piece,
    slot::{
        AuxIdx, CrashIdx, CymArtic, CymDistance, CymKind, CymSlot, CymStroke, HandDrum, HandLength,
        HandPart, HandPitch, HandStroke, HatOpen, HatZone, KickKind, OpenLevel, PercKind, RackIdx,
        RideArtic, RideIdx, Slot, SnareArtic, SnareIdx, TomArtic, TomDistance, TomPos,
    },
};
use crate::idx::Idx;

/// A drum and how it is played, the hub every engine map translates through.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(type = r#"string & { readonly __brand: "Canon" }"#)
)]
pub struct Canon(Slot);

fn build_all() -> Vec<Canon> {
    each::<KickKind>()
        .map(Slot::Kick)
        .chain(SnareIdx::all().flat_map(|i| each().map(move |a| Slot::Snare(i, a))))
        .chain(tom_positions().flat_map(|p| each().map(move |a| Slot::Tom(p, a))))
        .chain(hat_slots().map(|(o, z)| Slot::Hat(o, z)))
        .chain(AuxIdx::all().flat_map(|i| hat_slots().map(move |(o, z)| Slot::Aux(i, o, z))))
        .chain(CymSlot::all().flat_map(|s| each().map(move |a| Slot::Cymbal(s, a))))
        .chain(RideIdx::all().flat_map(|i| each().map(move |a| Slot::Ride(i, a))))
        .chain(each().map(Slot::Perc))
        .chain(HandDrum::all().map(Slot::Hand))
        .map(Canon)
        .collect()
}

static ALL: LazyLock<Vec<Canon>> = LazyLock::new(build_all);

impl Canon {
    pub(crate) const KICK: Self = Self(Slot::Kick(KickKind::Main));
    pub(crate) const SNARE: Self = Self(Slot::Snare(Idx::FIRST, SnareArtic::Hit));
    pub(crate) const CLOSED_HAT: Self = Self(Slot::Hat(HatOpen::Closed, HatZone::Plain));
    pub(crate) const CRASH: Self = Self(Slot::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit));
    pub(crate) const RIDE: Self = Self(Slot::Ride(Idx::FIRST, RideArtic::Bow));
    pub(crate) const RACK_TOM: Self = Self(Slot::Tom(TomPos::Rack(Idx::FIRST), TomArtic::Hit));
    pub(crate) const SECOND_RACK_TOM: Self = Self(Slot::Tom(TomPos::Rack(idx(2)), TomArtic::Hit));
    pub(crate) const FLOOR_TOM: Self = Self(Slot::Tom(TomPos::Floor(Idx::FIRST), TomArtic::Hit));

    /// The drums a groove uses most, in kit order.
    pub const CORE_KIT: [Canon; 16] = [
        Self::KICK,
        Self::SNARE,
        Canon(Slot::Snare(Idx::FIRST, SnareArtic::Sidestick)),
        Canon(Slot::Snare(Idx::FIRST, SnareArtic::Rimshot)),
        Self::CLOSED_HAT,
        Canon(Slot::Hat(HatOpen::Pedal, HatZone::Plain)),
        Canon(Slot::Hat(HatOpen::Open(Idx::FIRST), HatZone::Plain)),
        Self::RACK_TOM,
        Self::SECOND_RACK_TOM,
        Canon(Slot::Tom(TomPos::Rack(idx(3)), TomArtic::Hit)),
        Self::FLOOR_TOM,
        Canon(Slot::Tom(TomPos::Floor(idx(2)), TomArtic::Hit)),
        Self::CRASH,
        Canon(Slot::Cymbal(CymSlot::Crash(idx(2)), CymArtic::Hit)),
        Self::RIDE,
        Canon(Slot::Ride(Idx::FIRST, RideArtic::Bell)),
    ];

    /// Every canonical slot, in declaration order.
    pub fn all() -> &'static [Canon] {
        &ALL
    }

    /// Whether `other` is the same physical drum or cymbal, only played another way.
    pub fn same_drum(self, other: Canon) -> bool {
        match (self.0, other.0) {
            (Slot::Kick(_), Slot::Kick(_)) | (Slot::Hat(..), Slot::Hat(..)) => true,
            (Slot::Snare(a, _), Slot::Snare(b, _)) | (Slot::Ride(a, _), Slot::Ride(b, _)) => a == b,
            (Slot::Tom(a, _), Slot::Tom(b, _)) => a == b,
            (Slot::Aux(a, ..), Slot::Aux(b, ..)) => a == b,
            (Slot::Cymbal(a, _), Slot::Cymbal(b, _)) => a == b,
            (Slot::Perc(a), Slot::Perc(b)) => a == b,
            (Slot::Hand(a), Slot::Hand(b)) => {
                a.played(HandStroke::Open) == b.played(HandStroke::Open)
            }
            _ => false,
        }
    }

    /// The group the app and the site list this drum under.
    pub fn family(self) -> Family {
        match self.0 {
            Slot::Kick(_) => Family::Kick,
            Slot::Snare(..) => Family::Snare,
            Slot::Tom(..) => Family::Toms,
            Slot::Hat(..) => Family::HiHat,
            Slot::Aux(..) => Family::Aux,
            Slot::Cymbal(..) | Slot::Ride(..) => Family::Cymbals,
            Slot::Perc(_) | Slot::Hand(..) => Family::Percussion,
        }
    }

    /// How far open the main hi-hat is and where it is hit, when this drum is an open main
    /// hi-hat.
    pub(crate) fn opening(self) -> Option<(OpenLevel, HatZone)> {
        match self.0 {
            Slot::Hat(HatOpen::Open(level), zone) => Some((level, zone)),
            _ => None,
        }
    }

    /// Whether this drum is the main hi-hat played open, at any level and in any zone.
    pub fn is_open_main_hat(self) -> bool {
        self.opening().is_some()
    }

    /// The main hi-hat open to `level`.
    pub(crate) fn open_main_hat(level: OpenLevel) -> Canon {
        Canon(Slot::Hat(HatOpen::Open(level), HatZone::Plain))
    }

    /// The same open main hi-hat, in the same zone, opened to `level`; any other drum as it is.
    pub(crate) fn at_open_level(self, level: OpenLevel) -> Canon {
        match self.0 {
            Slot::Hat(HatOpen::Open(_), zone) => Canon(Slot::Hat(HatOpen::Open(level), zone)),
            _ => self,
        }
    }

    /// Where the tom sits and how it is played, when this drum is a tom.
    pub(crate) fn tom(self) -> Option<(TomPos, TomArtic)> {
        match self.0 {
            Slot::Tom(pos, artic) => Some((pos, artic)),
            _ => None,
        }
    }

    /// The same stroke on the tom at `pos`; any other drum as it is.
    pub(crate) fn at_tom_pos(self, pos: TomPos) -> Canon {
        match self.0 {
            Slot::Tom(_, artic) => Canon(Slot::Tom(pos, artic)),
            _ => self,
        }
    }

    /// The cymbal `slot` played with `artic`.
    pub(crate) fn of_cymbal(slot: CymSlot, artic: CymArtic) -> Canon {
        Canon(Slot::Cymbal(slot, artic))
    }

    /// The ride `ride` played with `artic`.
    pub(crate) fn of_ride(ride: RideIdx, artic: RideArtic) -> Canon {
        Canon(Slot::Ride(ride, artic))
    }

    /// Which cymbal and how it is played, when this drum is a cymbal other than a ride.
    pub(crate) fn cymbal(self) -> Option<(CymSlot, CymArtic)> {
        match self.0 {
            Slot::Cymbal(slot, artic) => Some((slot, artic)),
            _ => None,
        }
    }

    /// The stroke of a cymbal or a ride this drum is, when it is one.
    pub(crate) fn cymbal_stroke(self) -> Option<CymStroke> {
        match self.0 {
            Slot::Cymbal(slot, artic) => Some(CymStroke::Cymbal(slot, artic)),
            Slot::Ride(ride, artic) => Some(CymStroke::Ride(ride, artic)),
            _ => None,
        }
    }
}

/// The canon of `key`, for tests.
#[cfg(test)]
pub(crate) fn k(key: &str) -> Canon {
    key.parse().expect("test canon key is valid")
}

pub(crate) const fn idx<const MAX: u8>(n: u8) -> Idx<MAX> {
    Idx::new(n).expect("a constant index is in range")
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use strum::VariantArray;

    use super::{
        slot::{
            HandDrumDiscriminants, HatOpenDiscriminants, SlotDiscriminants, TomPosDiscriminants,
        },
        *,
    };

    fn assert_reaches_every<D: VariantArray + Eq + std::hash::Hash>(seen: impl Iterator<Item = D>) {
        let seen: HashSet<D> = seen.collect();
        assert!(D::VARIANTS.iter().all(|d| seen.contains(d)));
    }

    #[test]
    fn an_open_main_hat_has_an_opening_in_its_zone() {
        assert_eq!(k("hat.open2").opening(), Some((idx(2), HatZone::Plain)));
        assert_eq!(k("hat.open4.edge").opening(), Some((idx(4), HatZone::Edge)));
    }

    #[test]
    fn only_an_open_main_hat_has_an_opening() {
        assert_eq!(k("aux1.open2").opening(), None);
        assert_eq!(k("hat.loose").opening(), None);
        assert_eq!(k("hat.cc").opening(), None);
        assert_eq!(k("snare1.hit").opening(), None);
    }

    #[test]
    fn an_open_main_hat_moves_to_another_level_in_its_zone() {
        assert_eq!(k("hat.open1.tip").at_open_level(idx(4)), k("hat.open4.tip"));
        assert_eq!(k("hat.open3").at_open_level(idx(1)), k("hat.open1"));
    }

    #[test]
    fn a_drum_without_an_opening_stays_itself_at_any_level() {
        assert_eq!(k("aux1.open2").at_open_level(idx(4)), k("aux1.open2"));
        assert_eq!(k("hat.loose").at_open_level(idx(4)), k("hat.loose"));
        assert_eq!(k("snare1.hit").at_open_level(idx(4)), k("snare1.hit"));
    }

    #[test]
    fn all_reaches_every_drum_kind() {
        let all = Canon::all().iter().copied();
        assert_reaches_every(all.map(|c: Canon| SlotDiscriminants::from(c.0)));
    }

    #[test]
    fn all_reaches_every_hat_open_level() {
        let all = Canon::all().iter().copied();
        assert_reaches_every(all.filter_map(|c| match c {
            Canon(Slot::Hat(o, _)) | Canon(Slot::Aux(_, o, _)) => {
                Some(HatOpenDiscriminants::from(o))
            }
            _ => None,
        }));
    }

    #[test]
    fn all_reaches_every_tom_position() {
        let all = Canon::all().iter().copied();
        assert_reaches_every(all.filter_map(|c| match c {
            Canon(Slot::Tom(p, _)) => Some(TomPosDiscriminants::from(p)),
            _ => None,
        }));
    }

    #[test]
    fn all_reaches_every_cymbal_slot() {
        let all = Canon::all().iter().copied();
        assert_reaches_every(all.filter_map(|c| match c {
            Canon(Slot::Cymbal(s, _)) => Some(s.kind()),
            _ => None,
        }));
    }

    #[test]
    fn all_reaches_every_hand_drum() {
        let all = Canon::all().iter().copied();
        assert_reaches_every(all.filter_map(|c| match c {
            Canon(Slot::Hand(d)) => Some(HandDrumDiscriminants::from(d)),
            _ => None,
        }));
    }

    #[test]
    fn only_a_high_conga_a_cuica_and_a_triangle_are_played_muted() {
        let muted: Vec<String> = Canon::all()
            .iter()
            .filter(|c| matches!(c.0, Slot::Hand(d) if d.stroke() == HandStroke::Mute))
            .map(Canon::to_string)
            .collect();
        assert_eq!(
            muted,
            [
                "perc.conga.high.mute",
                "perc.cuica.mute",
                "perc.triangle.mute"
            ]
        );
    }

    #[test]
    fn same_drum_a_muted_conga_is_its_conga() {
        assert_same_drum("perc.conga.high.mute", "perc.conga.high");
    }

    #[test]
    fn same_drum_two_bongos_are_different_drums() {
        assert_different_drums("perc.bongo.high", "perc.bongo.low");
    }

    #[test]
    fn same_drum_a_triangle_is_not_a_cowbell() {
        assert_different_drums("perc.triangle", "perc.cowbell");
    }

    #[test]
    fn latin_percussion_belongs_to_the_percussion_family() {
        assert_eq!(k("perc.bongo.high").family(), Family::Percussion);
    }

    #[test]
    fn the_hand_drums_follow_the_kit_percussion() {
        let all = Canon::all();
        let misc = all
            .iter()
            .position(|&c| c == k("perc.misc"))
            .expect("perc.misc is a canon");
        assert_eq!(all[misc + 1], k("perc.bongo.high"));
    }

    #[test]
    fn all_keeps_its_order() {
        let all = Canon::all();
        assert_eq!(all[0], k("kick.main"));
        assert_eq!(all[3], k("snare1.hit"));
        assert_eq!(all.last(), Some(&k("perc.triangle.mute")));
    }

    #[test]
    fn a_ride_belongs_to_the_cymbals() {
        assert_eq!(
            Canon(Slot::Ride(idx(1), RideArtic::Bow)).family(),
            Family::Cymbals
        );
    }

    #[test]
    fn an_aux_hat_belongs_to_the_aux_family() {
        assert_eq!(
            Canon(Slot::Aux(idx(1), HatOpen::Closed, HatZone::Plain)).family(),
            Family::Aux
        );
    }

    #[test]
    fn a_tom_belongs_to_the_toms() {
        assert_eq!(
            Canon(Slot::Tom(TomPos::Rack(idx(1)), TomArtic::Hit)).family(),
            Family::Toms
        );
    }

    fn assert_same_drum(a: &str, b: &str) {
        assert!(k(a).same_drum(k(b)), "{a} ~ {b}");
        assert!(k(b).same_drum(k(a)), "{b} ~ {a}");
    }

    fn assert_different_drums(a: &str, b: &str) {
        assert!(!k(a).same_drum(k(b)), "{a} !~ {b}");
        assert!(!k(b).same_drum(k(a)), "{b} !~ {a}");
    }

    #[test]
    fn same_drum_a_left_kick_is_the_main_kick() {
        assert_same_drum("kick.left", "kick.main");
    }

    #[test]
    fn same_drum_a_snare_rimshot_is_its_snare() {
        assert_same_drum("snare2.rimshot", "snare2.hit");
    }

    #[test]
    fn same_drum_a_tom_rim_is_its_tom() {
        assert_same_drum("tom.rack4.rim", "tom.rack4.hit");
    }

    #[test]
    fn same_drum_an_open_hat_bell_is_the_hi_hat() {
        assert_same_drum("hat.open3.bell", "hat.closed");
    }

    #[test]
    fn same_drum_an_open_aux_hat_is_its_aux_hat() {
        assert_same_drum("aux1.open5", "aux1.closed");
    }

    #[test]
    fn same_drum_a_muted_china_is_its_china() {
        assert_same_drum("china.2.mute", "china.2.hit");
    }

    #[test]
    fn same_drum_a_ride_bell_is_its_ride() {
        assert_same_drum("ride.1.bell", "ride.1");
    }

    #[test]
    fn same_drum_two_rack_toms_are_different_drums() {
        assert_different_drums("tom.rack4.hit", "tom.rack3.hit");
    }

    #[test]
    fn same_drum_two_snares_are_different_drums() {
        assert_different_drums("snare2.hit", "snare1.hit");
    }

    #[test]
    fn same_drum_a_china_is_not_a_crash() {
        assert_different_drums("china.1.hit", "crash.1.hit");
    }

    #[test]
    fn same_drum_two_crashes_are_different_drums() {
        assert_different_drums("crash.3.hit", "crash.2.hit");
    }

    #[test]
    fn same_drum_two_rides_are_different_drums() {
        assert_different_drums("ride.2", "ride.1");
    }

    #[test]
    fn same_drum_a_ride_is_not_a_crash() {
        assert_different_drums("ride.1", "crash.1.hit");
    }

    #[test]
    fn same_drum_an_aux_hat_is_not_the_hi_hat() {
        assert_different_drums("aux1.closed", "hat.closed");
    }

    #[test]
    fn same_drum_a_cowbell_is_not_a_clap() {
        assert_different_drums("perc.cowbell", "perc.clap");
    }

    #[test]
    fn every_canon_is_its_own_drum() {
        for &c in Canon::all() {
            assert!(c.same_drum(c), "{c}");
        }
    }

    #[test]
    fn all_has_no_duplicates() {
        let unique: HashSet<Canon> = Canon::all().iter().copied().collect();
        assert_eq!(unique.len(), Canon::all().len());
    }
}
