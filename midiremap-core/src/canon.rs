use std::{fmt, str::FromStr};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum Canon {
    Kick(KickKind),
    Snare(u8, SnareArtic),
    Tom(TomPos, TomArtic),
    Hat(HatOpen, HatZone),
    Aux(u8, HatOpen, HatZone),
    Cymbal(CymKind, u8, CymArtic),
    Ride(u8, RideArtic),
    Perc(PercKind),
}

#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum KickKind {
    Main,
    Alt,
    Left,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
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
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum TomPos {
    Rack(u8),
    Floor(u8),
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum TomArtic {
    Hit,
    Rim,
    Rimshot,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum HatOpen {
    Tight,
    Closed,
    Loose,
    Open(u8),
    Cc,
    Pedal,
    PedalSplash,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum HatZone {
    Plain,
    Tip,
    Edge,
    Bell,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum CymKind {
    Crash,
    China,
    Splash,
    Stack,
    Bell,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum CymArtic {
    Hit,
    Mute,
    Bell,
    BellTip,
    Bow,
    BowTip,
    Edge,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum RideArtic {
    Bow,
    Bell,
    BellTip,
    BowTip,
    Edge,
    Mute,
}
#[derive(Copy, Clone, PartialEq, Eq, Hash, Debug)]
pub enum PercKind {
    Cowbell,
    Clap,
    Shaker,
    Sticks,
    Tambourine,
    Vibraslap,
    Misc,
}

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

fn hat_openings() -> Vec<HatOpen> {
    use HatOpen::*;
    let mut v = vec![Tight, Closed, Loose, Cc, Pedal, PedalSplash];
    v.extend((1..=6).map(Open));
    v
}

impl Canon {
    pub fn all() -> Vec<Canon> {
        let mut out = Vec::new();
        for k in [KickKind::Main, KickKind::Alt, KickKind::Left] {
            out.push(Canon::Kick(k));
        }
        for idx in 1..=2u8 {
            for a in SNARE_ARTICS {
                out.push(Canon::Snare(idx, a));
            }
        }
        for n in 1..=8u8 {
            for a in TOM_ARTICS {
                out.push(Canon::Tom(TomPos::Rack(n), a));
            }
        }
        for n in 1..=4u8 {
            for a in TOM_ARTICS {
                out.push(Canon::Tom(TomPos::Floor(n), a));
            }
        }
        for o in hat_openings() {
            for z in HAT_ZONES {
                out.push(Canon::Hat(o, z));
            }
        }
        for idx in 1..=2u8 {
            for o in hat_openings() {
                for z in HAT_ZONES {
                    out.push(Canon::Aux(idx, o, z));
                }
            }
        }
        let cym: [(CymKind, u8); 5] = [
            (CymKind::Crash, 6),
            (CymKind::China, 3),
            (CymKind::Splash, 3),
            (CymKind::Stack, 4),
            (CymKind::Bell, 2),
        ];
        for (kind, max) in cym {
            for idx in 1..=max {
                for a in CYM_ARTICS {
                    out.push(Canon::Cymbal(kind, idx, a));
                }
            }
        }
        for idx in 1..=2u8 {
            for a in RIDE_ARTICS {
                out.push(Canon::Ride(idx, a));
            }
        }
        for k in PERC_KINDS {
            out.push(Canon::Perc(k));
        }
        out
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
fn cym_kind_key(k: CymKind) -> &'static str {
    use CymKind::*;
    match k {
        Crash => "crash",
        China => "china",
        Splash => "splash",
        Stack => "stack",
        Bell => "bell",
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
            Canon::Cymbal(k, i, a) => {
                write!(f, "{}.{i}.{}", cym_kind_key(k), cym_artic_key(a))
            }
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

fn tom_rack_idx(s: &str) -> Option<u8> {
    s.parse::<u8>().ok().filter(|n| (1..=8).contains(n))
}

fn parse_hat_open(s: &str) -> Option<HatOpen> {
    use HatOpen::*;
    Some(match s {
        "tight" => Tight,
        "closed" => Closed,
        "loose" => Loose,
        "cc" => Cc,
        "pedal" => Pedal,
        "pedalsplash" => PedalSplash,
        _ => Open(
            s.strip_prefix("open")?
                .parse::<u8>()
                .ok()
                .filter(|n| (1..=6).contains(n))?,
        ),
    })
}
fn parse_hat_zone(s: Option<&str>) -> Option<HatZone> {
    match s {
        None => Some(HatZone::Plain),
        Some("tip") => Some(HatZone::Tip),
        Some("edge") => Some(HatZone::Edge),
        Some("bell") => Some(HatZone::Bell),
        Some(_) => None,
    }
}

impl FromStr for Canon {
    type Err = CanonParseError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let p: Vec<&str> = s.split('.').collect();
        let parsed = (|| match p.as_slice() {
            ["kick", k] => Some(Canon::Kick(match *k {
                "main" => KickKind::Main,
                "alt" => KickKind::Alt,
                "left" => KickKind::Left,
                _ => return None,
            })),
            [snare, a] if snare.starts_with("snare") => {
                let i = snare
                    .strip_prefix("snare")?
                    .parse::<u8>()
                    .ok()
                    .filter(|n| (1..=2).contains(n))?;
                let a = match *a {
                    "hit" => SnareArtic::Hit,
                    "rim" => SnareArtic::Rim,
                    "rimshot" => SnareArtic::Rimshot,
                    "sidestick" => SnareArtic::Sidestick,
                    "flam" => SnareArtic::Flam,
                    "ruff" => SnareArtic::Ruff,
                    "off" => SnareArtic::Off,
                    "side" => SnareArtic::Side,
                    _ => return None,
                };
                Some(Canon::Snare(i, a))
            }
            ["tom", pos, a] => {
                let pos = if let Some(n) = pos.strip_prefix("rack") {
                    TomPos::Rack(tom_rack_idx(n)?)
                } else if let Some(n) = pos.strip_prefix("floor") {
                    TomPos::Floor(n.parse::<u8>().ok().filter(|n| (1..=4).contains(n))?)
                } else {
                    return None;
                };
                let a = match *a {
                    "hit" => TomArtic::Hit,
                    "rim" => TomArtic::Rim,
                    "rimshot" => TomArtic::Rimshot,
                    _ => return None,
                };
                Some(Canon::Tom(pos, a))
            }
            ["hat", o] => Some(Canon::Hat(parse_hat_open(o)?, HatZone::Plain)),
            ["hat", o, z] => Some(Canon::Hat(parse_hat_open(o)?, parse_hat_zone(Some(z))?)),
            [aux, o] if aux.starts_with("aux") => {
                let i = aux
                    .strip_prefix("aux")?
                    .parse::<u8>()
                    .ok()
                    .filter(|n| (1..=2).contains(n))?;
                Some(Canon::Aux(i, parse_hat_open(o)?, HatZone::Plain))
            }
            [aux, o, z] if aux.starts_with("aux") => {
                let i = aux
                    .strip_prefix("aux")?
                    .parse::<u8>()
                    .ok()
                    .filter(|n| (1..=2).contains(n))?;
                Some(Canon::Aux(i, parse_hat_open(o)?, parse_hat_zone(Some(z))?))
            }
            [kind, i, a] if matches!(*kind, "crash" | "china" | "splash" | "stack" | "bell") => {
                let kind = match *kind {
                    "crash" => CymKind::Crash,
                    "china" => CymKind::China,
                    "splash" => CymKind::Splash,
                    "stack" => CymKind::Stack,
                    "bell" => CymKind::Bell,
                    _ => return None,
                };
                let max = match kind {
                    CymKind::Crash => 6,
                    CymKind::China => 3,
                    CymKind::Splash => 3,
                    CymKind::Stack => 4,
                    CymKind::Bell => 2,
                };
                let i = i.parse::<u8>().ok().filter(|n| (1..=max).contains(n))?;
                let a = match *a {
                    "hit" => CymArtic::Hit,
                    "mute" => CymArtic::Mute,
                    "bell" => CymArtic::Bell,
                    "belltip" => CymArtic::BellTip,
                    "bow" => CymArtic::Bow,
                    "bowtip" => CymArtic::BowTip,
                    "edge" => CymArtic::Edge,
                    _ => return None,
                };
                Some(Canon::Cymbal(kind, i, a))
            }
            ["ride", i] => Some(Canon::Ride(
                i.parse::<u8>().ok().filter(|n| (1..=2).contains(n))?,
                RideArtic::Bow,
            )),
            ["ride", i, a] => {
                let i = i.parse::<u8>().ok().filter(|n| (1..=2).contains(n))?;
                let a = match *a {
                    "bell" => RideArtic::Bell,
                    "belltip" => RideArtic::BellTip,
                    "bowtip" => RideArtic::BowTip,
                    "edge" => RideArtic::Edge,
                    "mute" => RideArtic::Mute,
                    "bow" => RideArtic::Bow,
                    _ => return None,
                };
                Some(Canon::Ride(i, a))
            }
            ["perc", k] => Some(Canon::Perc(match *k {
                "cowbell" => PercKind::Cowbell,
                "clap" => PercKind::Clap,
                "shaker" => PercKind::Shaker,
                "sticks" => PercKind::Sticks,
                "tambourine" => PercKind::Tambourine,
                "vibraslap" => PercKind::Vibraslap,
                "misc" => PercKind::Misc,
                _ => return None,
            })),
            _ => None,
        })();
        parsed.ok_or_else(|| CanonParseError(s.to_string()))
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
                let base = if i == 1 {
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
            Canon::Cymbal(k, i, a) => {
                let kind = match k {
                    CymKind::Crash => "Crash",
                    CymKind::China => "China",
                    CymKind::Splash => "Splash",
                    CymKind::Stack => "Stack",
                    CymKind::Bell => "Bell",
                };
                let base = format!("{kind} {i}");
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
                let base = if i == 1 {
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
}

/// Resolves the ordered, nearest-first list of alternative canonical slots to
/// try when a target engine cannot play a given slot directly.
pub trait FallbackResolver {
    fn chain(&self, canon: Canon) -> Vec<Canon>;
}

/// The curated default fallback chains.
pub struct DefaultFallbacks;

impl FallbackResolver for DefaultFallbacks {
    fn chain(&self, canon: Canon) -> Vec<Canon> {
        fallback(canon)
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
        Bow => None,
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
        Open(n) if n > 1 => Some(Open(n - 1)),
        Open(1) => Some(Loose),
        Loose => Some(Closed),
        Tight => Some(Closed),
        Cc => Some(Closed),
        PedalSplash => Some(Pedal),
        Pedal => Some(Closed),
        Open(_) | Closed => None,
    }
}
fn tom_rank(p: TomPos) -> u8 {
    match p {
        TomPos::Rack(n) => n - 1,
        TomPos::Floor(n) => 8 + (n - 1),
    }
}
fn tom_neighbors(p: TomPos) -> Vec<TomPos> {
    let all: Vec<TomPos> = (1..=8)
        .map(TomPos::Rack)
        .chain((1..=4).map(TomPos::Floor))
        .collect();
    let r = i16::from(tom_rank(p));
    let mut others: Vec<TomPos> = all.into_iter().filter(|&q| q != p).collect();
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
            if i > 1 {
                edges.push(Canon::Snare(i - 1, a));
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
        Canon::Cymbal(kind, i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = cym_artic_step(a) {
                edges.push(Canon::Cymbal(kind, i, p));
            }
            if i > 1 {
                edges.push(Canon::Cymbal(kind, i - 1, a));
            } else if a == CymArtic::Hit {
                match kind {
                    CymKind::Crash => {}
                    CymKind::China | CymKind::Splash | CymKind::Stack => {
                        edges.push(Canon::Cymbal(CymKind::Crash, 1, CymArtic::Hit));
                    }
                    CymKind::Bell => edges.push(Canon::Ride(1, RideArtic::Bell)),
                }
            }
            edges
        }
        Canon::Ride(i, a) => {
            let mut edges = Vec::new();
            if let Some(p) = ride_artic_step(a) {
                edges.push(Canon::Ride(i, p));
            }
            if i > 1 {
                edges.push(Canon::Ride(i - 1, a));
            } else if a == RideArtic::Bow {
                edges.push(Canon::Cymbal(CymKind::Crash, 1, CymArtic::Hit));
            }
            edges
        }
    }
}

pub fn fallback(c: Canon) -> Vec<Canon> {
    let mut out: Vec<Canon> = Vec::new();
    let mut seen: std::collections::HashSet<Canon> = std::collections::HashSet::new();
    seen.insert(c);
    let mut queue: std::collections::VecDeque<Canon> = single_step(c).into();
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
mod tests {
    use super::*;

    #[test]
    fn key_round_trips_over_all() {
        for c in Canon::all() {
            let s = c.to_string();
            let back: Canon = s.parse().unwrap_or_else(|_| panic!("parse {s}"));
            assert_eq!(c, back, "round-trip {s}");
        }
    }

    #[test]
    fn key_examples_are_stable() {
        assert_eq!(Canon::Kick(KickKind::Main).to_string(), "kick.main");
        assert_eq!(
            Canon::Snare(1, SnareArtic::Sidestick).to_string(),
            "snare1.sidestick"
        );
        assert_eq!(
            Canon::Tom(TomPos::Rack(1), TomArtic::Hit).to_string(),
            "tom.rack1.hit"
        );
        assert_eq!(
            Canon::Hat(HatOpen::Closed, HatZone::Plain).to_string(),
            "hat.closed"
        );
        assert_eq!(
            Canon::Hat(HatOpen::Open(3), HatZone::Edge).to_string(),
            "hat.open3.edge"
        );
        assert_eq!(
            Canon::Cymbal(CymKind::Crash, 2, CymArtic::Mute).to_string(),
            "crash.2.mute"
        );
        assert_eq!(Canon::Ride(1, RideArtic::Bow).to_string(), "ride.1");
        assert_eq!(Canon::Ride(1, RideArtic::Bell).to_string(), "ride.1.bell");
        assert_eq!(Canon::Perc(PercKind::Cowbell).to_string(), "perc.cowbell");
        assert_eq!(
            "crash.2.mute".parse::<Canon>().unwrap(),
            Canon::Cymbal(CymKind::Crash, 2, CymArtic::Mute)
        );
        assert!("crash.9.hit".parse::<Canon>().is_err());
        assert!("bogus".parse::<Canon>().is_err());
    }

    #[test]
    fn serde_is_string_form() {
        let c = Canon::Cymbal(CymKind::China, 1, CymArtic::Hit);
        let j = serde_json::to_string(&c).unwrap();
        assert_eq!(j, "\"china.1.hit\"");
        let back: Canon = serde_json::from_str(&j).unwrap();
        assert_eq!(c, back);
    }

    #[test]
    fn every_variant_has_a_nonempty_label() {
        for c in Canon::all() {
            assert!(!c.label().is_empty(), "{c:?} has empty label");
        }
        assert_eq!(
            Canon::Hat(HatOpen::Open(1), HatZone::Plain).label(),
            "Hi-Hat Open 1"
        );
        assert_eq!(Canon::Snare(1, SnareArtic::Sidestick).label(), "Side Stick");
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
            vec![k("ride.1.bell"), k("ride.1"), k("crash.1.hit")]
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
        for c in Canon::all() {
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
}
