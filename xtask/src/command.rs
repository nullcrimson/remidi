use std::{env::consts::EXE_SUFFIX, path::Path, process::Command};

use crate::{
    plan::{Mode, Plan},
    step::{Step, TargetDir},
};

const SHIPPED: [&str; 3] = ["--workspace", "--exclude", "midiremap-wasm"];
const BROWSER: [&str; 2] = ["-p", "midiremap-wasm"];
const SITE: &str = "midiremap-site";
const NPM: &str = if cfg!(windows) { "npm.cmd" } else { "npm" };
const COUNTS: [&str; 4] = ["passed", "failed", "flaky", "skipped"];

/// The app directory, relative to the repository root.
pub const APP: &str = "app";

/// What the commands depend on besides the step: the pinned nightly for rustfmt and how
/// thorough the run is.
pub struct Context {
    pub nightly: String,
    pub mode: Mode,
}

impl Context {
    pub fn new(nightly: String, plan: &Plan) -> Self {
        Self {
            nightly,
            mode: plan.mode(),
        }
    }
}

/// What an invocation starts: a tool found on the path, or a program the gate built, by
/// its path from the repository root.
#[derive(Clone, Debug, PartialEq, Eq)]
enum Program {
    Tool(&'static str),
    Built(String),
}

/// One program a step runs.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Invocation {
    in_app: bool,
    program: Program,
    args: Vec<String>,
    env: Vec<(&'static str, &'static str)>,
    target_dir: Option<&'static str>,
}

impl Invocation {
    fn cargo(args: &[&str]) -> Self {
        Self {
            in_app: false,
            program: Program::Tool("cargo"),
            args: args.iter().map(|&a| a.to_owned()).collect(),
            env: Vec::new(),
            target_dir: None,
        }
    }

    /// `npm run <script>` without the script's pre-hooks: the package's scripts own the
    /// commands, the gate adds only its own flags and runs the needed steps itself.
    fn npm(script: &str, flags: &[&str]) -> Self {
        let mut args = vec!["run", "--silent", "--ignore-scripts", script];
        if !flags.is_empty() {
            args.push("--");
            args.extend(flags);
        }
        Self {
            in_app: true,
            program: Program::Tool(NPM),
            ..Self::cargo(&args)
        }
    }

    fn with_env(mut self, key: &'static str, value: &'static str) -> Self {
        self.env.push((key, value));
        self
    }

    /// The site generator that `Step::CompileSite` built, run on the app's build.
    fn site() -> Self {
        Self {
            in_app: true,
            program: Program::Built(site_program()),
            args: vec!["dist".to_owned()],
            env: Vec::new(),
            target_dir: None,
        }
    }

    pub fn program(&self) -> &str {
        match &self.program {
            Program::Tool(name) => name,
            Program::Built(path) => path,
        }
    }

    /// The process to start, from the repository `root`; a target directory of its own
    /// becomes `CARGO_TARGET_DIR`, so the command neither waits for nor invalidates the main
    /// one.
    pub fn command(&self, root: &Path) -> Command {
        let mut command = match &self.program {
            Program::Tool(name) => Command::new(name),
            Program::Built(path) => Command::new(root.join(path)),
        };
        command
            .args(&self.args)
            .current_dir(if self.in_app {
                root.join(APP)
            } else {
                root.to_path_buf()
            })
            .envs(self.env.iter().copied());
        if let Some(dir) = self.target_dir {
            command.env("CARGO_TARGET_DIR", root.join(dir));
        }
        command
    }
}

/// A step's programs: one after another, or all at once (the two cargo passes, which build
/// into separate target directories).
#[derive(Debug, PartialEq, Eq)]
pub enum Run {
    InTurn(Vec<Invocation>),
    AtOnce(Vec<Invocation>),
}

/// The site generator `Step::CompileSite` builds, from the repository root.
fn site_program() -> String {
    let dir = TargetDir::Site
        .path()
        .expect("the site generator has a directory of its own");
    format!("{dir}/debug/{SITE}{EXE_SUFFIX}")
}

