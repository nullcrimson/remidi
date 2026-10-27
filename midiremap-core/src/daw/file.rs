/// A file name without its extension: every character Windows forbids in a file name
/// replaced by `-`, and no trailing dot or space, which Windows drops.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileStem(String);

impl FileStem {
    /// `text` as a file stem; `None` when nothing is left of it.
    pub fn parse(text: &str) -> Option<FileStem> {
        let cleaned: String = text
            .chars()
            .map(|c| match c {
                '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
                c if c.is_control() => '-',
                c => c,
            })
            .collect();
        let stem = cleaned.trim_end_matches(['.', ' ']);
        (!stem.trim().is_empty()).then(|| FileStem(stem.to_owned()))
    }

    /// The file name of this stem with `extension`.
    pub fn with_extension(&self, extension: &str) -> String {
        format!("{}.{extension}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file_name(text: &str) -> Option<String> {
        FileStem::parse(text).map(|s| s.with_extension("txt"))
    }

    #[test]
    fn a_drum_map_file_name_has_no_character_windows_forbids() {
        assert_eq!(
            file_name(r#"A/B\C:D*E?F"G<H>I|J"#),
            Some("A-B-C-D-E-F-G-H-I-J.txt".to_owned())
        );
    }

    #[test]
    fn a_file_stem_drops_trailing_dots_and_spaces() {
        assert_eq!(file_name("My kit. . "), Some("My kit.txt".to_owned()));
    }

    #[test]
    fn a_name_that_cleans_to_nothing_is_no_file_stem() {
        assert_eq!(FileStem::parse("..."), None);
    }
}
