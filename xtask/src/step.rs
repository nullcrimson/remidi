/// One check of the gate: what it needs, which build directories it locks and how soon it
/// goes.
#[derive(
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    PartialOrd,
    Ord,
    strum::EnumString,
    strum::IntoStaticStr,
    strum::VariantArray,
)]
#[strum(serialize_all = "kebab-case")]
pub enum Step {
    Fmt,
    Clippy,
    CargoTest,
    GenI18n,
    BuildWasm,
    CompileSite,
    Eslint,
    Tsc,
    Vitest,
    BuildApp,
    BuildSite,
    Size,
    E2e,
}

/// A cargo build directory. Cargo locks one while it builds into it, so steps that share
/// one take turns; steps in different ones run at once.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TargetDir {
    /// `target/`, or `CARGO_TARGET_DIR` when set: the wasm build and the shipped tests.
    Main,
    Browser,
    Clippy,
    ClippyBrowser,
    Site,
}

impl TargetDir {
    /// The directory from the repository root; `None` for the main one, which cargo picks.
    pub fn path(self) -> Option<&'static str> {
        match self {
            TargetDir::Main => None,
            TargetDir::Browser => Some("target/browser"),
            TargetDir::Clippy => Some("target/clippy"),
            TargetDir::ClippyBrowser => Some("target/clippy-browser"),
            TargetDir::Site => Some("target/site"),
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, strum::EnumString, strum::IntoStaticStr, strum::VariantArray,
)]
#[strum(serialize_all = "kebab-case")]
pub enum Group {
    Rust,
    App,
    Dist,
}

impl Group {
    pub fn name(self) -> &'static str {
        self.into()
    }

    pub fn steps(self) -> &'static [Step] {
        match self {
            Group::Rust => &[Step::Fmt, Step::Clippy, Step::CargoTest],
            Group::App => &[Step::Eslint, Step::Tsc, Step::Vitest],
            Group::Dist => &[Step::Size, Step::E2e],
        }
    }
}

impl Step {
    pub fn name(self) -> &'static str {
        self.into()
    }

    /// The steps whose output this one reads.
    pub fn needs(self) -> &'static [Step] {
        match self {
            Step::Fmt
            | Step::Clippy
            | Step::CargoTest
            | Step::GenI18n
            | Step::BuildWasm
            | Step::CompileSite => &[],
            Step::Eslint => &[Step::GenI18n],
            Step::Tsc | Step::Vitest | Step::BuildApp => &[Step::GenI18n, Step::BuildWasm],
            Step::BuildSite => &[Step::BuildApp, Step::CompileSite],
            Step::Size | Step::E2e => &[Step::BuildSite],
        }
    }

    /// Whether a partial run adds this step whenever a chosen step needs it: true for the
    /// generated i18n types, which take a fraction of a second, and the site generator,
    /// which cargo leaves as it is when nothing changed; the other builds a partial run
    /// takes as done.
    pub fn implied(self) -> bool {
        matches!(self, Step::GenI18n | Step::CompileSite)
    }

    /// The cargo build directories the step builds into: for the two cargo passes, the
    /// shipped crates' first and the browser crate's second.
    pub fn target_dirs(self) -> &'static [TargetDir] {
        match self {
            Step::Clippy => &[TargetDir::Clippy, TargetDir::ClippyBrowser],
            Step::CargoTest => &[TargetDir::Main, TargetDir::Browser],
            Step::BuildWasm => &[TargetDir::Main],
            Step::CompileSite => &[TargetDir::Site],
            Step::Fmt
            | Step::GenI18n
            | Step::Eslint
            | Step::Tsc
            | Step::Vitest
            | Step::BuildApp
            | Step::BuildSite
            | Step::Size
            | Step::E2e => &[],
        }
    }

    /// Which ready step takes a build directory another ready step wants first: the longest
    /// chain to the end of the gate (wasm, app build, site build, browser tests) goes first.
    pub fn priority(self) -> u8 {
        match self {
            Step::BuildWasm => 0,
            Step::CompileSite => 1,
            Step::GenI18n => 2,
            Step::BuildApp => 3,
            Step::BuildSite => 4,
            Step::E2e => 5,
            Step::Eslint => 6,
            Step::Tsc => 7,
            Step::Vitest => 8,
            Step::Clippy => 9,
            Step::CargoTest => 10,
            Step::Fmt => 11,
            Step::Size => 12,
        }
    }
}

#[cfg(test)]
mod tests {
    use strum::VariantArray;

    use super::*;

    #[test]
    fn steps_are_named_in_kebab_case() {
        let names: Vec<&str> = Step::VARIANTS.iter().map(|s| s.name()).collect();
        assert_eq!(
            names,
            [
                "fmt",
                "clippy",
                "cargo-test",
                "gen-i18n",
                "build-wasm",
                "compile-site",
                "eslint",
                "tsc",
                "vitest",
                "build-app",
                "build-site",
                "size",
                "e2e"
            ]
        );
    }

    #[test]
    fn a_step_is_found_by_its_name() {
        assert_eq!("cargo-test".parse(), Ok(Step::CargoTest));
        assert!("lint".parse::<Step>().is_err());
    }

    #[test]
    fn a_step_needs_only_steps_declared_before_it() {
        for step in Step::VARIANTS {
            for need in step.needs() {
                assert!(need < step, "{} needs {}", step.name(), need.name());
            }
        }
    }
}