/// A cargo command in `step`'s build directory: its only one, or for a two-pass step, the
/// directory of the pass.
fn cargo_in(step: Step, pass: usize, args: &[&str]) -> Invocation {
    Invocation {
        target_dir: step.target_dirs()[pass].path(),
        ..Invocation::cargo(args)
    }
}

/// `command` over the shipped crates and over the browser crate, at once.
fn both_passes(step: Step, command: &str, tail: &[&str]) -> Run {
    let pass = |i, crates: &[&str]| {
        let args: Vec<&str> = std::iter::once(command)
            .chain(crates.iter().copied())
            .chain(tail.iter().copied())
            .collect();
        cargo_in(step, i, &args)
    };
    Run::AtOnce(vec![pass(0, &SHIPPED), pass(1, &BROWSER)])
}

/// The programs `step` runs. The unit tests take every core, the browser tests three
/// quarters: at every core their page loads ran past the time limit.
pub fn run(step: Step, cx: &Context) -> Run {
    let one = |inv| Run::InTurn(vec![inv]);
    let quick = cx.mode == Mode::Quick;
    match step {
        Step::Fmt => {
            let toolchain = format!("+{}", cx.nightly);
            one(Invocation::cargo(&[
                &toolchain,
                "fmt",
                "--all",
                "--",
                "--check",
                "--config",
                "newline_style=Auto",
            ]))
        }
        Step::Clippy => both_passes(
            step,
            "clippy",
            &["--all-targets", "--locked", "--", "-D", "warnings"],
        ),
        Step::CargoTest => both_passes(step, "test", &["--locked", "--lib", "--bins", "--tests"]),
        Step::GenI18n => one(Invocation::npm("gen:i18n", &[])),
        Step::BuildWasm => {
            let build = Invocation::npm("build:wasm", &[]);
            one(if quick {
                build
                    .with_env("CARGO_PROFILE_WASM_LTO", "thin")
                    .with_env("CARGO_PROFILE_WASM_CODEGEN_UNITS", "16")
            } else {
                build
            })
        }
        Step::Eslint => one(Invocation::npm(
            "lint",
            &[
                "--cache",
                "--cache-location",
                "node_modules/.cache/eslint/",
                "--cache-strategy",
                "content",
            ],
        )),
        Step::Tsc => one(Invocation::npm(
            "typecheck",
            &[
                "--incremental",
                "--tsBuildInfoFile",
                "node_modules/.cache/tsc/app.tsbuildinfo",
            ],
        )),
        Step::Vitest => {
            let flags: &[&str] = if quick {
                &["--changed", "--passWithNoTests"]
            } else {
                &[]
            };
            one(Invocation::npm("test", flags).with_env("VITEST_WORKERS", "100%"))
        }
        Step::BuildApp => one(Invocation::npm("build:app", &[])),
        Step::CompileSite => one(cargo_in(step, 0, &["build", "-p", SITE, "--locked"])),
        Step::BuildSite => one(Invocation::site()),
        Step::Size => one(Invocation::npm("size", &[])),
        Step::E2e => {
            let flags: &[&str] = if quick {
                &["--only-changed", "--project=desktop"]
            } else {
                &[]
            };
            one(Invocation::npm("e2e", flags).with_env("E2E_WORKERS", "75%"))
        }
    }
}

