/// A file name without its extension, with every character Windows forbids in a file name
/// replaced by `-`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileStem(String);

impl FileStem {
    /// `text` as a file stem; `None` when it is blank.
    pub fn parse(text: &str) -> Option<FileStem> {
        let stem: String = text
            .chars()
            .map(|c| match c {
                '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
                c if c.is_control() => '-',
                c => c,
            })
            .collect();
        (!stem.trim().is_empty()).then_some(FileStem(stem))
    }

    /// The file name of this stem with `extension`.
    pub fn with_extension(&self, extension: &str) -> String {
        format!("{}.{extension}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_drum_map_file_name_has_no_character_windows_forbids() {
        assert_eq!(
            FileStem::parse(r#"A/B\C:D*E?F"G<H>I|J"#).map(|s| s.with_extension("txt")),
            Some("A-B-C-D-E-F-G-H-I-J.txt".to_owned())
        );
    }
}
