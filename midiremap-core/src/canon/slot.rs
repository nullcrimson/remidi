use std::{iter::once, ops::Add};

use strum::{IntoStaticStr, VariantArray};

use crate::idx::Idx;

pub(crate) type SnareIdx = Idx<2>;
pub(crate) type AuxIdx = Idx<2>;
pub(crate) type RideIdx = Idx<2>;
pub(crate) type CrashIdx = Idx<6>;
pub(crate) type RackIdx = Idx<8>;
pub(crate) type FloorIdx = Idx<4>;
pub(crate) type OpenLevel = Idx<6>;

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
    Hand(HandDrum),
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
    Ghost,
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
#[derive(
    Copy,
    Clone,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
    Hash,
    Debug,
    IntoStaticStr,
    strum::EnumDiscriminants,
)]
#[strum(serialize_all = "lowercase")]
#[strum_discriminants(name(CymKind), derive(Hash, VariantArray))]
pub(crate) enum CymSlot {
    Crash(CrashIdx),
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

impl CymArtic {
    pub(crate) fn is_bell(self) -> bool {
        match self {
            Self::Bell | Self::BellTip => true,
            Self::Hit | Self::Mute | Self::Bow | Self::BowTip | Self::Edge => false,
        }
    }

    /// The stroke this cymbal stroke plays as on a ride's bell: the bell tip for a bell tip,
    /// the bell for any other.
    pub(crate) fn on_ride_bell(self) -> RideArtic {
        match self {
            Self::BellTip => RideArtic::BellTip,
            Self::Hit | Self::Mute | Self::Bell | Self::Bow | Self::BowTip | Self::Edge => {
                RideArtic::Bell
            }
        }
    }
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

impl RideArtic {
    pub(crate) fn is_bell(self) -> bool {
        match self {
            Self::Bell | Self::BellTip => true,
            Self::Bow | Self::BowTip | Self::Edge | Self::Mute => false,
        }
    }
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
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum HandPitch {
    High,
    Low,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum HandLength {
    Short,
    Long,
}
/// The pitch or length a hand drum comes in, where it comes in two.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub(crate) enum HandPart {
    Pitch(HandPitch),
    Length(HandLength),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, VariantArray, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
pub(crate) enum HandStroke {
    Open,
    Mute,
}
/// The high conga, the one conga that can also be played muted.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub(crate) enum CongaPitch {
    High(HandStroke),
    Low,
}
/// A hand or Latin percussion drum, with its pitch or length where it comes in two and its
/// stroke where it can be played muted.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, IntoStaticStr)]
#[strum(serialize_all = "lowercase")]
#[cfg_attr(
    test,
    derive(strum::EnumDiscriminants),
    strum_discriminants(derive(Hash, VariantArray))
)]
pub(crate) enum HandDrum {
    Bongo(HandPitch),
    Conga(CongaPitch),
    Timbale(HandPitch),
    Agogo(HandPitch),
    Whistle(HandLength),
    Guiro(HandLength),
    Claves,
    Woodblock(HandPitch),
    Cuica(HandStroke),
    Triangle(HandStroke),
}

impl CymSlot {
    pub(super) fn all() -> impl Iterator<Item = Self> {
        Idx::all()
            .map(Self::Crash)
            .chain(Idx::all().map(Self::China))
            .chain(Idx::all().map(Self::Splash))
            .chain(Idx::all().map(Self::Stack))
            .chain(Idx::all().map(Self::Bell))
    }

    /// The cymbal's number among the cymbals of its kind.
    pub(super) fn number(self) -> u8 {
        match self {
            Self::Crash(i) => i.get(),
            Self::China(i) | Self::Splash(i) => i.get(),
            Self::Stack(i) => i.get(),
            Self::Bell(i) => i.get(),
        }
    }

    pub(crate) fn kind(self) -> CymKind {
        CymKind::from(self)
    }

    /// How far apart this cymbal's number sits from `other`'s.
    pub(crate) fn distance(self, other: Self) -> CymDistance {
        CymDistance(self.number().abs_diff(other.number()))
    }

