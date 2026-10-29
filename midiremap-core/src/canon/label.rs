use super::{
    Canon, CymArtic, CymSlot, HandDrum, HandLength, HandPart, HandPitch, HandStroke, HatOpen,
    HatZone, Idx, KickKind, PercKind, RideArtic, Slot, SnareArtic, TomArtic, TomPos,
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

impl HandPart {
    fn label(self) -> &'static str {
        match self {
            Self::Pitch(HandPitch::High) => "High",
            Self::Pitch(HandPitch::Low) => "Low",
            Self::Length(HandLength::Short) => "Short",
            Self::Length(HandLength::Long) => "Long",
        }
    }
}

impl HandDrum {
    fn name(self) -> &'static str {
        match self {
            Self::Bongo(_) => "Bongo",
            Self::Conga(_) => "Conga",
            Self::Timbale(_) => "Timbale",
            Self::Agogo(_) => "Agogo",
            Self::Whistle(_) => "Whistle",
            Self::Guiro(_) => "Guiro",
            Self::Claves => "Claves",
            Self::Woodblock(_) => "Wood Block",
            Self::Cuica(_) => "Cuica",
            Self::Triangle(_) => "Triangle",
        }
    }

    fn label(self) -> String {
        let named = match self.part() {
            Some(part) => format!("{} {}", self.name(), part.label()),
            None => self.name().to_owned(),
        };
        match self.stroke() {
            HandStroke::Open => named,
            HandStroke::Mute => format!("{named} (Mute)"),
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

/// `name` for the first of its kind, `name` and its position for the others.
fn numbered<const MAX: u8>(name: &str, i: Idx<MAX>) -> String {
    if i == Idx::FIRST {
        name.to_owned()
    } else {
        format!("{name} {i}")
    }
}

impl Canon {
    /// The drum's name as people read it, such as `Crash 2 (Mute)`.
    pub fn label(self) -> String {
        match self.0 {
            Slot::Kick(KickKind::Main) => "Kick".into(),
            Slot::Kick(KickKind::Alt) => "Kick (Alt)".into(),
            Slot::Kick(KickKind::Left) => "Kick (Left)".into(),
            Slot::Snare(i, a) => {
                let base = numbered("Snare", i);
                match a {
                    SnareArtic::Hit => base,
                    SnareArtic::Ghost => format!("{base} Ghost Note"),
                    SnareArtic::Rim => format!("{base} Rim"),
                    SnareArtic::Rimshot => format!("{base} Rimshot"),
                    SnareArtic::Sidestick => "Side Stick".into(),
                    SnareArtic::Flam => format!("{base} Flam"),
                    SnareArtic::Ruff => format!("{base} Ruff"),
                    SnareArtic::Off => format!("{base} (Off)"),
                    SnareArtic::Side => format!("{base} (Side)"),
                }
            }
            Slot::Tom(p, a) => {
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
            Slot::Hat(o, z) => hat_label("Hi-Hat", o, z),
            Slot::Aux(i, o, z) => hat_label(&format!("Aux Hat {i}"), o, z),
            Slot::Cymbal(s, a) => {
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
            Slot::Ride(i, a) => {
                let base = numbered("Ride", i);
                match a {
                    RideArtic::Bow => base,
                    RideArtic::Bell => format!("{base} Bell"),
                    RideArtic::BellTip => format!("{base} Bell Tip"),
                    RideArtic::BowTip => format!("{base} Bow Tip"),
                    RideArtic::Edge => format!("{base} Edge"),
                    RideArtic::Mute => format!("{base} (Mute)"),
                }
            }
            Slot::Perc(k) => match k {
                PercKind::Cowbell => "Cowbell",
                PercKind::Clap => "Clap",
                PercKind::Shaker => "Shaker",
                PercKind::Sticks => "Sticks",
                PercKind::Tambourine => "Tambourine",
                PercKind::Vibraslap => "Vibraslap",
                PercKind::Misc => "Percussion",
            }
            .into(),
            Slot::Hand(d) => d.label(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canon::{idx, k, Slot};

    #[test]
    fn an_open_hat_is_labelled_with_its_level() {
        assert_eq!(
            Canon(Slot::Hat(HatOpen::Open(idx(1)), HatZone::Plain)).label(),
            "Hi-Hat Open 1"
        );
    }

    #[test]
    fn a_sidestick_is_labelled_side_stick() {
        assert_eq!(
            Canon(Slot::Snare(idx(1), SnareArtic::Sidestick)).label(),
            "Side Stick"
        );
    }

    #[test]
    fn a_ghost_note_reads_as_a_ghost_note() {
        assert_eq!(k("snare1.ghost").label(), "Snare Ghost Note");
        assert_eq!(k("snare2.ghost").label(), "Snare 2 Ghost Note");
    }

    #[test]
    fn latin_percussion_reads_drum_first() {
        assert_eq!(k("perc.conga.high.mute").label(), "Conga High (Mute)");
        assert_eq!(k("perc.woodblock.low").label(), "Wood Block Low");
        assert_eq!(k("perc.triangle").label(), "Triangle");
    }
}
