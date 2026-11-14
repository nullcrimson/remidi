#![deny(clippy::wildcard_enum_match_arm)]

use std::fmt;

use super::{
    Canon, CongaPitch, CymArtic, CymSlot, HandDrum, HandStroke, HatOpen, HatZone, KickKind,
    OpenLevel, PercKind, RideArtic, Slot, SnareArtic, TomArtic,
};

/// A kind of drum a stand-in may be, with cymbals told apart by type.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub(crate) enum DrumKind {
    Kick,
    Snare,
    Tom,
    Hat,
    Aux,
    Ride,
    Perc,
    Hand,
    Crash,
    China,
    Splash,
    Stack,
    Bell,
}

impl From<Canon> for DrumKind {
    fn from(c: Canon) -> Self {
        match c.0 {
            Slot::Kick(_) => Self::Kick,
            Slot::Snare(..) => Self::Snare,
            Slot::Tom(..) => Self::Tom,
            Slot::Hat(..) => Self::Hat,
            Slot::Aux(..) => Self::Aux,
            Slot::Ride(..) => Self::Ride,
            Slot::Perc(_) => Self::Perc,
            Slot::Hand(_) => Self::Hand,
            Slot::Cymbal(CymSlot::Crash(_), _) => Self::Crash,
            Slot::Cymbal(CymSlot::China(_), _) => Self::China,
            Slot::Cymbal(CymSlot::Splash(_), _) => Self::Splash,
            Slot::Cymbal(CymSlot::Stack(_), _) => Self::Stack,
            Slot::Cymbal(CymSlot::Bell(_), _) => Self::Bell,
        }
    }
}

impl fmt::Display for DrumKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{self:?}")
    }
}

/// Why a drum may go silent on a kit without it, as the owner agreed.
#[derive(Copy, Clone, Debug)]
pub(crate) enum DropReason {
    RimOrSidestick,
    TomRim,
    PedalHat,
    Percussion,
    OpenHandDrum,
}

impl fmt::Display for DropReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::RimOrSidestick => "a rim or sidestick stands in only for the other",
            Self::TomRim => "a tom rim has no stand-in",
            Self::PedalHat => "a pedal hat stands in only for a pedal splash",
            Self::Percussion => "percussion has no stand-in",
            Self::OpenHandDrum => "an open hand drum has no stand-in",
        })
    }
}

/// When a drum must play: on any kit that plays one of the anchors, or never required.
#[derive(Clone, Debug)]
pub(crate) enum Anchor {
    Any(Vec<Canon>),
    MayDrop(DropReason),
}

/// The agreed rules for one canon.
pub(crate) struct Rules {
    /// The strokes of the same drum that stand in for it, in order.
    pub(crate) own_strokes: Vec<Canon>,
    /// The other kinds of drum a stand-in may be, most preferred first.
    pub(crate) lands_on: Vec<DrumKind>,
    /// When it must play.
    pub(crate) anchor: Anchor,
}

pub(crate) fn rules(c: Canon) -> Rules {
    Rules {
        own_strokes: own_strokes(c),
        lands_on: lands_on(c),
        anchor: anchor(c),
    }
}

fn kick_order(k: KickKind) -> Vec<KickKind> {
    match k {
        KickKind::Main => vec![KickKind::Alt, KickKind::Left],
        KickKind::Alt => vec![KickKind::Main, KickKind::Left],
        KickKind::Left => vec![KickKind::Main, KickKind::Alt],
    }
}

fn snare_order(a: SnareArtic) -> Vec<SnareArtic> {
    match a {
        SnareArtic::Hit => vec![SnareArtic::Side],
        SnareArtic::Side
        | SnareArtic::Rimshot
        | SnareArtic::Flam
        | SnareArtic::Off
        | SnareArtic::Ghost => vec![SnareArtic::Hit],
        SnareArtic::Rim => vec![SnareArtic::Sidestick],
        SnareArtic::Sidestick => vec![SnareArtic::Rim],
        SnareArtic::Ruff => vec![SnareArtic::Flam, SnareArtic::Hit],
    }
}

