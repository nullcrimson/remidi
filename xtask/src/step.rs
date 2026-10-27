use std::collections::BTreeSet;

use strum::VariantArray;

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

/// The browser tests, the longest in the gate, and the unit tests, which run just before
/// them: they and every step they need run at normal priority.
const CHAIN_ENDS: [Step; 2] = [Step::E2e, Step::Vitest];

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

/// One of a cargo step's two passes, each building into a directory of its own.
#[derive(Clone, Copy, Debug, PartialEq, Eq, strum::VariantArray)]
pub enum CargoPass {
    /// The crates that ship in the CLI and the site generator.
    Shipped,
    /// The browser crate.
    Browser,
}

/// A path a check reads, from the repository root.
#[derive(Debug, PartialEq, Eq)]
pub enum Input {
    Path(&'static str),
    /// The directory of every crate of the cargo workspace.
    Crates,
    /// The site generator `Step::CompileSite` builds.
    SiteProgram,
}

/// What a check reads: source files, as git pathspecs, and the outputs of the builds it
/// needs, which git ignores.
#[derive(Debug, PartialEq, Eq)]
pub struct Reads {
    pub sources: &'static [Input],
    pub built: &'static [Input],
}

const RUST: &[Input] = &[
    Input::Path("Cargo.toml"),
    Input::Path("Cargo.lock"),
    Input::Path("rust-toolchain.toml"),
    Input::Path("nightly-toolchain"),
    Input::Path("rustfmt.toml"),
    Input::Path(".cargo"),
    Input::Crates,
    Input::Path("engines"),
    Input::Path("locales"),
    Input::Path("content"),
];

const RUST_CHECK: Reads = Reads {
    sources: RUST,
    built: &[],
};

const APP_CHECK: Reads = Reads {
    sources: &[
        Input::Path("app"),
        Input::Path("locales"),
        Input::Path("content"),
        Input::Path(".nvmrc"),
    ],
    built: &[
        Input::Path("app/src/generated"),
        Input::Path("app/src/wasm"),
    ],
};

/// The app's build directory: the app build writes it, then the site build adds its pages.
pub const DIST: &str = "app/dist";

/// What the app build and the site build read together to write `DIST`.
pub const DIST_BUILD: Reads = Reads {
    sources: &[
        Input::Path("app/src"),
        Input::Path("app/public"),
        Input::Path("app/index.html"),
        Input::Path("app/vite.config.ts"),
        Input::Path("app/tsconfig.json"),
        Input::Path("app/scripts"),
        Input::Path("app/package.json"),
        Input::Path("app/package-lock.json"),
        Input::Path("locales"),
        Input::Path("content"),
        Input::Path(".nvmrc"),
    ],
    built: &[
        Input::Path("app/src/generated"),
        Input::Path("app/src/wasm"),
        Input::SiteProgram,
    ],
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

    /// Every step this one needs, directly or through the needed steps `through` admits.
    pub fn reach(self, through: impl Fn(Step) -> bool) -> BTreeSet<Step> {
        let mut reached = BTreeSet::new();
        let mut next: Vec<Step> = self.needs().to_vec();
        while let Some(step) = next.pop() {
            if reached.insert(step) && through(step) {
                next.extend(step.needs());
            }
        }
        reached
    }

    /// Every step this one needs, directly or through the steps it needs.
    pub fn needs_closure(self) -> BTreeSet<Step> {
        self.reach(|_| true)
    }

    /// `Chain` for the chain ends and every step they need.
    pub fn urgency(self) -> Urgency {
        let on_chain = CHAIN_ENDS
            .iter()
            .any(|&end| end == self || end.needs_closure().contains(&self));
        if on_chain {
            Urgency::Chain
        } else {
            Urgency::Background
        }
    }

    /// How the gate keeps the step's result between runs.
    pub fn kept(self) -> Kept {
        match self {
            Step::Fmt | Step::Clippy | Step::CargoTest => Kept::Check(RUST_CHECK),
            Step::Eslint | Step::Tsc | Step::Vitest => Kept::Check(APP_CHECK),
            Step::Size => Kept::Check(Reads {
                sources: &[
                    Input::Path("app/scripts"),
                    Input::Path("app/package.json"),
                    Input::Path("app/package-lock.json"),
                    Input::Path(".nvmrc"),
                ],
                built: &[Input::Path(DIST)],
            }),
            Step::E2e => Kept::Check(Reads {
                sources: &[
                    Input::Path("app/e2e"),
                    Input::Path("app/playwright.config.ts"),
                    Input::Path("app/vite.config.ts"),
                    Input::Path("app/scripts"),
                    Input::Path("app/package.json"),
                    Input::Path("app/package-lock.json"),
                    Input::Path(".nvmrc"),
                ],
                built: &[Input::Path(DIST)],
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

    /// The cargo build directory the step's `pass` builds into, when the step builds that
    /// pass: the wasm build builds only the browser crate, the site generator only shipped
    /// code.
    pub fn target_dir(self, pass: CargoPass) -> Option<TargetDir> {
        match self {
            Step::Clippy => Some(match pass {
                CargoPass::Shipped => TargetDir::Clippy,
                CargoPass::Browser => TargetDir::ClippyBrowser,
            }),
            Step::CargoTest => Some(match pass {
                CargoPass::Shipped => TargetDir::Main,
                CargoPass::Browser => TargetDir::Browser,
            }),
            Step::BuildWasm => (pass == CargoPass::Browser).then_some(TargetDir::Main),
            Step::CompileSite => (pass == CargoPass::Shipped).then_some(TargetDir::Site),
            Step::Fmt
            | Step::GenI18n
            | Step::Eslint
            | Step::Tsc
            | Step::Vitest
            | Step::BuildApp
            | Step::BuildSite
            | Step::Size
            | Step::E2e => None,
        }
    }

    /// The cargo build directories the step builds into, a pass at a time.
    pub fn target_dirs(self) -> impl Iterator<Item = (CargoPass, TargetDir)> {
        CargoPass::VARIANTS
            .iter()
            .filter_map(move |&pass| self.target_dir(pass).map(|dir| (pass, dir)))
    }

    /// What the step holds while it runs: its build directories, and for the unit and the
    /// browser tests the test workers.
    pub fn holds(self) -> impl Iterator<Item = Hold> {
        let workers = matches!(self, Step::Vitest | Step::E2e).then_some(Hold::TestWorkers);
        self.target_dirs()
            .map(|(_, dir)| Hold::Dir(dir))
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
    fn a_step_runs_on_the_chain_exactly_when_a_chain_end_is_or_needs_it() {
        for &step in Step::VARIANTS {
            let on_chain = CHAIN_ENDS
                .iter()
                .any(|&end| end == step || end.needs_closure().contains(&step));
            assert_eq!(
                step.urgency() == Urgency::Chain,
                on_chain,
                "{}",
                step.name()
            );
        }
    }

    #[test]
    fn a_step_no_chain_end_needs_runs_in_the_background() {
        assert_eq!(Step::Fmt.urgency(), Urgency::Background);
    }

    #[test]
    fn the_closure_follows_needs_to_the_end() {
        assert_eq!(
            Step::E2e.needs_closure(),
            BTreeSet::from([
                Step::GenI18n,
                Step::BuildWasm,
                Step::CompileSite,
                Step::BuildApp,
                Step::BuildSite
            ])
        );
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
