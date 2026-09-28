use std::{
    collections::{HashMap, HashSet, VecDeque},
    fmt,
    str::FromStr,
    sync::LazyLock,
};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

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

pub type SnareIdx = Idx<2>;
pub type AuxIdx = Idx<2>;
pub type RideIdx = Idx<2>;
pub type RackIdx = Idx<8>;
pub type FloorIdx = Idx<4>;
pub type OpenLevel = Idx<6>;

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
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

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum KickKind {
    Main,
    Alt,
    Left,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
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
pub enum TomPos {
    Rack(RackIdx),
    Floor(FloorIdx),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum TomArtic {
    Hit,
    Rim,
    Rimshot,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum HatOpen {
    Tight,
    Closed,
    Loose,
    Open(OpenLevel),
    Cc,
    Pedal,
    PedalSplash,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum HatZone {
    Plain,
    Tip,
    Edge,
    Bell,
}
/// A cymbal and its position; each kind has its own number of positions.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum CymSlot {
    Crash(Idx<6>),
    China(Idx<3>),
    Splash(Idx<3>),
    Stack(Idx<4>),
    Bell(Idx<2>),
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum CymArtic {
    Hit,
    Mute,
    Bell,
    BellTip,
    Bow,
    BowTip,
    Edge,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum RideArtic {
    Bow,
    Bell,
    BellTip,
    BowTip,
    Edge,
    Mute,
}
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
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

    fn key(self) -> &'static str {
        match self {
            Self::Crash(_) => "crash",
            Self::China(_) => "china",
            Self::Splash(_) => "splash",
            Self::Stack(_) => "stack",
            Self::Bell(_) => "bell",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Crash(_) => "Crash",
            Self::China(_) => "China",
            Self::Splash(_) => "Splash",
            Self::Stack(_) => "Stack",
            Self::Bell(_) => "Bell",
        }
    }
}

const KICK_KINDS: [KickKind; 3] = [KickKind::Main, KickKind::Alt, KickKind::Left];
const SNARE_ARTICS: [SnareArtic; 8] = {
    use SnareArtic::*;
    [Hit, Rim, Rimshot, Sidestick, Flam, Ruff, Off, Side]
};
const TOM_ARTICS: [TomArtic; 3] = [TomArtic::Hit, TomArtic::Rim, TomArtic::Rimshot];
const HAT_ZONES: [HatZone; 4] = [HatZone::Plain, HatZone::Tip, HatZone::Edge, HatZone::Bell];
const CYM_ARTICS: [CymArtic; 7] = {
    use CymArtic::*;
    [Hit, Mute, Bell, BellTip, Bow, BowTip, Edge]
};
const RIDE_ARTICS: [RideArtic; 6] = {
    use RideArtic::*;
    [Bow, Bell, BellTip, BowTip, Edge, Mute]
};
const PERC_KINDS: [PercKind; 7] = {
    use PercKind::*;
    [Cowbell, Clap, Shaker, Sticks, Tambourine, Vibraslap, Misc]
};

fn hat_openings() -> impl Iterator<Item = HatOpen> {
    use HatOpen::*;
    [Tight, Closed, Loose, Cc, Pedal, PedalSplash]
        .into_iter()
        .chain(OpenLevel::all().map(Open))
}

fn hat_slots() -> impl Iterator<Item = (HatOpen, HatZone)> {
    hat_openings().flat_map(|o| HAT_ZONES.map(|z| (o, z)))
}

fn tom_positions() -> impl Iterator<Item = TomPos> {
    RackIdx::all()
        .map(TomPos::Rack)
        .chain(FloorIdx::all().map(TomPos::Floor))
}

fn build_all() -> Vec<Canon> {
    KICK_KINDS
        .into_iter()
        .map(Canon::Kick)
        .chain(SnareIdx::all().flat_map(|i| SNARE_ARTICS.map(|a| Canon::Snare(i, a))))
        .chain(tom_positions().flat_map(|p| TOM_ARTICS.map(|a| Canon::Tom(p, a))))
        .chain(hat_slots().map(|(o, z)| Canon::Hat(o, z)))
        .chain(AuxIdx::all().flat_map(|i| hat_slots().map(move |(o, z)| Canon::Aux(i, o, z))))
        .chain(CymSlot::all().flat_map(|s| CYM_ARTICS.map(|a| Canon::Cymbal(s, a))))
        .chain(RideIdx::all().flat_map(|i| RIDE_ARTICS.map(|a| Canon::Ride(i, a))))
        .chain(PERC_KINDS.map(Canon::Perc))
        .collect()
}

static ALL: LazyLock<Vec<Canon>> = LazyLock::new(build_all);

static BY_KEY: LazyLock<HashMap<String, Canon>> = LazyLock::new(|| {
    ALL.iter()
        .map(|&c| (c.to_string(), c))
        .chain(RideIdx::all().map(|i| (format!("ride.{i}.bow"), Canon::Ride(i, RideArtic::Bow))))
        .collect()
});

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
}

fn kick_kind_key(k: KickKind) -> &'static str {
    match k {
        KickKind::Main => "main",
        KickKind::Alt => "alt",
        KickKind::Left => "left",
    }
}
fn snare_artic_key(a: SnareArtic) -> &'static str {
    use SnareArtic::*;
    match a {
        Hit => "hit",
        Rim => "rim",
        Rimshot => "rimshot",
        Sidestick => "sidestick",
        Flam => "flam",
        Ruff => "ruff",
        Off => "off",
        Side => "side",
    }
}
fn tom_artic_key(a: TomArtic) -> &'static str {
    match a {
        TomArtic::Hit => "hit",
        TomArtic::Rim => "rim",
        TomArtic::Rimshot => "rimshot",
    }
}
fn hat_open_key(o: HatOpen) -> String {
    use HatOpen::*;
    match o {
        Tight => "tight".into(),
        Closed => "closed".into(),
        Loose => "loose".into(),
        Open(n) => format!("open{n}"),
        Cc => "cc".into(),
        Pedal => "pedal".into(),
        PedalSplash => "pedalsplash".into(),
    }
}
fn hat_zone_key(z: HatZone) -> Option<&'static str> {
    match z {
        HatZone::Plain => None,
        HatZone::Tip => Some("tip"),
        HatZone::Edge => Some("edge"),
        HatZone::Bell => Some("bell"),
    }
}
fn cym_artic_key(a: CymArtic) -> &'static str {
    use CymArtic::*;
    match a {
        Hit => "hit",
        Mute => "mute",
        Bell => "bell",
        BellTip => "belltip",
        Bow => "bow",
        BowTip => "bowtip",
        Edge => "edge",
    }
}
fn ride_artic_key(a: RideArtic) -> Option<&'static str> {
    use RideArtic::*;
    match a {
        Bow => None,
        Bell => Some("bell"),
        BellTip => Some("belltip"),
        BowTip => Some("bowtip"),
        Edge => Some("edge"),
        Mute => Some("mute"),
    }
}
fn perc_kind_key(k: PercKind) -> &'static str {
    use PercKind::*;
    match k {
        Cowbell => "cowbell",
        Clap => "clap",
        Shaker => "shaker",
        Sticks => "sticks",
        Tambourine => "tambourine",
        Vibraslap => "vibraslap",
        Misc => "misc",
    }
}
fn tom_pos_key(p: TomPos) -> String {
    match p {
        TomPos::Rack(n) => format!("rack{n}"),
        TomPos::Floor(n) => format!("floor{n}"),
    }
}