fn tom_order(a: TomArtic) -> Vec<TomArtic> {
    match a {
        TomArtic::Rimshot => vec![TomArtic::Hit],
        TomArtic::Hit | TomArtic::Rim => Vec::new(),
    }
}

fn ride_order(a: RideArtic) -> Vec<RideArtic> {
    match a {
        RideArtic::Bow => vec![RideArtic::BowTip],
        RideArtic::BowTip => vec![RideArtic::Bow],
        RideArtic::Bell => vec![RideArtic::BellTip],
        RideArtic::BellTip => vec![RideArtic::Bell],
        RideArtic::Mute => vec![RideArtic::Bow, RideArtic::BowTip],
        RideArtic::Edge => Vec::new(),
    }
}

fn cymbal_order(a: CymArtic) -> Vec<CymArtic> {
    match a {
        CymArtic::Hit => vec![CymArtic::Edge],
        CymArtic::Edge => vec![CymArtic::Hit],
        CymArtic::Bow => vec![CymArtic::BowTip, CymArtic::Hit, CymArtic::Edge],
        CymArtic::BowTip => vec![CymArtic::Bow, CymArtic::Hit, CymArtic::Edge],
        CymArtic::Bell => vec![CymArtic::BellTip],
        CymArtic::BellTip => vec![CymArtic::Bell],
        CymArtic::Mute => vec![CymArtic::Hit, CymArtic::Edge],
    }
}

fn hand_order(d: HandDrum) -> Vec<HandDrum> {
    match d {
        HandDrum::Conga(CongaPitch::High(HandStroke::Mute)) => {
            vec![HandDrum::Conga(CongaPitch::High(HandStroke::Open))]
        }
        HandDrum::Cuica(HandStroke::Mute) => vec![HandDrum::Cuica(HandStroke::Open)],
        HandDrum::Triangle(HandStroke::Mute) => vec![HandDrum::Triangle(HandStroke::Open)],
        HandDrum::Conga(CongaPitch::High(HandStroke::Open) | CongaPitch::Low)
        | HandDrum::Cuica(HandStroke::Open)
        | HandDrum::Triangle(HandStroke::Open)
        | HandDrum::Bongo(_)
        | HandDrum::Timbale(_)
        | HandDrum::Agogo(_)
        | HandDrum::Whistle(_)
        | HandDrum::Guiro(_)
        | HandDrum::Claves
        | HandDrum::Woodblock(_) => Vec::new(),
    }
}

/// The open openings from least to most open: loose, then each open level.
fn open_sequence() -> Vec<HatOpen> {
    std::iter::once(HatOpen::Loose)
        .chain(OpenLevel::all().map(HatOpen::Open))
        .collect()
}

fn sounds_open(o: HatOpen) -> bool {
    match o {
        HatOpen::Loose | HatOpen::Open(_) | HatOpen::PedalSplash => true,
        HatOpen::Tight | HatOpen::Closed | HatOpen::Cc | HatOpen::Pedal => false,
    }
}

/// The zones a hit in `zone` may play in, its own first.
fn zones_for(zone: HatZone, opening: HatOpen) -> Vec<HatZone> {
    match zone {
        HatZone::Plain if sounds_open(opening) => vec![HatZone::Plain, HatZone::Edge, HatZone::Tip],
        HatZone::Plain => vec![HatZone::Plain, HatZone::Tip, HatZone::Edge],
        HatZone::Tip => vec![HatZone::Tip, HatZone::Plain, HatZone::Edge],
        HatZone::Edge => vec![HatZone::Edge, HatZone::Plain, HatZone::Tip],
        HatZone::Bell => vec![HatZone::Bell, HatZone::Edge, HatZone::Tip, HatZone::Plain],
    }
}

