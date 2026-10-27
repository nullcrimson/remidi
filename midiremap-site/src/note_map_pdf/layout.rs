use midiremap_core::Family;

use crate::pages::{EngineRow, FamilyGroup};

/// One line of the note table: a family's heading or one of its rows.
#[derive(Clone, Copy)]
pub(crate) enum Line<'a> {
    Family(Family),
    Row(&'a EngineRow),
}

impl Line<'_> {
    pub(crate) fn is_heading(&self) -> bool {
        matches!(self, Line::Family(_))
    }
}

/// The table's lines: each family's heading, then its rows, in the page's order.
pub(crate) fn lines(groups: &[FamilyGroup<EngineRow>]) -> Vec<Line<'_>> {
    groups
        .iter()
        .flat_map(|g| std::iter::once(Line::Family(g.family)).chain(g.rows.iter().map(Line::Row)))
        .collect()
}

/// Lines laid into pages of two columns, left first; a column holds `first_page` lines on the
/// first page and `later_pages` after it. A family moves whole to the next column when it fits
/// there and not in what is left of this one (from the right column only when at most a quarter
/// of it stays empty), a longer family splits, and a heading never ends
/// a column. There is always at least one page.
pub(crate) fn columns<T: Copy>(
    lines: &[T],
    first_page: usize,
    later_pages: usize,
    is_heading: impl Fn(&T) -> bool,
) -> Vec<[Vec<T>; 2]> {
    let mut pages = vec![[Vec::new(), Vec::new()]];
    let mut column = 0;
    let mut capacity = first_page;
    let advance = |pages: &mut Vec<[Vec<T>; 2]>, column: &mut usize, capacity: &mut usize| {
        if *column == 0 {
            *column = 1;
        } else {
            pages.push([Vec::new(), Vec::new()]);
            *column = 0;
            *capacity = later_pages;
        }
    };
    for family in lines.chunk_by(|_, next| !is_heading(next)) {
        let used = pages.last().map_or(0, |p| p[column].len());
        let left = capacity.saturating_sub(used);
        let worth_moving = column == 0 || left * 4 <= capacity;
        if used > 0 && family.len() > left && family.len() <= capacity && worth_moving {
            advance(&mut pages, &mut column, &mut capacity);
        }
        for &line in family {
            let used = pages.last().map_or(0, |p| p[column].len());
            let full = used >= capacity || (is_heading(&line) && used + 1 >= capacity);
            if used > 0 && full {
                advance(&mut pages, &mut column, &mut capacity);
            }
            if let Some(page) = pages.last_mut() {
                page[column].push(line);
            }
        }
    }
    pages
}

#[cfg(test)]
mod tests {
    use super::*;

    fn heading(l: &char) -> bool {
        *l == 'H'
    }

    fn page(left: &str, right: &str) -> [Vec<char>; 2] {
        [left.chars().collect(), right.chars().collect()]
    }

    #[test]
    fn a_short_list_fills_one_page_left_column_first() {
        assert_eq!(
            columns(&['H', 'r', 'r'], 10, 12, heading),
            vec![page("Hrr", "")]
        );
    }

    #[test]
    fn a_family_that_does_not_fit_moves_whole_to_the_next_column() {
        let lines: Vec<char> = "HrrrHrrr".chars().collect();
        assert_eq!(columns(&lines, 5, 5, heading), vec![page("Hrrr", "Hrrr")]);
    }

    #[test]
    fn a_family_longer_than_a_column_splits() {
        let lines: Vec<char> = "Hrrrrrrrrrrrr".chars().collect();
        assert_eq!(
            columns(&lines, 5, 5, heading),
            vec![page("Hrrrr", "rrrrr"), page("rrr", "")]
        );
    }

    #[test]
    fn a_family_that_misses_the_right_column_splits_rather_than_opening_a_page() {
        let lines: Vec<char> = "HrrrrHrrHrrrr".chars().collect();
        assert_eq!(
            columns(&lines, 5, 5, heading),
            vec![page("Hrrrr", "HrrHr"), page("rrr", "")]
        );
    }

    #[test]
    fn a_family_moves_to_the_next_page_when_the_right_column_is_nearly_full() {
        let lines: Vec<char> = "HrrrrrrrHrrrrrrHrrr".chars().collect();
        assert_eq!(
            columns(&lines, 8, 8, heading),
            vec![page("Hrrrrrrr", "Hrrrrrr"), page("Hrrr", "")]
        );
    }

    #[test]
    fn a_heading_never_ends_a_column() {
        let lines: Vec<char> = "rrrrHr".chars().collect();
        assert_eq!(columns(&lines, 5, 5, heading), vec![page("rrrr", "Hr")]);
    }

    #[test]
    fn a_split_family_never_leaves_its_heading_last() {
        let lines: Vec<char> = "rrrHrrrrrrr".chars().collect();
        let pages = columns(&lines, 4, 4, heading);
        for column in pages.iter().flatten() {
            assert_ne!(column.last(), Some(&'H'), "{pages:?}");
        }
    }

    #[test]
    fn later_pages_hold_their_own_count() {
        let lines = vec!['r'; 25];
        let counts: Vec<[usize; 2]> = columns(&lines, 5, 10, heading)
            .iter()
            .map(|[l, r]| [l.len(), r.len()])
            .collect();
        assert_eq!(counts, vec![[5, 5], [10, 5]]);
    }

    #[test]
    fn lines_put_a_family_before_its_rows() {
        let site = crate::fixtures::site();
        let page = site
            .engines
            .iter()
            .find(|p| p.groups.len() > 1)
            .expect("an engine with two families");
        let lines = lines(&page.groups[..2]);
        let shape: String = lines
            .iter()
            .map(|l| if l.is_heading() { 'H' } else { 'r' })
            .collect();
        let expected = format!(
            "H{}H{}",
            "r".repeat(page.groups[0].rows.len()),
            "r".repeat(page.groups[1].rows.len())
        );
        assert_eq!(shape, expected);
        assert!(matches!(lines[0], Line::Family(f) if f == page.groups[0].family));
    }
}
