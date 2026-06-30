use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Eq, PartialEq, Hash, Debug, Deserialize, Serialize)]
pub enum Canon {
    KickMain,
    KickAlt,
    SnareCenter,
    SnareRim,
    SnareSidestick,
    SnareFlam,
    SnareRuff,
    HatClosed,
    HatTight,
    HatOpen1,
    HatOpen2,
    HatOpen3,
    HatPedal,
    TomR1,
    TomR2,
    TomR3,
    TomF1,
    TomF2,
    TomF3,
    CrashMain,
    CrashWide,
    CrashChoke,
    Ride,
    RideBell,
    RideEdge,
    China,
    Splash,
    XHatClosed,
    XHatOpen,
    Stack,
}

pub fn fallbacks(c: Canon) -> &'static [Canon] {
    use Canon::*;
    match c {
        KickAlt => &[KickMain],
        SnareRuff => &[SnareFlam, SnareCenter],
        SnareFlam => &[SnareCenter],
        SnareRim => &[SnareCenter],
        HatTight => &[HatClosed],
        HatOpen1 => &[HatClosed],
        HatOpen2 => &[HatOpen1, HatClosed],
        HatOpen3 => &[HatOpen2, HatOpen1, HatClosed],
        CrashWide => &[CrashMain],
        RideBell => &[Ride],
        RideEdge => &[Ride],
        China => &[CrashMain],
        Splash => &[CrashMain],
        XHatClosed => &[HatClosed],
        XHatOpen => &[HatOpen1, HatClosed],
        Stack => &[CrashMain],
        _ => &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hat_open3_falls_back_toward_closed() {
        assert_eq!(
            fallbacks(Canon::HatOpen3),
            &[Canon::HatOpen2, Canon::HatOpen1, Canon::HatClosed]
        );
    }

    #[test]
    fn snare_ruff_falls_back_to_center() {
        assert_eq!(
            fallbacks(Canon::SnareRuff),
            &[Canon::SnareFlam, Canon::SnareCenter]
        );
    }

    #[test]
    fn kick_main_has_no_fallback() {
        assert!(fallbacks(Canon::KickMain).is_empty());
    }

    #[test]
    fn canon_deserializes_from_variant_name() {
        let c: Canon = serde_json::from_str("\"SnareCenter\"").unwrap();
        assert_eq!(c, Canon::SnareCenter);
    }
}
