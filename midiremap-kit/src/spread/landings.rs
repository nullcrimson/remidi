/// Where each place a spread places lands, each place once: a map of a few entries, kept as a
/// list.
pub(crate) struct Landings<K, V>(Vec<(K, V)>);

impl<K, V> Default for Landings<K, V> {
    fn default() -> Self {
        Self(Vec::new())
    }
}

impl<K: Copy + PartialEq, V: Copy> Landings<K, V> {
    /// Where `from` lands, when it was placed.
    pub(crate) fn get(&self, from: K) -> Option<V> {
        self.0.iter().find(|&&(k, _)| k == from).map(|&(_, v)| v)
    }

    /// Lands `from` on `to`, in place of where it landed before.
    pub(crate) fn place(&mut self, from: K, to: V) {
        match self.0.iter_mut().find(|(k, _)| *k == from) {
            Some(entry) => entry.1 = to,
            None => self.0.push((from, to)),
        }
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = (K, V)> + '_ {
        self.0.iter().copied()
    }
}

impl<K: Copy + PartialEq, V: Copy> FromIterator<(K, V)> for Landings<K, V> {
    fn from_iter<I: IntoIterator<Item = (K, V)>>(iter: I) -> Self {
        let mut landings = Self::default();
        for (from, to) in iter {
            landings.place(from, to);
        }
        landings
    }
}

impl<K, V> IntoIterator for Landings<K, V> {
    type Item = (K, V);
    type IntoIter = std::vec::IntoIter<(K, V)>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

/// Where a spread lands each source place, and which places the target has of the same name
/// it moved off them, so an edit of such a row moves that row alone.
pub(crate) struct Moved<K, V> {
    landings: Landings<K, V>,
    moved: Vec<K>,
}

impl<K, V> Default for Moved<K, V> {
    fn default() -> Self {
        Self {
            landings: Landings::default(),
            moved: Vec::new(),
        }
    }
}

impl<K: Copy + PartialEq, V: Copy + PartialEq + From<K>> Moved<K, V> {
    /// `landings`, with each place `has` says the target has and that lands elsewhere moved.
    pub(crate) fn new(landings: Landings<K, V>, has: impl Fn(K) -> bool) -> Self {
        let moved = landings
            .iter()
            .filter(|&(from, to)| to != V::from(from) && has(from))
            .map(|(from, _)| from)
            .collect();
        Self { landings, moved }
    }

    pub(crate) fn get(&self, from: K) -> Option<V> {
        self.landings.get(from)
    }

    /// Whether the target has `from` and the source's `from` lands on another.
    pub(crate) fn moved(&self, from: K) -> bool {
        self.moved.contains(&from)
    }

    /// What the strokes of `from` count as: where it lands when the spread moved it, else
    /// itself.
    pub(crate) fn drum(&self, from: K) -> V {
        self.get(from)
            .filter(|_| self.moved(from))
            .unwrap_or_else(|| V::from(from))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_place_landed_twice_lands_where_it_was_placed_last() {
        let landings: Landings<u8, u8> = [(1, 10), (2, 20), (1, 11)].into_iter().collect();
        assert_eq!(
            (landings.get(1), landings.get(2), landings.iter().count()),
            (Some(11), Some(20), 2)
        );
    }
}
