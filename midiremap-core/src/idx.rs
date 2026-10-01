use std::fmt;

/// A 1-based position, always within `1..=MAX`.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub struct Idx<const MAX: u8>(u8);

impl<const MAX: u8> Idx<MAX> {
    pub const FIRST: Self = Self(1);
    pub const MAX: u8 = MAX;

    pub const fn new(n: u8) -> Option<Self> {
        if n >= 1 && n <= MAX {
            Some(Self(n))
        } else {
            None
        }
    }

    pub const fn get(self) -> u8 {
        self.0
    }

    /// Every position, ascending.
    pub fn all() -> impl Iterator<Item = Self> {
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
    fn idx_holds_only_one_to_max() {
        assert_eq!(Idx::<2>::new(0), None);
        assert_eq!(Idx::<2>::new(3), None);
        assert_eq!(Idx::<2>::all().map(Idx::get).collect::<Vec<_>>(), [1, 2]);
    }
}
