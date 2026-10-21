/// `name` with every character Windows forbids in a file name replaced by `-`.
pub fn safe_file_name(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            c if c.is_control() => '-',
            c => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_drum_map_file_name_has_no_character_windows_forbids() {
        assert_eq!(
            safe_file_name(r#"A/B\C:D*E?F"G<H>I|J"#),
            "A-B-C-D-E-F-G-H-I-J"
        );
    }
}
