use serde::Deserialize;

use crate::non_blank::NonBlank;

/// How widely an engine's layout is known, most known first: the standard, a major engine,
/// any other. An engine without a hub is any other.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
pub enum Standing {
    Standard,
    Major,
    Other,
}

/// The standing a hub declares: the standard or a major engine, never any other.
#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
enum HubStanding {
    Standard,
    Major,
}

impl From<HubStanding> for Standing {
    fn from(standing: HubStanding) -> Self {
        match standing {
            HubStanding::Standard => Self::Standard,
            HubStanding::Major => Self::Major,
        }
    }
}

/// What makes an engine one of the site's hubs: its standing, its column label in the index
/// matrix, and its place among the hubs.
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct Hub {
    standing: HubStanding,
    column: NonBlank,
    order: u8,
}

impl Hub {
    pub(super) fn standing(&self) -> Standing {
        self.standing.into()
    }

    /// The label of the engine's column in the site's index matrix, such as `SD3`.
    pub fn column(&self) -> &str {
        self.column.as_str()
    }

    /// The hub's place among the hubs, lowest first.
    pub fn order(&self) -> u8 {
        self.order
    }
}
