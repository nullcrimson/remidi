use std::fmt;

/// A 1-based position, always within `1..=MAX`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub(crate) struct Idx<const MAX: u8>(u8);

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
    fn all_lists_one_to_max() {
        assert_eq!(Idx::<2>::all().map(Idx::get).collect::<Vec<_>>(), [1, 2]);
    }

    #[test]
    fn offset_counts_from_zero() {
        assert_eq!(Idx::<2>::all().map(Idx::offset).collect::<Vec<_>>(), [0, 1]);
    }
}
