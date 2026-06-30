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

/// Resolves the ordered, nearest-first list of alternative canonical slots to
/// try when a target engine cannot play a given slot directly.
///
/// INVARIANT: the resolver walk (see [`crate::translate::Translator`]) is
/// **non-recursive** — it tries each slot in the returned chain exactly once and
/// does not then expand that slot's own chain. Therefore every chain must list
/// the FULL transitive closure of usable alternatives, nearest first, and the
/// last element of any non-empty chain must itself have an empty chain. The
/// `chains_terminate` test guards this.
pub trait FallbackResolver {
    fn chain(&self, canon: Canon) -> &[Canon];
}

/// The curated default fallback chains.
pub struct DefaultFallbacks;

impl FallbackResolver for DefaultFallbacks {
    fn chain(&self, canon: Canon) -> &[Canon] {
        default_chain(canon)
    }
}

fn default_chain(c: Canon) -> &'static [Canon] {
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
        CrashChoke => &[CrashMain],
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

    /// Every canonical variant — kept in sync with the enum so the closure
    /// guard below can sweep them all.
    const ALL: &[Canon] = &[
        Canon::KickMain,
        Canon::KickAlt,
        Canon::SnareCenter,
        Canon::SnareRim,
        Canon::SnareSidestick,
        Canon::SnareFlam,
        Canon::SnareRuff,
        Canon::HatClosed,
        Canon::HatTight,
        Canon::HatOpen1,
        Canon::HatOpen2,
        Canon::HatOpen3,
        Canon::HatPedal,
        Canon::TomR1,
        Canon::TomR2,
        Canon::TomR3,
        Canon::TomF1,
        Canon::TomF2,
        Canon::TomF3,
        Canon::CrashMain,
        Canon::CrashWide,
        Canon::CrashChoke,
        Canon::Ride,
        Canon::RideBell,
        Canon::RideEdge,
        Canon::China,
        Canon::Splash,
        Canon::XHatClosed,
        Canon::XHatOpen,
        Canon::Stack,
    ];

    #[test]
    fn hat_open3_falls_back_toward_closed() {
        assert_eq!(
            DefaultFallbacks.chain(Canon::HatOpen3),
            &[Canon::HatOpen2, Canon::HatOpen1, Canon::HatClosed]
        );
    }

    #[test]
    fn snare_ruff_falls_back_to_center() {
        assert_eq!(
            DefaultFallbacks.chain(Canon::SnareRuff),
            &[Canon::SnareFlam, Canon::SnareCenter]
        );
    }

    #[test]
    fn crash_choke_falls_back_to_main() {
        assert_eq!(
            DefaultFallbacks.chain(Canon::CrashChoke),
            &[Canon::CrashMain]
        );
    }

    #[test]
    fn kick_main_has_no_fallback() {
        assert!(DefaultFallbacks.chain(Canon::KickMain).is_empty());
    }

    #[test]
    fn canon_deserializes_from_variant_name() {
        let c: Canon = serde_json::from_str("\"SnareCenter\"").unwrap();
        assert_eq!(c, Canon::SnareCenter);
    }

    /// Closure/termination guard: because the walk is non-recursive, the last
    /// element of any chain must itself have an empty chain.
    #[test]
    fn chains_terminate() {
        let r = DefaultFallbacks;
        for &c in ALL {
            let chain = r.chain(c);
            if let Some(&last) = chain.last() {
                assert!(
                    r.chain(last).is_empty(),
                    "chain for {c:?} ends at {last:?}, which itself has a non-empty chain"
                );
            }
        }
    }
}
