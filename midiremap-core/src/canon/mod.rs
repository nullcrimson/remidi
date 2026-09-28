mod fallback;
mod key;
mod label;

use std::{fmt, sync::LazyLock};

use strum::VariantArray;

pub use self::key::CanonParseError;
use crate::family::Family;

/// A 1-based position, always within `1..=MAX`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub struct Idx<const MAX: u8>(u8);

impl<const MAX: u8> Idx<MAX> {
    pub const FIRST: Self = Self(1);
    pub const MAX: u8 = MAX;

    pub const fn new(n: u8) -> Option<Self> {
        if n >= 1 && n <= MAX {
            Some(Self(n))
        } else {
            None
        }
    }

    pub const fn get(self) -> u8 {
        self.0
    }

    /// Every position, ascending.
    pub fn all() -> impl Iterator<Item = Self> {
        (1..=MAX).map(Self)
    }

    /// The position below this one, if any.
    pub fn prev(self) -> Option<Self> {
        Self::new(self.0 - 1)
    }
}

impl<const MAX: u8> fmt::Display for Idx<MAX> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

pub(crate) type SnareIdx = Idx<2>;
pub(crate) type AuxIdx = Idx<2>;
pub(crate) type RideIdx = Idx<2>;
pub(crate) type RackIdx = Idx<8>;
pub(crate) type FloorIdx = Idx<4>;
pub(crate) type OpenLevel = Idx<6>;