impl fmt::Display for Canon {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            Canon::Kick(k) => write!(f, "kick.{}", kick_kind_key(k)),
            Canon::Snare(i, a) => write!(f, "snare{i}.{}", snare_artic_key(a)),
            Canon::Tom(p, a) => write!(f, "tom.{}.{}", tom_pos_key(p), tom_artic_key(a)),
            Canon::Hat(o, z) => match hat_zone_key(z) {
                Some(zs) => write!(f, "hat.{}.{zs}", hat_open_key(o)),
                None => write!(f, "hat.{}", hat_open_key(o)),
            },
            Canon::Aux(i, o, z) => match hat_zone_key(z) {
                Some(zs) => write!(f, "aux{i}.{}.{zs}", hat_open_key(o)),
                None => write!(f, "aux{i}.{}", hat_open_key(o)),
            },
            Canon::Cymbal(s, a) => write!(f, "{}.{}.{}", s.key(), s.index(), cym_artic_key(a)),
            Canon::Ride(i, a) => match ride_artic_key(a) {
                Some(as_) => write!(f, "ride.{i}.{as_}"),
                None => write!(f, "ride.{i}"),
            },
            Canon::Perc(k) => write!(f, "perc.{}", perc_kind_key(k)),
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq)]
#[error("invalid canon key: {0}")]
pub struct CanonParseError(pub String);

