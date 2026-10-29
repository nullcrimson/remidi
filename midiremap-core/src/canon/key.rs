use std::{collections::HashMap, fmt, str::FromStr, sync::LazyLock};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};

use super::{
    Canon, HandDrum, HandPart, HandStroke, HatOpen, HatZone, RideArtic, RideIdx, Slot, TomPos,
};

static BY_KEY: LazyLock<HashMap<String, Canon>> = LazyLock::new(|| {
    Canon::all()
        .iter()
        .map(|&c| (c.to_string(), c))
        .chain(RideIdx::all().map(|i| {
            (
                format!("ride.{i}.bow"),
                Canon(Slot::Ride(i, RideArtic::Bow)),
            )
        }))
        .collect()
});

fn hat_open_key(o: HatOpen) -> String {
    match o {
        HatOpen::Open(n) => format!("{}{n}", key(o)),
        HatOpen::Tight
        | HatOpen::Closed
        | HatOpen::Loose
        | HatOpen::Cc
        | HatOpen::Pedal
        | HatOpen::PedalSplash => key(o).to_owned(),
    }
}
fn hat_key(o: HatOpen, z: HatZone) -> String {
    dotted(hat_open_key(o), hat_zone_key(z))
}
fn dotted(stem: String, tail: Option<&str>) -> String {
    match tail {
        Some(tail) => format!("{stem}.{tail}"),
        None => stem,
    }
}
fn hat_zone_key(z: HatZone) -> Option<&'static str> {
    (z != HatZone::Plain).then(|| z.into())
}
fn ride_artic_key(a: RideArtic) -> Option<&'static str> {
    (a != RideArtic::Bow).then(|| a.into())
}
fn hand_part_key(p: HandPart) -> &'static str {
    match p {
        HandPart::Pitch(p) => p.into(),
        HandPart::Length(l) => l.into(),
    }
}
fn hand_key(d: HandDrum) -> String {
    let stroke = d.stroke();
    dotted(
        dotted(format!("perc.{}", key(d)), d.part().map(hand_part_key)),
        (stroke != HandStroke::Open).then(|| stroke.into()),
    )
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
        match self.0 {
            Slot::Kick(k) => write!(f, "kick.{}", key(k)),
            Slot::Snare(i, a) => write!(f, "snare{i}.{}", key(a)),
            Slot::Tom(p, a) => write!(f, "tom.{}.{}", tom_pos_key(p), key(a)),
            Slot::Hat(o, z) => write!(f, "hat.{}", hat_key(o, z)),
            Slot::Aux(i, o, z) => write!(f, "aux{i}.{}", hat_key(o, z)),
            Slot::Cymbal(s, a) => write!(f, "{}.{}.{}", key(s), s.index(), key(a)),
            Slot::Ride(i, a) => f.write_str(&dotted(format!("ride.{i}"), ride_artic_key(a))),
            Slot::Perc(k) => write!(f, "perc.{}", key(k)),
            Slot::Hand(d) => f.write_str(&hand_key(d)),
        }
    }
}