/// The lines a passed step's log contributes to the gate's closing summary.
pub fn summary(step: Step, log: &str) -> Vec<String> {
    match step {
        Step::CargoTest => {
            let (passed, failed) = log
                .lines()
                .filter(|l| l.contains("test result"))
                .filter_map(|l| {
                    let words: Vec<&str> = l.split_whitespace().collect();
                    Some((
                        words.get(3)?.parse::<u64>().ok()?,
                        words.get(5)?.parse::<u64>().ok()?,
                    ))
                })
                .fold((0, 0), |(p, f), (dp, df)| (p + dp, f + df));
            vec![format!("cargo   {passed} passed, {failed} failed")]
        }
        Step::Vitest => log
            .lines()
            .filter(|l| l.contains("Tests "))
            .map(str::to_owned)
            .collect(),
        Step::E2e => {
            let mut counts: Vec<String> = log
                .lines()
                .filter(|l| {
                    l.split_whitespace()
                        .collect::<Vec<_>>()
                        .windows(2)
                        .any(|w| w[0].chars().all(|c| c.is_ascii_digit()) && COUNTS.contains(&w[1]))
                })
                .map(str::to_owned)
                .collect();
            counts.drain(..counts.len().saturating_sub(COUNTS.len()));
            counts
        }
        Step::Size => log
            .lines()
            .filter(|l| !l.trim().is_empty())
            .map(str::to_owned)
            .collect(),
        Step::Fmt
        | Step::Clippy
        | Step::GenI18n
        | Step::BuildWasm
        | Step::CompileSite
        | Step::Eslint
        | Step::Tsc
        | Step::BuildApp
        | Step::BuildSite => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use std::{ffi::OsStr, path::PathBuf};

    use super::*;

    fn cx(mode: Mode) -> Context {
        Context {
            nightly: "nightly-2026-05-03".to_owned(),
            mode,
        }
    }

    fn full() -> Context {
        cx(Mode::Full)
    }

    fn quick() -> Context {
        cx(Mode::Quick)
    }

    fn root() -> PathBuf {
        PathBuf::from("/repo")
    }

    fn commands(step: Step, cx: &Context) -> Vec<Command> {
        let invocations = match run(step, cx) {
            Run::InTurn(i) | Run::AtOnce(i) => i,
        };
        invocations.iter().map(|i| i.command(&root())).collect()
    }

    fn args(c: &Command) -> Vec<String> {
        c.get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect()
    }

    fn env(c: &Command, key: &str) -> Option<String> {
        c.get_envs()
            .find(|(k, _)| *k == OsStr::new(key))
            .and_then(|(_, v)| v)
            .map(|v| v.to_string_lossy().into_owned())
    }

    #[test]
    fn tests_run_the_shipped_crates_and_the_browser_crate() {
        let passes = commands(Step::CargoTest, &full());
        assert_eq!(
            args(&passes[0])[..4],
            ["test", "--workspace", "--exclude", "midiremap-wasm"]
        );
        assert_eq!(args(&passes[1])[..3], ["test", "-p", "midiremap-wasm"]);
    }

    #[test]
    fn the_two_cargo_passes_run_at_once() {
        assert!(matches!(run(Step::Clippy, &full()), Run::AtOnce(_)));
        assert!(matches!(run(Step::CargoTest, &full()), Run::AtOnce(_)));
        assert!(matches!(run(Step::Eslint, &full()), Run::InTurn(_)));
    }

    fn target_dir(c: &Command) -> Option<String> {
        env(c, "CARGO_TARGET_DIR")
    }

    fn under_root(dir: TargetDir) -> Option<String> {
        dir.path()
            .map(|p| root().join(p).to_string_lossy().into_owned())
    }

    #[test]
    fn clippy_builds_in_directories_of_its_own() {
        let passes = commands(Step::Clippy, &full());
        assert_eq!(target_dir(&passes[0]), under_root(TargetDir::Clippy));
        assert_eq!(target_dir(&passes[1]), under_root(TargetDir::ClippyBrowser));
    }

    #[test]
    fn the_shipped_tests_build_in_the_main_directory() {
        assert_eq!(target_dir(&commands(Step::CargoTest, &full())[0]), None);
    }

    #[test]
    fn the_browser_tests_build_in_a_directory_of_their_own() {
        let passes = commands(Step::CargoTest, &full());
        assert_eq!(target_dir(&passes[1]), under_root(TargetDir::Browser));
    }

    #[test]
    fn tests_skip_doctests() {
        let shipped = args(&commands(Step::CargoTest, &full())[0]);
        assert!(shipped.contains(&"--lib".to_owned()));
        assert!(shipped.contains(&"--bins".to_owned()));
        assert!(shipped.contains(&"--tests".to_owned()));
    }

    #[test]
    fn fmt_uses_the_pinned_nightly() {
        assert_eq!(
            args(&commands(Step::Fmt, &full())[0])[0],
            "+nightly-2026-05-03"
        );
    }

    #[test]
    fn app_steps_run_the_package_scripts_from_the_app_without_their_hooks() {
        let lint = &commands(Step::Eslint, &full())[0];
        assert_eq!(lint.get_program(), NPM);
        assert_eq!(lint.get_current_dir(), Some(root().join(APP).as_path()));
        assert_eq!(
            args(lint)[..5],
            ["run", "--silent", "--ignore-scripts", "lint", "--"]
        );
    }

    #[test]
    fn a_script_without_gate_flags_gets_no_separator() {
        assert_eq!(
            args(&commands(Step::Size, &full())[0]),
            ["run", "--silent", "--ignore-scripts", "size"]
        );
    }

    #[test]
    fn unit_tests_take_every_core() {
        let tests = &commands(Step::Vitest, &full())[0];
        assert_eq!(env(tests, "VITEST_WORKERS").as_deref(), Some("100%"));
    }

    #[test]
    fn browser_tests_take_three_quarters_of_the_cores() {
        let tests = &commands(Step::E2e, &full())[0];
        assert_eq!(env(tests, "E2E_WORKERS").as_deref(), Some("75%"));
    }

    #[test]
    fn the_site_generator_compiles_in_its_own_target_directory() {
        let compile = &commands(Step::CompileSite, &full())[0];
        assert_eq!(args(compile), ["build", "-p", SITE, "--locked"]);
        assert_eq!(target_dir(compile), under_root(TargetDir::Site));
    }

    #[test]
    fn the_site_builds_with_the_compiled_generator_into_the_app_build() {
        let site = &commands(Step::BuildSite, &full())[0];
        let program = root().join(format!("target/site/debug/{SITE}{EXE_SUFFIX}"));
        assert_eq!(site.get_program(), program.as_os_str());
        assert_eq!(site.get_current_dir(), Some(root().join(APP).as_path()));
        assert_eq!(args(site), ["dist"]);
    }

    #[test]
    fn the_quick_gate_builds_wasm_with_thin_lto() {
        let build = &commands(Step::BuildWasm, &quick())[0];
        assert_eq!(
            env(build, "CARGO_PROFILE_WASM_LTO").as_deref(),
            Some("thin")
        );
        assert_eq!(
            env(
                &commands(Step::BuildWasm, &full())[0],
                "CARGO_PROFILE_WASM_LTO"
            ),
            None
        );
    }

    #[test]
    fn the_quick_gate_runs_the_unit_tests_of_changed_files() {
        assert!(args(&commands(Step::Vitest, &quick())[0]).contains(&"--changed".to_owned()));
    }

    #[test]
    fn the_quick_gate_runs_changed_browser_tests_on_the_desktop() {
        let e2e = args(&commands(Step::E2e, &quick())[0]);
        assert!(e2e.contains(&"--only-changed".to_owned()));
        assert!(e2e.contains(&"--project=desktop".to_owned()));
    }

    #[test]
    fn cargo_test_sums_every_binary() {
        let log = "test result: ok. 249 passed; 0 failed; 0 ignored\n\
                   running 4 tests\n\
                   test result: FAILED. 3 passed; 1 failed; 0 ignored\n";
        assert_eq!(
            summary(Step::CargoTest, log),
            ["cargo   252 passed, 1 failed"]
        );
    }

    #[test]
    fn vitest_keeps_its_tests_line() {
        let log = " Test Files  120 passed (120)\n      Tests  1186 passed (1186)\n";
        assert_eq!(
            summary(Step::Vitest, log),
            ["      Tests  1186 passed (1186)"]
        );
    }

    #[test]
    fn e2e_keeps_the_last_four_count_lines() {
        let log =
            "  1 flaky\n  2 skipped\n  3 failed\n  4 passed\n  5 skipped\n  ok 1 [desktop] x\n";
        assert_eq!(
            summary(Step::E2e, log),
            ["  2 skipped", "  3 failed", "  4 passed", "  5 skipped"]
        );
    }

    #[test]
    fn size_keeps_every_line_the_budget_check_prints() {
        let log = "wasm    156916 B of 166000 B\njs      152332 B of 153000 B\n\n";
        assert_eq!(
            summary(Step::Size, log),
            [
                "wasm    156916 B of 166000 B",
                "js      152332 B of 153000 B"
            ]
        );
    }
}
