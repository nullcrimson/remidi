use serde::Serialize;

/// How a file's text is stored on disk: as it is, or gzip-compressed.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Packing {
    Text,
    Gzip,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_packing_serializes_as_its_lowercase_name() {
        assert_eq!(
            serde_json::to_string(&[Packing::Text, Packing::Gzip]).unwrap(),
            r#"["text","gzip"]"#
        );
    }
}
