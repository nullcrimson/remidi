use serde::Serialize;

/// How a file's text is stored on disk: as it is, or gzip-compressed.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
#[cfg_attr(feature = "ts", derive(tsify::Tsify))]
pub enum Packing {
    Text,
    Gzip,
}

impl Packing {
    /// `text` as the bytes of a file that stores it this way.
    #[cfg(feature = "gzip")]
    pub fn pack(self, text: String) -> Vec<u8> {
        use std::io::Write;

        use flate2::{write::GzEncoder, Compression};

        match self {
            Self::Text => text.into_bytes(),
            Self::Gzip => {
                let mut gz = GzEncoder::new(Vec::new(), Compression::best());
                gz.write_all(text.as_bytes())
                    .and_then(|()| gz.finish())
                    .expect("compressing into memory cannot fail")
            }
        }
    }
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
