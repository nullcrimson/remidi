mod fallback;
mod key;
mod label;

use std::sync::LazyLock;

use strum::{IntoStaticStr, VariantArray};

pub use self::key::CanonParseError;
use crate::{family::Family, idx::Idx};

pub(crate) type SnareIdx = Idx<2>;
pub(crate) type AuxIdx = Idx<2>;
pub(crate) type RideIdx = Idx<2>;
pub(crate) type RackIdx = Idx<8>;
pub(crate) type FloorIdx = Idx<4>;
pub(crate) type OpenLevel = Idx<6>;

/// A drum and how it is played, the hub every engine map translates through.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(type = r#"string & { readonly __brand: "Canon" }"#)
)]
pub struct Canon(Slot);

/// What a canon names: the drum and the way it is played.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub(crate) enum Slot {
    Kick(KickKind),
    Snare(SnareIdx, SnareArtic),
    Tom(TomPos, TomArtic),
    Hat(HatOpen, HatZone),
    Aux(AuxIdx, HatOpen, HatZone),
    Cymbal(CymSlot, CymArtic),
    Ride(RideIdx, RideArtic),
    Perc(PercKind),
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum KickKind {
    Main,
    Alt,
    Left,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum SnareArtic {
    Hit,
    Rim,
    Rimshot,
    Sidestick,
    Flam,
    Ruff,
    Off,
    Side,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub(crate) enum TomPos {
    Rack(RackIdx),
    Floor(FloorIdx),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum TomArtic {
    Hit,
    Rim,
    Rimshot,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub(crate) enum HatOpen {
    Tight,
    Closed,
    Loose,
    Open(OpenLevel),
    Cc,
    Pedal,
    PedalSplash,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum HatZone {
    Plain,
    Tip,
    Edge,
    Bell,
}
/// A cymbal and its position; each kind has its own number of positions.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub(crate) enum CymSlot {
    Crash(Idx<6>),
    China(Idx<3>),
    Splash(Idx<3>),
    Stack(Idx<4>),
    Bell(Idx<2>),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum CymArtic {
    Hit,
    Mute,
    Bell,
    BellTip,
    Bow,
    BowTip,
    Edge,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum RideArtic {
    Bow,
    Bell,
    BellTip,
    BowTip,
    Edge,
    Mute,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum PercKind {
    Cowbell,
    Clap,
    Shaker,
    Sticks,
    Tambourine,
    Vibraslap,
    Misc,
}

impl CymSlot {
    fn all() -> impl Iterator<Item = Self> {
        Idx::all()
            .map(Self::Crash)
            .chain(Idx::all().map(Self::China))
            .chain(Idx::all().map(Self::Splash))
            .chain(Idx::all().map(Self::Stack))
            .chain(Idx::all().map(Self::Bell))
    }

    fn index(self) -> u8 {
        match self {
            Self::Crash(i) => i.get(),
            Self::China(i) | Self::Splash(i) => i.get(),
            Self::Stack(i) => i.get(),
            Self::Bell(i) => i.get(),
        }
    }
}

fn each<T: VariantArray + Copy>() -> impl Iterator<Item = T> + Clone {
    T::VARIANTS.iter().copied()
}

fn hat_openings() -> impl Iterator<Item = HatOpen> {
    use HatOpen::*;
    [Tight, Closed, Loose, Cc, Pedal, PedalSplash]
        .into_iter()
        .chain(OpenLevel::all().map(Open))
}

fn hat_slots() -> impl Iterator<Item = (HatOpen, HatZone)> {
    hat_openings().flat_map(|o| each::<HatZone>().map(move |z| (o, z)))
}

fn tom_positions() -> impl Iterator<Item = TomPos> {
    RackIdx::all()
        .map(TomPos::Rack)
        .chain(FloorIdx::all().map(TomPos::Floor))
}

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

    /// The drums a groove uses most, in kit order.
    pub const CORE_KIT: [Canon; 16] = [
        Self::KICK,
        Self::SNARE,
        Canon(Slot::Snare(Idx::FIRST, SnareArtic::Sidestick)),
        Canon(Slot::Snare(Idx::FIRST, SnareArtic::Rimshot)),
        Self::CLOSED_HAT,
        Canon(Slot::Hat(HatOpen::Pedal, HatZone::Plain)),
        Canon(Slot::Hat(HatOpen::Open(Idx::FIRST), HatZone::Plain)),
        Canon(Slot::Tom(TomPos::Rack(Idx::FIRST), TomArtic::Hit)),
        Canon(Slot::Tom(TomPos::Rack(idx(2)), TomArtic::Hit)),
        Canon(Slot::Tom(TomPos::Rack(idx(3)), TomArtic::Hit)),
        Canon(Slot::Tom(TomPos::Floor(Idx::FIRST), TomArtic::Hit)),
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
            Slot::Perc(_) => Family::Percussion,
        }
    }
}

/// A drum as people read it: its key, its name and the family it is listed under.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[cfg_attr(
    feature = "ts",
    derive(tsify::Tsify),
    tsify(missing_as_null, hashmap_as_object)
)]
pub struct CanonEntry {
    canon: Canon,
    label: String,
    family: Family,
}

impl CanonEntry {
    pub fn canon(&self) -> Canon {
        self.canon
    }

    pub fn label(&self) -> &str {
        &self.label
    }

    pub fn family(&self) -> Family {
        self.family
    }
}

impl From<Canon> for CanonEntry {
    fn from(canon: Canon) -> Self {
        Self {
            canon,
            label: canon.label(),
            family: canon.family(),
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

    use super::*;

    fn assert_reaches_every<D: VariantArray + Eq + std::hash::Hash>(seen: impl Iterator<Item = D>) {
        let seen: HashSet<D> = seen.collect();
        assert!(D::VARIANTS.iter().all(|d| seen.contains(d)));
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
            Canon(Slot::Cymbal(s, _)) => Some(CymSlotDiscriminants::from(s)),
            _ => None,
        }));
    }

    #[test]
    fn all_keeps_its_order() {
        let all = Canon::all();
        assert_eq!(all.len(), 344);
        assert_eq!(all[0], k("kick.main"));
        assert_eq!(all[3], k("snare1.hit"));
        assert_eq!(all.last(), Some(&k("perc.misc")));
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
