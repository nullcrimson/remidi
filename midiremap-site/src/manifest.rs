use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;

/// What stops the app's build output from being read.
#[derive(thiserror::Error, Debug)]
pub enum ManifestError {
    #[error("cannot read {}: {source}; run the app build first", path.display())]
    Unreadable {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("{} is not the app build's site.json ({source}); run the app build first", path.display())]
    Malformed {
        path: PathBuf,
        source: serde_json::Error,
    },
}

/// One third-party `<script defer>` the app's build adds to its pages: its `src` and its
/// other attributes, by name.
#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct AnalyticsScript {
    pub src: String,
    pub attrs: BTreeMap<String, String>,
}

/// The script the static pages load, and the chunks it imports, which they preload.
#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct LocaleScript {
    pub src: String,
    pub preload: Vec<String>,
}

/// What the static pages take from the app's build, which writes it to `site.json`: the
/// stylesheet's address, the content security policy text, the analytics scripts and the
/// locale script.
#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SiteManifest {
    pub stylesheet: String,
    pub content_security_policy: String,
    pub analytics: Vec<AnalyticsScript>,
    pub locale_script: LocaleScript,
}

fn read_file(path: &Path) -> Result<String, ManifestError> {
    fs::read_to_string(path).map_err(|source| ManifestError::Unreadable {
        path: path.to_path_buf(),
        source,
    })
}

impl SiteManifest {
    fn parse(json: &str, path: &Path) -> Result<Self, ManifestError> {
        serde_json::from_str(json).map_err(|source| ManifestError::Malformed {
            path: path.to_path_buf(),
            source,
        })
    }
}

/// What the app's build left in its output folder: the converter's `index.html` and the
/// manifest the static pages are written from.
pub struct AppBuild {
    pub index_html: String,
    pub manifest: SiteManifest,
}

impl AppBuild {
    /// Reads `index.html` and `site.json` from the app build's output folder `dir`.
    pub fn read(dir: &Path) -> Result<Self, ManifestError> {
        let index_html = read_file(&dir.join("index.html"))?;
        let manifest_path = dir.join("site.json");
        let manifest = SiteManifest::parse(&read_file(&manifest_path)?, &manifest_path)?;
        Ok(Self {
            index_html,
            manifest,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SITE_JSON: &str = r#"{
  "stylesheet": "/assets/index-b2.css",
  "contentSecurityPolicy": "default-src 'self'; font-src 'self'",
  "analytics": [
    { "src": "https://static.cloudflareinsights.com/beacon.min.js", "attrs": { "data-cf-beacon": "{\"token\": \"t\"}" } },
    { "src": "https://cloud.umami.is/script.js", "attrs": { "data-website-id": "w", "data-domains": "example.com" } }
  ],
  "localeScript": { "src": "/assets/site-locale-x1.js", "preload": ["/assets/storage-y2.js", "/assets/language-z3.js"] }
}"#;

    fn parsed() -> SiteManifest {
        SiteManifest::parse(SITE_JSON, Path::new("site.json")).unwrap()
    }

    fn build_folder(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("midiremap-site-{name}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn parses_the_stylesheet_and_policy_from_the_site_data() {
        let manifest = parsed();
        assert_eq!(manifest.stylesheet, "/assets/index-b2.css");
        assert_eq!(
            manifest.content_security_policy,
            "default-src 'self'; font-src 'self'"
        );
    }

    #[test]
    fn parses_each_analytics_script_with_its_attributes() {
        let manifest = parsed();
        assert_eq!(manifest.analytics.len(), 2);
        assert_eq!(
            manifest.analytics[0].src,
            "https://static.cloudflareinsights.com/beacon.min.js"
        );
        assert_eq!(
            manifest.analytics[0].attrs["data-cf-beacon"],
            r#"{"token": "t"}"#
        );
        assert_eq!(
            manifest.analytics[1].attrs.keys().collect::<Vec<_>>(),
            ["data-domains", "data-website-id"]
        );
    }

    #[test]
    fn parses_the_locale_script_and_the_chunks_it_preloads() {
        let manifest = parsed();
        assert_eq!(manifest.locale_script.src, "/assets/site-locale-x1.js");
        assert_eq!(
            manifest.locale_script.preload,
            ["/assets/storage-y2.js", "/assets/language-z3.js"]
        );
    }

    #[test]
    fn reads_the_index_and_the_site_data_from_the_build_folder() {
        let dir = build_folder("complete");
        fs::write(dir.join("index.html"), "<html></html>").unwrap();
        fs::write(dir.join("site.json"), SITE_JSON).unwrap();
        let build = AppBuild::read(&dir).unwrap();
        fs::remove_dir_all(&dir).unwrap();
        assert_eq!(build.index_html, "<html></html>");
        assert_eq!(build.manifest.analytics.len(), 2);
    }

    #[test]
    fn a_build_folder_without_the_site_data_asks_for_the_app_build() {
        let dir = build_folder("no-site-json");
        fs::write(dir.join("index.html"), "<html></html>").unwrap();
        let err = AppBuild::read(&dir).err().unwrap();
        fs::remove_dir_all(&dir).unwrap();
        assert!(matches!(err, ManifestError::Unreadable { .. }), "{err}");
        assert!(err.to_string().contains("site.json"), "{err}");
        assert!(err.to_string().contains("run the app build first"), "{err}");
    }

    #[test]
    fn a_build_folder_without_the_index_asks_for_the_app_build() {
        let dir = build_folder("no-index");
        fs::write(dir.join("site.json"), SITE_JSON).unwrap();
        let err = AppBuild::read(&dir).err().unwrap();
        fs::remove_dir_all(&dir).unwrap();
        assert!(matches!(err, ManifestError::Unreadable { .. }), "{err}");
        assert!(err.to_string().contains("index.html"), "{err}");
        assert!(err.to_string().contains("run the app build first"), "{err}");
    }

    #[test]
    fn malformed_site_data_is_an_error_that_asks_for_the_app_build() {
        let err = SiteManifest::parse(r#"{"stylesheet": 1}"#, Path::new("site.json")).unwrap_err();
        assert!(matches!(err, ManifestError::Malformed { .. }), "{err}");
        assert!(err.to_string().contains("run the app build first"), "{err}");
    }
}
