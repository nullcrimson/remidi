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

/// What only one running step can have, so steps that want the same one take turns.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Hold {
    /// A cargo build directory, which cargo locks while it builds into it.
    Dir(TargetDir),
    /// The test workers: the unit tests and the browser tests each spread over most of the
    /// cores and several gigabytes of memory.
    TestWorkers,
}

/// How the operating system schedules a step's processes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Urgency {
    /// On the chain to the browser tests, the longest in the gate, or the unit tests, which
    /// run just before them: normal priority.
    Chain,
    /// Every other step: below normal priority, so it takes only the CPU the chain leaves.
    Background,
}

/// What a check reads: source files, as git pathspecs from the repository root, and the
/// outputs of the builds it needs, which git ignores.
#[derive(Debug, PartialEq, Eq)]
pub struct Reads {
    pub sources: &'static [&'static str],
    pub built: &'static [&'static str],
}

const RUST: &[&str] = &[
    "Cargo.toml",
    "Cargo.lock",
    "rust-toolchain.toml",
    "nightly-toolchain",
    "rustfmt.toml",
    ".cargo",
    "midiremap-cli",
    "midiremap-core",
    "midiremap-site",
    "midiremap-testkit",
    "midiremap-wasm",
    "xtask",
    "engines",
    "locales",
    "content",
];

const RUST_CHECK: Reads = Reads {
    sources: RUST,
    built: &[],
};

const APP_CHECK: Reads = Reads {
    sources: &["app", "locales", "content", ".nvmrc"],
    built: &["app/src/generated", "app/src/wasm"],
};

/// The app's build directory: the app build writes it, then the site build adds its pages.
pub const DIST: &str = "app/dist";

/// The site generator `Step::CompileSite` builds, from the repository root.
pub const SITE_PROGRAM: &str = if cfg!(windows) {
    "target/site/debug/midiremap-site.exe"
} else {
    "target/site/debug/midiremap-site"
};

/// What the app build and the site build read together to write `DIST`.
pub const DIST_BUILD: Reads = Reads {
    sources: &[
        "app/src",
        "app/public",
        "app/index.html",
        "app/vite.config.ts",
        "app/tsconfig.json",
        "app/scripts",
        "app/package.json",
        "app/package-lock.json",
        "locales",
        "content",
        ".nvmrc",
    ],
    built: &["app/src/generated", "app/src/wasm", SITE_PROGRAM],
};

/// How the gate keeps a step's result between runs.
#[derive(Debug, PartialEq, Eq)]
pub enum Kept {
    /// A check: its pass holds while what it reads is unchanged.
    Check(Reads),
    /// One of the two builds that write `DIST`, the app build and then the site build into
    /// the same directory: both are skipped while what they read and `DIST` as the site
    /// build left it are unchanged. The site build, which finishes `DIST`, keeps it.
    Dist { finishes: bool },
    /// The other builds, which always run; cargo and the wasm script skip the work
    /// themselves when nothing changed.
    Never,
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
            Step::Tsc | Step::Vitest => &[Step::GenI18n, Step::BuildWasm],
            Step::BuildApp => &[Step::GenI18n, Step::BuildWasm, Step::CompileSite],
            Step::BuildSite => &[Step::BuildApp, Step::CompileSite],
            Step::Size | Step::E2e => &[Step::BuildSite],
        }
    }

    pub fn urgency(self) -> Urgency {
        match self {
            Step::GenI18n
            | Step::BuildWasm
            | Step::CompileSite
            | Step::BuildApp
            | Step::BuildSite
            | Step::Vitest
            | Step::E2e => Urgency::Chain,
            Step::Fmt | Step::Clippy | Step::CargoTest | Step::Eslint | Step::Tsc | Step::Size => {
                Urgency::Background
            }
        }
    }

    /// How the gate keeps the step's result between runs.
    pub fn kept(self) -> Kept {
        match self {
            Step::Fmt | Step::Clippy | Step::CargoTest => Kept::Check(RUST_CHECK),
            Step::Eslint | Step::Tsc | Step::Vitest => Kept::Check(APP_CHECK),
            Step::Size => Kept::Check(Reads {
                sources: &[
                    "app/scripts",
                    "app/package.json",
                    "app/package-lock.json",
                    ".nvmrc",
                ],
                built: &[DIST],
            }),
            Step::E2e => Kept::Check(Reads {
                sources: &[
                    "app/e2e",
                    "app/playwright.config.ts",
                    "app/vite.config.ts",
                    "app/scripts",
                    "app/package.json",
                    "app/package-lock.json",
                    ".nvmrc",
                ],
                built: &[DIST],
            }),
            Step::BuildApp => Kept::Dist { finishes: false },
            Step::BuildSite => Kept::Dist { finishes: true },
            Step::GenI18n | Step::BuildWasm | Step::CompileSite => Kept::Never,
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

    /// What the step holds while it runs: its build directories, and for the unit and the
    /// browser tests the test workers.
    pub fn holds(self) -> impl Iterator<Item = Hold> {
        let workers = matches!(self, Step::Vitest | Step::E2e).then_some(Hold::TestWorkers);
        self.target_dirs()
            .iter()
            .copied()
            .map(Hold::Dir)
            .chain(workers)
    }

    /// Which ready step takes a hold another ready step wants first: the longest
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
