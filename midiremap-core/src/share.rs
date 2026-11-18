use std::{num::NonZeroU32, ops::Add};

/// A ratio of two counts, `num` over a nonzero `den`, such as a third.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Fraction {
    num: u32,
    den: NonZeroU32,
}

impl Fraction {
    /// `num` over `den`; `None` for a zero `den`.
    pub(crate) const fn new(num: u32, den: u32) -> Option<Self> {
        match NonZeroU32::new(den) {
            Some(den) => Some(Self { num, den }),
            None => None,
        }
    }
}

/// A part of a non-empty whole, such as the hits a source misses of those read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Share {
    part: u32,
    whole: NonZeroU32,
}

impl Share {
    /// `part` of `whole`; `None` when the whole is empty or `part` exceeds it.
    pub(crate) fn of(part: u32, whole: u32) -> Option<Self> {
        NonZeroU32::new(whole)
            .filter(|whole| part <= whole.get())
            .map(|whole| Self { part, whole })
    }

    /// `part` of the whole that `part` and `rest` make; `None` when both are zero.
    pub(crate) fn split(part: u32, rest: u32) -> Option<Self> {
        NonZeroU32::new(part + rest).map(|whole| Self { part, whole })
    }

    /// The part of the whole the share is.
    pub(crate) fn part(self) -> u32 {
        self.part
    }

    /// The whole the share is a part of, never empty.
    pub(crate) fn whole(self) -> u32 {
        self.whole.get()
    }

    /// Whether the share is at least `threshold`, compared without division.
    pub(crate) fn reaches(self, threshold: Fraction) -> bool {
        u64::from(self.part) * u64::from(threshold.den.get())
            >= u64::from(threshold.num) * u64::from(self.whole.get())
    }
}

impl Add for Share {
    type Output = Self;

    /// The parts of both shares, of both wholes.
    fn add(self, other: Self) -> Self {
        Self {
            part: self.part + other.part,
            whole: self.whole.saturating_add(other.whole.get()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const THIRD: Fraction = Fraction::new(1, 3).expect("three is not zero");

    #[test]
    fn a_share_of_an_empty_whole_is_none() {
        assert_eq!(Share::of(0, 0), None);
    }

    #[test]
    fn a_part_larger_than_its_whole_is_no_share() {
        assert_eq!(Share::of(4, 3), None);
    }

    #[test]
    fn a_fraction_of_nothing_is_none() {
        assert_eq!(Fraction::new(1, 0), None);
    }

    #[test]
    fn a_share_split_from_its_rest_is_part_of_both() {
        assert_eq!(Share::split(1, 3), Share::of(1, 4));
    }

    #[test]
    fn a_split_of_nothing_is_none() {
        assert_eq!(Share::split(0, 0), None);
    }

    #[test]
    fn shares_add_their_parts_and_their_wholes() {
        let sum = Share::of(1, 4).unwrap() + Share::of(2, 3).unwrap();
        assert_eq!(Some(sum), Share::of(3, 7));
    }

    fn reaches_a_third(part: u32, whole: u32) -> bool {
        Share::of(part, whole).unwrap().reaches(THIRD)
    }

    #[test]
    fn a_share_reaches_a_fraction_it_equals() {
        assert!(reaches_a_third(16, 48));
    }

    #[test]
    fn a_share_one_below_a_fraction_does_not_reach_it() {
        assert!(!reaches_a_third(15, 48));
    }

    #[test]
    fn reaching_holds_for_the_largest_counts() {
        assert!(Share::of(u32::MAX, u32::MAX).unwrap().reaches(THIRD));
    }
}