#[derive(thiserror::Error, Debug, PartialEq)]
#[error("invalid canon key: {0}")]
pub struct CanonParseError(String);

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
    use crate::canon::{
        idx, k, CongaPitch, CymArtic, CymSlot, HandLength, KickKind, PercKind, SnareArtic, TomArtic,
    };

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
        assert_eq!(Canon(Slot::Kick(KickKind::Main)).to_string(), "kick.main");
        assert_eq!(
            Canon(Slot::Snare(idx(1), SnareArtic::Sidestick)).to_string(),
            "snare1.sidestick"
        );
        assert_eq!(
            Canon(Slot::Tom(TomPos::Rack(idx(1)), TomArtic::Hit)).to_string(),
            "tom.rack1.hit"
        );
        assert_eq!(
            Canon(Slot::Hat(HatOpen::Closed, HatZone::Plain)).to_string(),
            "hat.closed"
        );
        assert_eq!(
            Canon(Slot::Hat(HatOpen::Open(idx(3)), HatZone::Edge)).to_string(),
            "hat.open3.edge"
        );
        assert_eq!(
            Canon(Slot::Cymbal(CymSlot::Crash(idx(2)), CymArtic::Mute)).to_string(),
            "crash.2.mute"
        );
        assert_eq!(
            Canon(Slot::Ride(idx(1), RideArtic::Bow)).to_string(),
            "ride.1"
        );
        assert_eq!(
            Canon(Slot::Ride(idx(1), RideArtic::Bell)).to_string(),
            "ride.1.bell"
        );
        assert_eq!(
            Canon(Slot::Perc(PercKind::Cowbell)).to_string(),
            "perc.cowbell"
        );
    }

    #[test]
    fn a_latin_drum_prints_as_its_dotted_key() {
        assert_eq!(
            Canon(Slot::Hand(HandDrum::Conga(CongaPitch::High(
                HandStroke::Mute
            ))))
            .to_string(),
            "perc.conga.high.mute"
        );
        assert_eq!(
            Canon(Slot::Hand(HandDrum::Whistle(HandLength::Short))).to_string(),
            "perc.whistle.short"
        );
        assert_eq!(
            Canon(Slot::Hand(HandDrum::Claves)).to_string(),
            "perc.claves"
        );
    }

    #[test]
    fn a_canon_serializes_as_its_key() {
        let c = Canon(Slot::Cymbal(CymSlot::China(idx(1)), CymArtic::Hit));
        assert_eq!(serde_json::to_string(&c).unwrap(), "\"china.1.hit\"");
    }

    #[test]
    fn a_canon_deserializes_from_its_key() {
        let c = Canon(Slot::Cymbal(CymSlot::China(idx(1)), CymArtic::Hit));
        assert_eq!(serde_json::from_str::<Canon>("\"china.1.hit\"").unwrap(), c);
    }

    #[test]
    fn parse_accepts_ride_bow_alias_only_as_ride() {
        assert_eq!(k("ride.1.bow"), k("ride.1"));
        assert_eq!(k("ride.2.bow"), Canon(Slot::Ride(idx(2), RideArtic::Bow)));
    }

    fn assert_rejected(bad: &str) {
        assert!(bad.parse::<Canon>().is_err(), "{bad:?} must be rejected");
    }

    #[test]
    fn parse_rejects_a_crash_beyond_the_last_one() {
        assert_rejected("crash.7.hit");
    }

    #[test]
    fn parse_rejects_a_china_beyond_the_last_one() {
        assert_rejected("china.4.hit");
    }

    #[test]
    fn parse_rejects_a_splash_beyond_the_last_one() {
        assert_rejected("splash.4.hit");
    }

    #[test]
    fn parse_rejects_a_stack_beyond_the_last_one() {
        assert_rejected("stack.5.hit");
    }

    #[test]
    fn parse_rejects_a_bell_beyond_the_last_one() {
        assert_rejected("bell.3.hit");
    }

    #[test]
    fn parse_rejects_a_snare_beyond_the_last_one() {
        assert_rejected("snare3.hit");
    }

    #[test]
    fn parse_rejects_snare_zero() {
        assert_rejected("snare0.hit");
    }

    #[test]
    fn parse_rejects_an_aux_hat_beyond_the_last_one() {
        assert_rejected("aux3.closed");
    }

    #[test]
    fn parse_rejects_a_hat_open_level_beyond_the_last_one() {
        assert_rejected("hat.open7");
    }

    #[test]
    fn parse_rejects_hat_open_level_zero() {
        assert_rejected("hat.open0");
    }

    #[test]
    fn parse_rejects_a_closed_hat_with_an_explicit_plain_zone() {
        assert_rejected("hat.closed.plain");
    }

    #[test]
    fn parse_rejects_a_rack_tom_beyond_the_last_one() {
        assert_rejected("tom.rack9.hit");
    }

    #[test]
    fn parse_rejects_a_floor_tom_beyond_the_last_one() {
        assert_rejected("tom.floor5.hit");
    }

    #[test]
    fn parse_rejects_a_ride_beyond_the_last_one() {
        assert_rejected("ride.3");
    }

    #[test]
    fn parse_rejects_ride_zero() {
        assert_rejected("ride.0.bell");
    }

    #[test]
    fn parse_rejects_a_kick_with_an_articulation() {
        assert_rejected("kick.main.hit");
    }

    #[test]
    fn parse_rejects_a_mute_on_a_drum_without_one() {
        assert_rejected("perc.bongo.high.mute");
        assert_rejected("perc.conga.low.mute");
    }

    #[test]
    fn parse_rejects_an_explicit_open_stroke() {
        assert_rejected("perc.triangle.open");
    }

    #[test]
    fn parse_rejects_a_pitched_drum_without_its_pitch() {
        assert_rejected("perc.bongo");
    }

    #[test]
    fn parse_rejects_the_empty_key() {
        assert_rejected("");
    }
}