impl FromStr for Canon {
    type Err = CanonParseError;

    /// Accepts exactly the keys `Display` produces, plus the alias `ride.N.bow`.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        BY_KEY
            .get(s)
            .copied()
            .ok_or_else(|| CanonParseError(s.to_string()))
    }
}

impl Serialize for Canon {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
impl<'de> Deserialize<'de> for Canon {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        s.parse().map_err(de::Error::custom)
    }
}

fn hat_label(prefix: &str, o: HatOpen, z: HatZone) -> String {
    let open = match o {
        HatOpen::Tight => "Tight".to_string(),
        HatOpen::Closed => "Closed".to_string(),
        HatOpen::Loose => "Loose".to_string(),
        HatOpen::Open(n) => format!("Open {n}"),
        HatOpen::Cc => "CC".to_string(),
        HatOpen::Pedal => "Pedal".to_string(),
        HatOpen::PedalSplash => "Pedal Splash".to_string(),
    };
    let base = format!("{prefix} {open}");
    match z {
        HatZone::Plain => base,
        HatZone::Tip => format!("{base} Tip"),
        HatZone::Edge => format!("{base} Edge"),
        HatZone::Bell => format!("{base} Bell"),
    }
}

impl Canon {
    pub fn label(self) -> String {
        match self {
            Canon::Kick(KickKind::Main) => "Kick".into(),
            Canon::Kick(KickKind::Alt) => "Kick (Alt)".into(),
            Canon::Kick(KickKind::Left) => "Kick (Left)".into(),
            Canon::Snare(i, a) => {
                let base = if i == SnareIdx::FIRST {
                    "Snare".to_string()
                } else {
                    format!("Snare {i}")
                };
                match a {
                    SnareArtic::Hit => base,
                    SnareArtic::Rim => format!("{base} Rim"),
                    SnareArtic::Rimshot => format!("{base} Rimshot"),
                    SnareArtic::Sidestick => "Side Stick".into(),
                    SnareArtic::Flam => format!("{base} Flam"),
                    SnareArtic::Ruff => format!("{base} Ruff"),
                    SnareArtic::Off => format!("{base} (Off)"),
                    SnareArtic::Side => format!("{base} (Side)"),
                }
            }
            Canon::Tom(p, a) => {
                let base = match p {
                    TomPos::Rack(n) => format!("Rack Tom {n}"),
                    TomPos::Floor(n) => format!("Floor Tom {n}"),
                };
                match a {
                    TomArtic::Hit => base,
                    TomArtic::Rim => format!("{base} Rim"),
                    TomArtic::Rimshot => format!("{base} Rimshot"),
                }
            }
            Canon::Hat(o, z) => hat_label("Hi-Hat", o, z),
            Canon::Aux(i, o, z) => hat_label(&format!("Aux Hat {i}"), o, z),
            Canon::Cymbal(s, a) => {
                let base = format!("{} {}", s.label(), s.index());
                match a {
                    CymArtic::Hit => base,
                    CymArtic::Mute => format!("{base} (Mute)"),
                    CymArtic::Bell => format!("{base} Bell"),
                    CymArtic::BellTip => format!("{base} Bell Tip"),
                    CymArtic::Bow => format!("{base} Bow"),
                    CymArtic::BowTip => format!("{base} Bow Tip"),
                    CymArtic::Edge => format!("{base} Edge"),
                }
            }
            Canon::Ride(i, a) => {
                let base = if i == RideIdx::FIRST {
                    "Ride".to_string()
                } else {
                    format!("Ride {i}")
                };
                match a {
                    RideArtic::Bow => base,
                    RideArtic::Bell => format!("{base} Bell"),
                    RideArtic::BellTip => format!("{base} Bell Tip"),
                    RideArtic::BowTip => format!("{base} Bow Tip"),
                    RideArtic::Edge => format!("{base} Edge"),
                    RideArtic::Mute => format!("{base} (Mute)"),
                }
            }
            Canon::Perc(k) => match k {
                PercKind::Cowbell => "Cowbell",
                PercKind::Clap => "Clap",
                PercKind::Shaker => "Shaker",
                PercKind::Sticks => "Sticks",
                PercKind::Tambourine => "Tambourine",
                PercKind::Vibraslap => "Vibraslap",
                PercKind::Misc => "Percussion",
            }
            .into(),
        }
    }