    /// How far apart this cymbal's number sits from the number of the ride `ride`.
    pub(crate) fn ride_distance(self, ride: RideIdx) -> CymDistance {
        CymDistance(self.number().abs_diff(ride.get()))
    }
}

/// A stroke of a cymbal or of a ride.
#[derive(Copy, Clone)]
pub(crate) enum CymStroke {
    Cymbal(CymSlot, CymArtic),
    Ride(RideIdx, RideArtic),
}

impl CymStroke {
    /// Whether it is a stroke of a cymbal's bell or a ride's bell.
    #[cfg(test)]
    pub(crate) fn is_bell(self) -> bool {
        match self {
            Self::Cymbal(_, artic) => artic.is_bell(),
            Self::Ride(_, artic) => artic.is_bell(),
        }
    }
}

/// How far apart the numbers of two cymbals, or of a cymbal and a ride, sit.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Default)]
pub(crate) struct CymDistance(u8);

impl Add for CymDistance {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl HandDrum {
    pub(super) fn all() -> impl Iterator<Item = Self> {
        let pitched = |drum: fn(HandPitch) -> Self| each().map(drum);
        let lengths = |drum: fn(HandLength) -> Self| each().map(drum);
        let stroked = |drum: fn(HandStroke) -> Self| each().map(drum);
        pitched(Self::Bongo)
            .chain(stroked(|s| Self::Conga(CongaPitch::High(s))))
            .chain(once(Self::Conga(CongaPitch::Low)))
            .chain(pitched(Self::Timbale))
            .chain(pitched(Self::Agogo))
            .chain(lengths(Self::Whistle))
            .chain(lengths(Self::Guiro))
            .chain(once(Self::Claves))
            .chain(pitched(Self::Woodblock))
            .chain(stroked(Self::Cuica))
            .chain(stroked(Self::Triangle))
    }

    pub(super) fn part(self) -> Option<HandPart> {
        match self {
            Self::Bongo(p) | Self::Timbale(p) | Self::Agogo(p) | Self::Woodblock(p) => {
                Some(HandPart::Pitch(p))
            }
            Self::Conga(CongaPitch::High(_)) => Some(HandPart::Pitch(HandPitch::High)),
            Self::Conga(CongaPitch::Low) => Some(HandPart::Pitch(HandPitch::Low)),
            Self::Whistle(l) | Self::Guiro(l) => Some(HandPart::Length(l)),
            Self::Claves | Self::Cuica(_) | Self::Triangle(_) => None,
        }
    }

    pub(super) fn stroke(self) -> HandStroke {
        match self {
            Self::Conga(CongaPitch::High(s)) | Self::Cuica(s) | Self::Triangle(s) => s,
            Self::Bongo(_)
            | Self::Conga(CongaPitch::Low)
            | Self::Timbale(_)
            | Self::Agogo(_)
            | Self::Whistle(_)
            | Self::Guiro(_)
            | Self::Claves
            | Self::Woodblock(_) => HandStroke::Open,
        }
    }

    pub(super) fn played(self, s: HandStroke) -> Self {
        match self {
            Self::Conga(CongaPitch::High(_)) => Self::Conga(CongaPitch::High(s)),
            Self::Cuica(_) => Self::Cuica(s),
            Self::Triangle(_) => Self::Triangle(s),
            Self::Bongo(_)
            | Self::Conga(CongaPitch::Low)
            | Self::Timbale(_)
            | Self::Agogo(_)
            | Self::Whistle(_)
            | Self::Guiro(_)
            | Self::Claves
            | Self::Woodblock(_) => self,
        }
    }
}

pub(super) fn each<T: VariantArray + Copy>() -> impl Iterator<Item = T> + Clone {
    T::VARIANTS.iter().copied()
}

fn hat_openings() -> impl Iterator<Item = HatOpen> {
    use HatOpen::*;
    [Tight, Closed, Loose, Cc, Pedal, PedalSplash]
        .into_iter()
        .chain(OpenLevel::all().map(Open))
}

pub(super) fn hat_slots() -> impl Iterator<Item = (HatOpen, HatZone)> {
    hat_openings().flat_map(|o| each::<HatZone>().map(move |z| (o, z)))
}

pub(super) fn tom_positions() -> impl Iterator<Item = TomPos> {
    RackIdx::all()
        .map(TomPos::Rack)
        .chain(FloorIdx::all().map(TomPos::Floor))
}

/// How far apart two tom positions sit along the kit, from rack 1 down to the last floor tom.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Default)]
pub(crate) struct TomDistance(u16);

impl Add for TomDistance {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl TomPos {
    fn rank(self) -> u16 {
        match self {
            Self::Rack(n) => u16::from(n.offset()),
            Self::Floor(n) => u16::from(RackIdx::MAX + n.offset()),
        }
    }

    /// How far this position sits from `other` along the kit.
    pub(crate) fn distance(self, other: Self) -> TomDistance {
        TomDistance(self.rank().abs_diff(other.rank()))
    }

    pub(crate) fn is_rack(self) -> bool {
        matches!(self, Self::Rack(_))
    }
}