/// The other open openings, nearest to `o` first, the less open first on a tie.
fn open_neighbours(o: HatOpen) -> Vec<HatOpen> {
    let sequence = open_sequence();
    let at = sequence
        .iter()
        .position(|&s| s == o)
        .expect("loose and every open level are in the open sequence");
    let mut others: Vec<(usize, HatOpen)> = sequence
        .into_iter()
        .enumerate()
        .filter(|&(i, _)| i != at)
        .collect();
    others.sort_by_key(|&(i, _)| (i.abs_diff(at), i));
    others.into_iter().map(|(_, s)| s).collect()
}

/// The other openings that stand in for `o`, nearest first.
fn openings_after(o: HatOpen) -> Vec<HatOpen> {
    match o {
        HatOpen::Tight => vec![HatOpen::Closed, HatOpen::Cc],
        HatOpen::Closed => vec![HatOpen::Tight, HatOpen::Cc],
        HatOpen::Cc => vec![HatOpen::Closed, HatOpen::Tight],
        HatOpen::Pedal => Vec::new(),
        HatOpen::PedalSplash => vec![HatOpen::Pedal],
        HatOpen::Loose | HatOpen::Open(_) => open_neighbours(o),
    }
}

fn hat_strokes(o: HatOpen, z: HatZone) -> Vec<(HatOpen, HatZone)> {
    let own = zones_for(z, o).into_iter().skip(1).map(|zone| (o, zone));
    let others = openings_after(o)
        .into_iter()
        .flat_map(|to| zones_for(z, to).into_iter().map(move |zone| (to, zone)));
    own.chain(others).collect()
}

fn own_strokes(c: Canon) -> Vec<Canon> {
    match c.0 {
        Slot::Kick(k) => kick_order(k)
            .into_iter()
            .map(|k| Canon(Slot::Kick(k)))
            .collect(),
        Slot::Snare(i, a) => snare_order(a)
            .into_iter()
            .map(|a| Canon(Slot::Snare(i, a)))
            .collect(),
        Slot::Tom(p, a) => tom_order(a)
            .into_iter()
            .map(|a| Canon(Slot::Tom(p, a)))
            .collect(),
        Slot::Hat(o, z) => hat_strokes(o, z)
            .into_iter()
            .map(|(o, z)| Canon(Slot::Hat(o, z)))
            .collect(),
        Slot::Aux(i, o, z) => hat_strokes(o, z)
            .into_iter()
            .map(|(o, z)| Canon(Slot::Aux(i, o, z)))
            .collect(),
        Slot::Cymbal(s, a) => cymbal_order(a)
            .into_iter()
            .map(|a| Canon(Slot::Cymbal(s, a)))
            .collect(),
        Slot::Ride(i, a) => ride_order(a)
            .into_iter()
            .map(|a| Canon(Slot::Ride(i, a)))
            .collect(),
        Slot::Perc(_) => Vec::new(),
        Slot::Hand(d) => hand_order(d)
            .into_iter()
            .map(|d| Canon(Slot::Hand(d)))
            .collect(),
    }
}

fn is_bell(a: CymArtic) -> bool {
    match a {
        CymArtic::Bell | CymArtic::BellTip => true,
        CymArtic::Hit | CymArtic::Mute | CymArtic::Bow | CymArtic::BowTip | CymArtic::Edge => false,
    }
}

fn cymbal_kind(s: CymSlot) -> DrumKind {
    DrumKind::from(Canon(Slot::Cymbal(s, CymArtic::Hit)))
}

fn lands_on(c: Canon) -> Vec<DrumKind> {
    use DrumKind::{Crash, Hat, Ride, Snare, Tom};
    match c.0 {
        Slot::Kick(_) | Slot::Hat(..) | Slot::Perc(_) | Slot::Hand(_) => Vec::new(),
        Slot::Snare(..) => vec![Snare],
        Slot::Tom(..) => vec![Tom],
        Slot::Aux(..) => vec![Hat],
        Slot::Ride(_, RideArtic::Edge) => vec![Ride, Crash],
        Slot::Ride(..) => vec![Ride],
        Slot::Cymbal(s, a) => {
            let own = cymbal_kind(s);
            let bell = is_bell(a);
            match s {
                CymSlot::Crash(_) if bell => vec![Crash, Ride],
                CymSlot::Crash(_) => vec![Crash],
                CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) if bell => {
                    vec![own, Crash, Ride]
                }
                CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) => vec![own, Crash],
                CymSlot::Bell(_) => vec![own, Ride],
            }
        }
    }
}