    pub fn family(self) -> &'static str {
        match self {
            Canon::Kick(_) => "Kick",
            Canon::Snare(..) => "Snare",
            Canon::Tom(..) => "Toms",
            Canon::Hat(..) => "Hi-Hat",
            Canon::Aux(..) => "Aux",
            Canon::Cymbal(..) => "Cymbals",
            Canon::Ride(..) => "Cymbals",
            Canon::Perc(_) => "Percussion",
        }
    }
}

fn snare_artic_step(a: SnareArtic) -> Option<SnareArtic> {
    use SnareArtic::*;
    match a {
        Rimshot => Some(Rim),
        Rim => Some(Hit),
        Ruff => Some(Flam),
        Flam => Some(Hit),
        Sidestick => Some(Hit),
        Off => Some(Hit),
        Side => Some(Hit),
        Hit => None,
    }
}
fn tom_artic_step(a: TomArtic) -> Option<TomArtic> {
    match a {
        TomArtic::Rimshot => Some(TomArtic::Rim),
        TomArtic::Rim => Some(TomArtic::Hit),
        TomArtic::Hit => None,
    }
}
fn cym_artic_step(a: CymArtic) -> Option<CymArtic> {
    use CymArtic::*;
    match a {
        Mute => Some(Hit),
        BellTip => Some(Bell),
        Bell => Some(Bow),
        BowTip => Some(Bow),
        Bow => Some(Hit),
        Edge => Some(Hit),
        Hit => None,
    }
}
fn ride_artic_step(a: RideArtic) -> Option<RideArtic> {
    use RideArtic::*;
    match a {
        Bell => Some(Bow),
        BellTip => Some(Bell),
        BowTip => Some(Bow),
        Edge => Some(Bow),
        Mute => Some(Bow),
        Bow => Some(BowTip),
    }
}
fn hat_zone_step(z: HatZone) -> Option<HatZone> {
    match z {
        HatZone::Bell => Some(HatZone::Edge),
        HatZone::Edge => Some(HatZone::Tip),
        HatZone::Tip => Some(HatZone::Plain),
        HatZone::Plain => None,
    }
}
fn hat_open_step(o: HatOpen) -> Option<HatOpen> {
    use HatOpen::*;
    match o {
        Open(n) => Some(n.prev().map_or(Loose, Open)),
        Loose => Some(Closed),
        Tight => Some(Closed),
        Cc => Some(Closed),
        PedalSplash => Some(Pedal),
        Pedal => Some(Closed),
        Closed => None,
    }
}
fn tom_rank(p: TomPos) -> u8 {
    match p {
        TomPos::Rack(n) => n.get() - 1,
        TomPos::Floor(n) => RackIdx::MAX + n.get() - 1,
    }
}
fn tom_neighbors(p: TomPos) -> Vec<TomPos> {
    let r = i16::from(tom_rank(p));
    let mut others: Vec<TomPos> = tom_positions().filter(|&q| q != p).collect();
    others.sort_by_key(|&q| {
        let d = (i16::from(tom_rank(q)) - r).abs();
        (d, tom_rank(q))
    });
    others
}

