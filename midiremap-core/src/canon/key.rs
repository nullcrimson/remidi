use std::{collections::HashMap, fmt, str::FromStr, sync::LazyLock};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use super::{Canon, HatOpen, HatZone, RideArtic, RideIdx, TomPos, ALL};

static BY_KEY: LazyLock<HashMap<String, Canon>> = LazyLock::new(|| {
    ALL.iter()
        .map(|&c| (c.to_string(), c))
        .chain(RideIdx::all().map(|i| (format!("ride.{i}.bow"), Canon::Ride(i, RideArtic::Bow))))
        .collect()
});

fn hat_open_key(o: HatOpen) -> String {
    match o {
        HatOpen::Open(n) => format!("{}{n}", key(o)),
        _ => key(o).to_owned(),
    }
}
fn hat_zone_key(z: HatZone) -> Option<&'static str> {
    (z != HatZone::Plain).then(|| z.into())
}
fn ride_artic_key(a: RideArtic) -> Option<&'static str> {
    (a != RideArtic::Bow).then(|| a.into())
}
fn key(part: impl Into<&'static str>) -> &'static str {
    part.into()
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
            Canon::Kick(k) => write!(f, "kick.{}", key(k)),
            Canon::Snare(i, a) => write!(f, "snare{i}.{}", key(a)),
            Canon::Tom(p, a) => write!(f, "tom.{}.{}", tom_pos_key(p), key(a)),
            Canon::Hat(o, z) => match hat_zone_key(z) {
                Some(zs) => write!(f, "hat.{}.{zs}", hat_open_key(o)),
                None => write!(f, "hat.{}", hat_open_key(o)),
            },
            Canon::Aux(i, o, z) => match hat_zone_key(z) {
                Some(zs) => write!(f, "aux{i}.{}.{zs}", hat_open_key(o)),
                None => write!(f, "aux{i}.{}", hat_open_key(o)),
            },
            Canon::Cymbal(s, a) => write!(f, "{}.{}.{}", key(s), s.index(), key(a)),
            Canon::Ride(i, a) => match ride_artic_key(a) {
                Some(as_) => write!(f, "ride.{i}.{as_}"),
                None => write!(f, "ride.{i}"),
            },
            Canon::Perc(k) => write!(f, "perc.{}", key(k)),
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
        s.collect_str(self)
    }
}
impl<'de> Deserialize<'de> for Canon {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let s = String::deserialize(d)?;
        s.parse().map_err(de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::{idx, CymArtic, CymSlot, KickKind, PercKind, SnareArtic, TomArtic};

    fn k(s: &str) -> Canon {
        s.parse().unwrap()
    }

    #[test]
    fn key_round_trips_over_all() {
        for &c in Canon::all() {
            let s = c.to_string();
            let back: Canon = s.parse().unwrap_or_else(|_| panic!("parse {s}"));
            assert_eq!(c, back, "round-trip {s}");
        }
    }

    #[test]
    fn a_drum_prints_as_its_stable_key() {
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