fn all_where(keep: impl Fn(Slot) -> bool) -> Vec<Canon> {
    Canon::all().iter().copied().filter(|c| keep(c.0)).collect()
}

fn crash_hits() -> Vec<Canon> {
    all_where(|s| matches!(s, Slot::Cymbal(CymSlot::Crash(_), CymArtic::Hit)))
}

fn ride_bells() -> Vec<Canon> {
    all_where(|s| matches!(s, Slot::Ride(_, RideArtic::Bell | RideArtic::BellTip)))
}

/// The hi-hat strokes a hit at `(o, z)` may land on, its own first.
fn hat_landings(o: HatOpen, z: HatZone) -> Vec<(HatOpen, HatZone)> {
    std::iter::once((o, z)).chain(hat_strokes(o, z)).collect()
}

/// The anchor of a hi-hat stroke at `(o, z)`, each landing played as the canons `on` names.
fn hat_anchor<I: IntoIterator<Item = Canon>>(
    o: HatOpen,
    z: HatZone,
    on: impl Fn(HatOpen, HatZone) -> I,
) -> Anchor {
    match o {
        HatOpen::Pedal => Anchor::MayDrop(DropReason::PedalHat),
        HatOpen::Tight
        | HatOpen::Closed
        | HatOpen::Loose
        | HatOpen::Open(_)
        | HatOpen::Cc
        | HatOpen::PedalSplash => Anchor::Any(
            hat_landings(o, z)
                .into_iter()
                .flat_map(|(o, z)| on(o, z))
                .collect(),
        ),
    }
}

fn anchor(c: Canon) -> Anchor {
    let any = Anchor::Any;
    match c.0 {
        Slot::Kick(_) => any(all_where(|s| matches!(s, Slot::Kick(_)))),
        Slot::Snare(_, a) => match a {
            SnareArtic::Rim | SnareArtic::Sidestick => Anchor::MayDrop(DropReason::RimOrSidestick),
            SnareArtic::Hit
            | SnareArtic::Ghost
            | SnareArtic::Rimshot
            | SnareArtic::Flam
            | SnareArtic::Ruff
            | SnareArtic::Off
            | SnareArtic::Side => any(all_where(|s| matches!(s, Slot::Snare(_, SnareArtic::Hit)))),
        },
        Slot::Tom(_, a) => match a {
            TomArtic::Rim => Anchor::MayDrop(DropReason::TomRim),
            TomArtic::Hit | TomArtic::Rimshot => {
                any(all_where(|s| matches!(s, Slot::Tom(_, TomArtic::Hit))))
            }
        },
        Slot::Hat(o, z) => hat_anchor(o, z, |o, z| [Canon(Slot::Hat(o, z))]),
        Slot::Aux(i, o, z) => hat_anchor(o, z, |o, z| {
            [Canon(Slot::Aux(i, o, z)), Canon(Slot::Hat(o, z))]
        }),
        Slot::Cymbal(s, a) => match s {
            CymSlot::Bell(_) => any(ride_bells()),
            CymSlot::Crash(_) | CymSlot::China(_) | CymSlot::Splash(_) | CymSlot::Stack(_) => {
                if is_bell(a) {
                    any(ride_bells())
                } else {
                    any(crash_hits())
                }
            }
        },
        Slot::Ride(_, a) => match a {
            RideArtic::Bow | RideArtic::BowTip | RideArtic::Mute => any(all_where(|s| {
                matches!(s, Slot::Ride(_, RideArtic::Bow | RideArtic::BowTip))
            })),
            RideArtic::Bell | RideArtic::BellTip => any(ride_bells()),
            RideArtic::Edge => {
                let mut anchors = all_where(|s| matches!(s, Slot::Ride(_, RideArtic::Edge)));
                anchors.extend(crash_hits());
                any(anchors)
            }
        },
        Slot::Perc(_) => Anchor::MayDrop(DropReason::Percussion),
        Slot::Hand(d) => match hand_order(d).first() {
            Some(&open) => any(vec![Canon(Slot::Hand(open))]),
            None => Anchor::MayDrop(DropReason::OpenHandDrum),
        },
    }
}