/// One reduction step: the immediate, nearest canonical slots a slot degrades to.
/// `fallback` is the BFS-ordered transitive closure of this relation.
pub fn single_step(c: Canon) -> Vec<Canon> {
    match c {
        Canon::Kick(KickKind::Alt) | Canon::Kick(KickKind::Left) => {
            vec![Canon::Kick(KickKind::Main)]
        }
        Canon::Kick(KickKind::Main) => vec![],
        Canon::Perc(_) => vec![],
        Canon::Snare(i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = snare_artic_step(a) {
                edges.push(Canon::Snare(i, p));
            }
            if let Some(prev) = i.prev() {
                edges.push(Canon::Snare(prev, a));
            }
            edges
        }
        Canon::Tom(pos, a) => match tom_artic_step(a) {
            Some(p) => vec![Canon::Tom(pos, p)],
            None => tom_neighbors(pos)
                .into_iter()
                .map(|q| Canon::Tom(q, TomArtic::Hit))
                .collect(),
        },
        Canon::Hat(o, z) => match hat_zone_step(z) {
            Some(pz) => vec![Canon::Hat(o, pz)],
            None => hat_open_step(o)
                .map(|po| Canon::Hat(po, HatZone::Plain))
                .into_iter()
                .collect(),
        },
        Canon::Aux(_, o, z) => vec![Canon::Hat(o, z)],
        Canon::Cymbal(slot, a) => {
            let mut edges = Vec::new();
            if let Some(p) = cym_artic_step(a) {
                edges.push(Canon::Cymbal(slot, p));
            }
            if let Some(prev) = slot.prev() {
                edges.push(Canon::Cymbal(prev, a));
            } else if a == CymArtic::Hit {
                match slot {
                    CymSlot::Crash(_) => {}
                    CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) => {
                        edges.push(Canon::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit));
                    }
                    CymSlot::Bell(_) => edges.push(Canon::Ride(RideIdx::FIRST, RideArtic::Bell)),
                }
            }
            edges
        }
        Canon::Ride(i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = ride_artic_step(a) {
                edges.push(Canon::Ride(i, p));
            }
            if let Some(prev) = i.prev() {
                edges.push(Canon::Ride(prev, a));
            } else if a == RideArtic::Bow {
                edges.push(Canon::Cymbal(CymSlot::Crash(Idx::FIRST), CymArtic::Hit));
            }
            edges
        }
    }
}

pub fn fallback(c: Canon) -> Vec<Canon> {
    let mut out: Vec<Canon> = Vec::new();
    let mut seen: HashSet<Canon> = HashSet::new();
    seen.insert(c);
    let mut queue: VecDeque<Canon> = single_step(c).into();
    while let Some(n) = queue.pop_front() {
        if !seen.insert(n) {
            continue;
        }
        out.push(n);
        for nxt in single_step(n) {
            queue.push_back(nxt);
        }
    }
    out
}

