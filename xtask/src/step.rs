/// One check of the gate: what it needs, what it holds while it runs and how soon it goes.
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
    Eslint,
    Tsc,
    Vitest,
    BuildApp,
    BuildSite,
    Size,
    E2e,
}

/// What a step holds while it runs: cargo's build directory, the CPU the Node tools
/// share, or nothing worth queueing for.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lane {
    Cargo,
    Node,
    Free,
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
            Step::Fmt | Step::Clippy | Step::CargoTest | Step::GenI18n | Step::BuildWasm => &[],
            Step::Eslint => &[Step::GenI18n],
            Step::Tsc | Step::Vitest | Step::BuildApp => &[Step::GenI18n, Step::BuildWasm],
            Step::BuildSite => &[Step::BuildApp],
            Step::Size | Step::E2e => &[Step::BuildSite],
        }
    }

    /// Whether a partial run adds this step whenever a chosen step needs it: true for the
    /// generated i18n types, which take a fraction of a second; the builds a partial run
    /// takes as done.
    pub fn implied(self) -> bool {
        matches!(self, Step::GenI18n)
    }

    /// Whether the step loads the machine with Rust checks beside the Node steps.
    pub fn checks_rust(self) -> bool {
        matches!(self, Step::Clippy | Step::CargoTest)
    }

    pub fn lane(self) -> Lane {
        match self {
            Step::Clippy | Step::CargoTest | Step::BuildWasm | Step::BuildSite => Lane::Cargo,
            Step::Eslint | Step::Tsc | Step::Vitest | Step::BuildApp | Step::E2e => Lane::Node,
            Step::Fmt | Step::GenI18n | Step::Size => Lane::Free,
        }
    }

    /// Which ready step takes a free lane first: the longest chain to the end of the gate
    /// (wasm, app build, site build, browser tests) goes first.
    pub fn priority(self) -> u8 {
        match self {
            Step::BuildWasm => 0,
            Step::GenI18n => 1,
            Step::BuildApp => 2,
            Step::BuildSite => 3,
            Step::E2e => 4,
            Step::Eslint => 5,
            Step::Tsc => 6,
            Step::Vitest => 7,
            Step::Clippy => 8,
            Step::CargoTest => 9,
            Step::Fmt => 10,
            Step::Size => 11,
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