/// What a stroke does, whichever drum plays it: two drums with the same stroke can stand in
/// for each other where their kinds allow it.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
enum Stroke {
    Kick,
    Snare(SnareArtic),
    Tom(TomArtic),
    Hat(HatOpen, HatZone),
    Cymbal(CymArtic),
    Bell,
    BellTip,
    Ride(RideArtic),
    Perc(PercKind),
    Hand(HandDrum),
}

fn stroke(c: Canon) -> Stroke {
    match c.0 {
        Slot::Kick(_) => Stroke::Kick,
        Slot::Snare(_, a) => Stroke::Snare(a),
        Slot::Tom(_, a) => Stroke::Tom(a),
        Slot::Hat(o, z) | Slot::Aux(_, o, z) => Stroke::Hat(o, z),
        Slot::Cymbal(CymSlot::Bell(_), CymArtic::Hit) => Stroke::Bell,
        Slot::Cymbal(_, CymArtic::Bell) | Slot::Ride(_, RideArtic::Bell) => Stroke::Bell,
        Slot::Cymbal(_, CymArtic::BellTip) | Slot::Ride(_, RideArtic::BellTip) => Stroke::BellTip,
        Slot::Ride(_, RideArtic::Edge) => Stroke::Cymbal(CymArtic::Hit),
        Slot::Cymbal(
            _,
            a
            @ (CymArtic::Hit | CymArtic::Edge | CymArtic::Bow | CymArtic::BowTip | CymArtic::Mute),
        ) => Stroke::Cymbal(a),
        Slot::Ride(_, a @ (RideArtic::Bow | RideArtic::BowTip | RideArtic::Mute)) => {
            Stroke::Ride(a)
        }
        Slot::Perc(p) => Stroke::Perc(p),
        Slot::Hand(d) => Stroke::Hand(d),
    }
}

/// Whether `d` plays the same stroke as `c` on a drum `c`'s rules let it stand in on, and
/// how preferred that kind is (0 is `c`'s own kind).
pub(crate) fn stand_in_rank(c: Canon, d: Canon) -> Option<usize> {
    kind_rank(c, d).filter(|_| stroke(c) == stroke(d))
}

/// How preferred the kind of `landed` is as a stand-in for `c` (0 is `c`'s own kind), whatever
/// its stroke.
pub(crate) fn kind_rank(c: Canon, landed: Canon) -> Option<usize> {
    let own = DrumKind::from(c);
    let kind = DrumKind::from(landed);
    if kind == own {
        return Some(0);
    }
    rules(c)
        .lands_on
        .iter()
        .filter(|&&k| k != own)
        .position(|&k| k == kind)
        .map(|p| p + 1)
}

fn keys(cs: &[Canon]) -> String {
    cs.iter()
        .map(Canon::to_string)
        .collect::<Vec<_>>()
        .join(" ")
}

/// One line per canon with its rules, the golden snapshot's text.
pub(crate) fn snapshot() -> String {
    Canon::all()
        .iter()
        .map(|&c| {
            let r = rules(c);
            let lands: Vec<String> = r.lands_on.iter().map(DrumKind::to_string).collect();
            let anchor = match &r.anchor {
                Anchor::Any(cs) => format!("plays when the kit has any of: {}", keys(cs)),
                Anchor::MayDrop(why) => format!("may drop: {why}"),
            };
            format!(
                "{c} | own: {} | lands on: {} | {anchor}\n",
                keys(&r.own_strokes),
                lands.join(" ")
            )
        })
        .collect()
}
