use super::{Canon, CymSlot, HatOpen, PercKind, RackIdx, Slot, TomPos};

/// A part of the kit, as a DAW draws it beside a drum's row.
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
pub enum Piece {
    Kick,
    Snare,
    RackTom(RackIdx),
    FloorTom,
    HatClosed,
    HatOpen,
    HatPedal,
    Crash,
    Ride,
    /// A china, splash, stack or cymbal bell.
    OtherCymbal,
    Perc(PercKind),
    /// A hand or Latin percussion drum.
    Hand,
}

impl Canon {
    /// The part of the kit this drum is, whichever way it is played.
    pub fn piece(self) -> Piece {
        let hat = |open| match open {
            HatOpen::Tight | HatOpen::Closed | HatOpen::Loose | HatOpen::Cc => Piece::HatClosed,
            HatOpen::Open(_) => Piece::HatOpen,
            HatOpen::Pedal | HatOpen::PedalSplash => Piece::HatPedal,
        };
        match self.0 {
            Slot::Kick(_) => Piece::Kick,
            Slot::Snare(..) => Piece::Snare,
            Slot::Tom(TomPos::Rack(i), _) => Piece::RackTom(i),
            Slot::Tom(TomPos::Floor(_), _) => Piece::FloorTom,
            Slot::Hat(open, _) | Slot::Aux(_, open, _) => hat(open),
            Slot::Cymbal(CymSlot::Crash(_), _) => Piece::Crash,
            Slot::Cymbal(..) => Piece::OtherCymbal,
            Slot::Ride(..) => Piece::Ride,
            Slot::Perc(kind) => Piece::Perc(kind),
            Slot::Hand(..) => Piece::Hand,
        }
    }
}
