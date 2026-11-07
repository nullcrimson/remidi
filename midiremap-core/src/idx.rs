use std::fmt;

use serde::Deserialize;

/// A 1-based position, always within `1..=MAX`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Deserialize)]
#[serde(try_from = "u8")]
pub(crate) struct Idx<const MAX: u8>(u8);

#[derive(thiserror::Error, Debug, PartialEq, Eq)]
#[error("{0} is not in 1..={1}")]
pub(crate) struct IdxRangeError(u8, u8);

impl<const MAX: u8> TryFrom<u8> for Idx<MAX> {
    type Error = IdxRangeError;

    fn try_from(n: u8) -> Result<Self, Self::Error> {
        Self::new(n).ok_or(IdxRangeError(n, MAX))
    }
}

impl<const MAX: u8> Idx<MAX> {
    pub(crate) const FIRST: Self = Self(1);
    pub(crate) const MAX: u8 = MAX;

    pub(crate) const fn new(n: u8) -> Option<Self> {
        if n >= 1 && n <= MAX {
            Some(Self(n))
        } else {
            None
        }
    }

    pub(crate) const fn get(self) -> u8 {
        self.0
    }

    /// The position counted from zero.
    pub(crate) const fn offset(self) -> u8 {
        self.0 - 1
    }

    /// How many positions lie between this one and `other`.
    pub(crate) const fn distance(self, other: Self) -> u8 {
        self.0.abs_diff(other.0)
    }

    /// Every position, ascending.
    pub(crate) fn all() -> impl Iterator<Item = Self> {
        (1..=MAX).map(Self)
    }
}

impl<const MAX: u8> fmt::Display for Idx<MAX> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idx_rejects_zero_and_past_max() {
        assert_eq!(Idx::<2>::new(0), None);
        assert_eq!(Idx::<2>::new(3), None);
    }

    #[test]
    fn idx_reads_from_a_number_in_range_only() {
        assert_eq!(Idx::<2>::try_from(2), Ok(Idx(2)));
        assert_eq!(Idx::<2>::try_from(3), Err(IdxRangeError(3, 2)));
    }

    #[test]
    fn distance_counts_positions_either_way() {
        assert_eq!(Idx::<6>(2).distance(Idx(5)), 3);
        assert_eq!(Idx::<6>(5).distance(Idx(2)), 3);
    }

    #[test]
    fn all_lists_one_to_max() {
        assert_eq!(Idx::<2>::all().map(Idx::get).collect::<Vec<_>>(), [1, 2]);
    }

    #[test]
    fn offset_counts_from_zero() {
        assert_eq!(Idx::<2>::all().map(Idx::offset).collect::<Vec<_>>(), [0, 1]);
    }
}
