use super::{
    Canon, CymArtic, CymSlot, HatOpen, HatZone, KickKind, PercKind, RideArtic, RideIdx, SnareArtic,
    SnareIdx, TomArtic, TomPos,
};

impl CymSlot {
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
    /// The drum's name as people read it, such as `Crash 2 (Mute)`.
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::idx;

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
}