/// A drum and how it is played, the hub every engine map translates through.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(feature = "ts", derive(tsify::Tsify), tsify(type = "string"))]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub enum Canon {
    Kick(KickKind),
    Snare(SnareIdx, SnareArtic),
    Tom(TomPos, TomArtic),
    Hat(HatOpen, HatZone),
    Aux(AuxIdx, HatOpen, HatZone),
    Cymbal(CymSlot, CymArtic),
    Ride(RideIdx, RideArtic),
    Perc(PercKind),
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum KickKind {
    Main,
    Alt,
    Left,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum SnareArtic {
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
pub enum TomPos {
    Rack(RackIdx),
    Floor(FloorIdx),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum TomArtic {
    Hit,
    Rim,
    Rimshot,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub enum HatOpen {
    Tight,
    Closed,
    Loose,
    Open(OpenLevel),
    Cc,
    Pedal,
    PedalSplash,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum HatZone {
    Plain,
    Tip,
    Edge,
    Bell,
}
/// A cymbal and its position; each kind has its own number of positions.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub enum CymSlot {
    Crash(Idx<6>),
    China(Idx<3>),
    Splash(Idx<3>),
    Stack(Idx<4>),
    Bell(Idx<2>),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum CymArtic {
    Hit,
    Mute,
    Bell,
    BellTip,
    Bow,
    BowTip,
    Edge,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum RideArtic {
    Bow,
    Bell,
    BellTip,
    BowTip,
    Edge,
    Mute,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray)]
pub enum PercKind {
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

    fn prev(self) -> Option<Self> {
        match self {
            Self::Crash(i) => i.prev().map(Self::Crash),
            Self::China(i) => i.prev().map(Self::China),
            Self::Splash(i) => i.prev().map(Self::Splash),
            Self::Stack(i) => i.prev().map(Self::Stack),
            Self::Bell(i) => i.prev().map(Self::Bell),
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
        .map(Canon::Kick)
        .chain(SnareIdx::all().flat_map(|i| each().map(move |a| Canon::Snare(i, a))))
        .chain(tom_positions().flat_map(|p| each().map(move |a| Canon::Tom(p, a))))
        .chain(hat_slots().map(|(o, z)| Canon::Hat(o, z)))
        .chain(AuxIdx::all().flat_map(|i| hat_slots().map(move |(o, z)| Canon::Aux(i, o, z))))
        .chain(CymSlot::all().flat_map(|s| each().map(move |a| Canon::Cymbal(s, a))))
        .chain(RideIdx::all().flat_map(|i| each().map(move |a| Canon::Ride(i, a))))
        .chain(each().map(Canon::Perc))
        .collect()
}

static ALL: LazyLock<Vec<Canon>> = LazyLock::new(build_all);

impl Canon {
    /// Every canonical slot, in declaration order.
    pub fn all() -> &'static [Canon] {
        &ALL
    }

    /// Whether `other` is the same physical drum or cymbal, only played another way.
    pub fn same_drum(self, other: Canon) -> bool {
        match (self, other) {
            (Self::Kick(_), Self::Kick(_)) | (Self::Hat(..), Self::Hat(..)) => true,
            (Self::Snare(a, _), Self::Snare(b, _)) | (Self::Ride(a, _), Self::Ride(b, _)) => a == b,
            (Self::Tom(a, _), Self::Tom(b, _)) => a == b,
            (Self::Aux(a, ..), Self::Aux(b, ..)) => a == b,
            (Self::Cymbal(a, _), Self::Cymbal(b, _)) => a == b,
            (Self::Perc(a), Self::Perc(b)) => a == b,
            _ => false,
        }
    }

    /// The group the app and the site list this drum under.
    pub fn family(self) -> Family {
        match self {
            Canon::Kick(_) => Family::Kick,
            Canon::Snare(..) => Family::Snare,
            Canon::Tom(..) => Family::Toms,
            Canon::Hat(..) => Family::HiHat,
            Canon::Aux(..) => Family::Aux,
            Canon::Cymbal(..) | Canon::Ride(..) => Family::Cymbals,
            Canon::Perc(_) => Family::Percussion,
        }
    }
}

#[cfg(test)]
pub(crate) const fn idx<const MAX: u8>(n: u8) -> Idx<MAX> {
    Idx::new(n).expect("test index in range")
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    fn kinds<D: VariantArray + Eq + std::hash::Hash>(seen: impl Iterator<Item = D>) -> usize {
        let seen: HashSet<D> = seen.collect();
        assert!(D::VARIANTS.iter().all(|d| seen.contains(d)));
        seen.len()
    }

    #[test]
    fn all_reaches_every_variant() {
        let all = Canon::all().iter().copied();
        kinds(all.clone().map(CanonDiscriminants::from));
        kinds(all.clone().filter_map(|c| match c {
            Canon::Hat(o, _) | Canon::Aux(_, o, _) => Some(HatOpenDiscriminants::from(o)),
            _ => None,
        }));
        kinds(all.clone().filter_map(|c| match c {
            Canon::Tom(p, _) => Some(TomPosDiscriminants::from(p)),
            _ => None,
        }));
        kinds(all.filter_map(|c| match c {
            Canon::Cymbal(s, _) => Some(CymSlotDiscriminants::from(s)),
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
    fn drums_belong_to_their_family() {
        assert_eq!(
            Canon::Ride(idx(1), RideArtic::Bow).family(),
            Family::Cymbals
        );
        assert_eq!(
            Canon::Aux(idx(1), HatOpen::Closed, HatZone::Plain).family(),
            Family::Aux
        );
        assert_eq!(
            Canon::Tom(TomPos::Rack(idx(1)), TomArtic::Hit).family(),
            Family::Toms
        );
    }

    #[test]
    fn same_drum_joins_ways_of_playing_one_instrument() {
        for (a, b) in [
            ("kick.left", "kick.main"),
            ("kick.alt", "kick.main"),
            ("snare2.rimshot", "snare2.hit"),
            ("tom.rack4.rim", "tom.rack4.hit"),
            ("hat.open3.bell", "hat.closed"),
            ("hat.pedal", "hat.closed"),
            ("aux1.open5", "aux1.closed"),
            ("china.2.mute", "china.2.hit"),
            ("ride.1.bell", "ride.1"),
            ("perc.cowbell", "perc.cowbell"),
        ] {
            assert!(k(a).same_drum(k(b)), "{a} ~ {b}");
            assert!(k(b).same_drum(k(a)), "{b} ~ {a}");
        }
    }

    #[test]
    fn same_drum_separates_swaps() {
        for (a, b) in [
            ("tom.rack4.hit", "tom.rack3.hit"),
            ("snare2.hit", "snare1.hit"),
            ("china.1.hit", "crash.1.hit"),
            ("splash.1.hit", "crash.1.hit"),
            ("stack.1.hit", "crash.1.hit"),
            ("crash.3.hit", "crash.2.hit"),
            ("ride.2", "ride.1"),
            ("ride.1", "crash.1.hit"),
            ("bell.1.hit", "ride.1.bell"),
            ("aux1.closed", "hat.closed"),
            ("perc.cowbell", "perc.clap"),
        ] {
            assert!(!k(a).same_drum(k(b)), "{a} !~ {b}");
            assert!(!k(b).same_drum(k(a)), "{b} !~ {a}");
        }
    }

    #[test]
    fn every_canon_is_its_own_drum() {
        for &c in Canon::all() {
            assert!(c.same_drum(c), "{c}");
        }
    }

    #[test]
    fn idx_holds_only_one_to_max() {
        assert_eq!(Idx::<2>::new(0), None);
        assert_eq!(Idx::<2>::new(3), None);
        assert_eq!(Idx::<2>::all().map(Idx::get).collect::<Vec<_>>(), [1, 2]);
        assert_eq!(Idx::<2>::FIRST.prev(), None);
        assert_eq!(idx::<2>(2).prev(), Some(Idx::FIRST));
    }

    #[test]
    fn all_has_no_duplicates() {
        let unique: HashSet<Canon> = Canon::all().iter().copied().collect();
        assert_eq!(unique.len(), Canon::all().len());
    }
}
