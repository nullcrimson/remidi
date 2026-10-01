use serde::{de, Deserialize, Deserializer};

/// Text with at least one non-whitespace character, such as a name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NonBlank(String);

impl NonBlank {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<NonBlank> for String {
    fn from(text: NonBlank) -> Self {
        text.0
    }
}

impl<'de> Deserialize<'de> for NonBlank {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let text = String::deserialize(d)?;
        if text.trim().is_empty() {
            Err(de::Error::invalid_value(
                de::Unexpected::Str(&text),
                &"text that is not blank",
            ))
        } else {
            Ok(Self(text))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blank_text_is_rejected() {
        assert!(serde_json::from_str::<NonBlank>(r#"" \t""#).is_err());
    }

    #[test]
    fn text_keeps_its_spacing() {
        let text: NonBlank = serde_json::from_str(r#"" My kit""#).unwrap();
        assert_eq!(text.as_str(), " My kit");
    }
}