#[cfg(test)]
pub(crate) const fn idx<const MAX: u8>(n: u8) -> Idx<MAX> {
    Idx::new(n).expect("test index in range")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_round_trips_over_all() {
        for &c in Canon::all() {
            let s = c.to_string();
            let back: Canon = s.parse().unwrap_or_else(|_| panic!("parse {s}"));
            assert_eq!(c, back, "round-trip {s}");
        }
    }

    #[test]
    fn key_examples_are_stable() {
        assert_eq!(Canon::Kick(KickKind::Main).to_string(), "kick.main");
        assert_eq!(
            Canon::Snare(idx(1), SnareArtic::Sidestick).to_string(),
            "snare1.sidestick"
        );
        assert_eq!(
            Canon::Tom(TomPos::Rack(idx(1)), TomArtic::Hit).to_string(),
            "tom.rack1.hit"
        );
        assert_eq!(
            Canon::Hat(HatOpen::Closed, HatZone::Plain).to_string(),
            "hat.closed"
        );
        assert_eq!(
            Canon::Hat(HatOpen::Open(idx(3)), HatZone::Edge).to_string(),
            "hat.open3.edge"
        );
        assert_eq!(
            Canon::Cymbal(CymSlot::Crash(idx(2)), CymArtic::Mute).to_string(),
            "crash.2.mute"
        );
        assert_eq!(Canon::Ride(idx(1), RideArtic::Bow).to_string(), "ride.1");
        assert_eq!(
            Canon::Ride(idx(1), RideArtic::Bell).to_string(),
            "ride.1.bell"
        );
        assert_eq!(Canon::Perc(PercKind::Cowbell).to_string(), "perc.cowbell");
        assert_eq!(
            "crash.2.mute".parse::<Canon>().unwrap(),
            Canon::Cymbal(CymSlot::Crash(idx(2)), CymArtic::Mute)
        );
        assert!("crash.9.hit".parse::<Canon>().is_err());
        assert!("bogus".parse::<Canon>().is_err());
    }

    #[test]
    fn serde_is_string_form() {
        let c = Canon::Cymbal(CymSlot::China(idx(1)), CymArtic::Hit);
        let j = serde_json::to_string(&c).unwrap();
        assert_eq!(j, "\"china.1.hit\"");
        let back: Canon = serde_json::from_str(&j).unwrap();
        assert_eq!(c, back);
    }

    #[test]
    fn every_variant_has_a_nonempty_label() {
        for &c in Canon::all() {
            assert!(!c.label().is_empty(), "{c:?} has empty label");
        }
        assert_eq!(
            Canon::Hat(HatOpen::Open(idx(1)), HatZone::Plain).label(),
            "Hi-Hat Open 1"
        );
        assert_eq!(
            Canon::Snare(idx(1), SnareArtic::Sidestick).label(),
            "Side Stick"
        );
    }

    #[test]
    fn every_variant_has_a_nonempty_family() {
        for &c in Canon::all() {
            assert!(!c.family().is_empty(), "{c:?} has empty family");
        }
        assert_eq!(Canon::Ride(idx(1), RideArtic::Bow).family(), "Cymbals");
        assert_eq!(
            Canon::Aux(idx(1), HatOpen::Closed, HatZone::Plain).family(),
            "Aux"
        );
        assert_eq!(
            Canon::Tom(TomPos::Rack(idx(1)), TomArtic::Hit).family(),
            "Toms"
        );
    }

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    #[test]
    fn worked_chains() {
        assert_eq!(
            fallback(k("china.2.mute")),
            vec![
                k("china.2.hit"),
                k("china.1.mute"),
                k("china.1.hit"),
                k("crash.1.hit")
            ]
        );
        assert_eq!(
            fallback(k("crash.2.mute")),
            vec![k("crash.2.hit"), k("crash.1.mute"), k("crash.1.hit")]
        );
        assert_eq!(
            fallback(k("ride.1.belltip")),
            vec![
                k("ride.1.bell"),
                k("ride.1"),
                k("ride.1.bowtip"),
                k("crash.1.hit")
            ]
        );
        assert_eq!(
            fallback(k("ride.1")),
            vec![k("ride.1.bowtip"), k("crash.1.hit")]
        );
        assert_eq!(fallback(k("kick.left")), vec![k("kick.main")]);
        assert_eq!(fallback(k("stack.1.hit")), vec![k("crash.1.hit")]);
        let hat = fallback(k("hat.open3.bell"));
        assert_eq!(
            &hat[..4],
            &[
                k("hat.open3.edge"),
                k("hat.open3.tip"),
                k("hat.open3"),
                k("hat.open2")
            ]
        );
        assert_eq!(hat.last(), Some(&k("hat.closed")));
    }

    #[test]
    fn roots_and_perc_are_empty() {
        for r in [
            "kick.main",
            "snare1.hit",
            "hat.closed",
            "crash.1.hit",
            "perc.cowbell",
            "perc.misc",
        ] {
            assert!(fallback(k(r)).is_empty(), "{r} must be a root");
        }
        assert!(
            !fallback(k("tom.rack1.hit")).is_empty(),
            "toms are a clique, not roots"
        );
    }

    #[test]
    fn chain_is_closed_no_self_no_dupes() {
        for &c in Canon::all() {
            let chain = fallback(c);
            assert!(!chain.contains(&c), "{c:?} in own chain");
            let mut seen = std::collections::HashSet::new();
            for d in &chain {
                assert!(seen.insert(*d), "dup {d:?} in {c:?}");
            }
            let allowed: std::collections::HashSet<Canon> =
                chain.iter().copied().chain(std::iter::once(c)).collect();
            for d in &chain {
                for nxt in single_step(*d) {
                    assert!(
                        allowed.contains(&nxt),
                        "chain({c:?}) not closed: {d:?}->{nxt:?} missing"
                    );
                }
            }
            assert!(chain.len() < Canon::all().len());
        }
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

    #[test]
    fn parse_accepts_ride_bow_alias_only_as_ride() {
        assert_eq!(k("ride.1.bow"), k("ride.1"));
        assert_eq!(k("ride.2.bow"), Canon::Ride(idx(2), RideArtic::Bow));
    }

    #[test]
    fn parse_rejects_out_of_range_and_unknown_keys() {
        for bad in [
            "crash.7.hit",
            "china.4.hit",
            "splash.4.hit",
            "stack.5.hit",
            "bell.3.hit",
            "snare3.hit",
            "snare0.hit",
            "aux3.closed",
            "hat.open7",
            "hat.open0",
            "hat.closed.plain",
            "tom.rack9.hit",
            "tom.floor5.hit",
            "ride.3",
            "ride.0.bell",
            "kick.main.hit",
            "",
        ] {
            assert!(bad.parse::<Canon>().is_err(), "{bad:?} must be rejected");
        }
    }
}
