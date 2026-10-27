use std::{env::consts::EXE_SUFFIX, path::Path, process::Command};

use anyhow::{bail, Context as _, Result};

use crate::{
    plan::{Mode, Plan},
    step::{CargoPass, Step, TargetDir, Urgency, DIST},
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

/// The site generator `Step::CompileSite` builds, from the repository root.
pub fn site_program() -> String {
    let dir = TargetDir::Site
        .path()
        .expect("the site generator builds into a directory of its own");
    format!("{dir}/debug/{SITE}{EXE_SUFFIX}")
}

/// What `command` prints when it runs and succeeds.
pub fn checked_output(command: &mut Command) -> Result<Vec<u8>> {
    let shown = std::iter::once(command.get_program())
        .chain(command.get_args().take(1))
        .map(|part| part.to_string_lossy())
        .collect::<Vec<_>>()
        .join(" ");
    let out = command
        .output()
        .with_context(|| format!("cannot run {shown}"))?;
    if !out.status.success() {
        bail!(
            "{shown} failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        );
    }
    Ok(out.stdout)
}

/// What an invocation starts, and where.
#[derive(Clone, Debug, PartialEq, Eq)]
enum Program {
    /// cargo from the repository root, building into the directory.
    Cargo(TargetDir),
    /// npm from the app directory.
    Npm,
    /// The site generator the gate built, from the repository root.
    Site,
}

impl Program {
    fn path(&self) -> String {
        match self {
            Program::Cargo(_) => "cargo".to_owned(),
            Program::Npm => NPM.to_owned(),
            Program::Site => site_program(),
        }
    }
}

/// One program a step runs.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Invocation {
    program: Program,
    args: Vec<String>,
    env: Vec<(&'static str, &'static str)>,
    urgency: Urgency,
}

impl Invocation {
    fn new(program: Program, args: &[&str]) -> Self {
        Self {
            program,
            args: args.iter().map(|&a| a.to_owned()).collect(),
            env: Vec::new(),
            urgency: Urgency::Chain,
        }
    }

    fn cargo(args: &[&str]) -> Self {
        Self::new(Program::Cargo(TargetDir::Main), args)
    }

    /// `npm run <script>` without the script's pre-hooks: the package's scripts own the
    /// commands, the gate adds only its own flags and runs the needed steps itself.
    fn npm(script: &str, flags: &[&str]) -> Self {
        let mut args = vec!["run", "--silent", "--ignore-scripts", script];
        if !flags.is_empty() {
            args.push("--");
            args.extend(flags);
        }
        Self::new(Program::Npm, &args)
    }

    fn with_env(mut self, key: &'static str, value: &'static str) -> Self {
        self.env.push((key, value));
        self
    }

    /// The site generator that `Step::CompileSite` built, run on the app's build.
    fn site() -> Self {
        Self::new(Program::Site, &[DIST])
    }

    pub fn program(&self) -> String {
        self.program.path()
    }

    /// The process to start, from the repository `root`; a target directory of its own
    /// becomes `CARGO_TARGET_DIR`, so the command neither waits for nor invalidates the main
    /// one.
    pub fn command(&self, root: &Path) -> Command {
        let mut command = match &self.program {
            Program::Cargo(_) | Program::Npm => Command::new(self.program.path()),
            Program::Site => Command::new(root.join(self.program.path())),
        };
        if self.urgency == Urgency::Background {
            lower_priority(&mut command);
        }
        command
            .args(&self.args)
            .current_dir(match self.program {
                Program::Npm => root.join(APP),
                Program::Cargo(_) | Program::Site => root.to_path_buf(),
            })
            .envs(self.env.iter().copied());
        if let Program::Cargo(dir) = self.program {
            if let Some(path) = dir.path() {
                command.env("CARGO_TARGET_DIR", root.join(path));
            }
        }
        command
    }
}

/// Starts `command` below normal priority; its children inherit it.
#[cfg(windows)]
fn lower_priority(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x0000_4000;
    command.creation_flags(BELOW_NORMAL_PRIORITY_CLASS);
}

/// Starts `command` below normal priority; its children inherit it.
#[cfg(unix)]
fn lower_priority(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    const BELOW_NORMAL_NICENESS: libc::c_int = 10;
    // SAFETY: the closure runs in the forked child before exec and calls only `nice`, which
    // is async-signal-safe; it touches no memory shared with the parent.
    unsafe {
        command.pre_exec(|| {
            libc::nice(BELOW_NORMAL_NICENESS);
            Ok(())
        });
    }
}

/// A step's programs: one after another, or all at once (the two cargo passes, which build
/// into separate target directories).
#[derive(Debug, PartialEq, Eq)]
pub enum Run {
    InTurn(Vec<Invocation>),
    AtOnce(Vec<Invocation>),
}

/// The cargo commands of `step`, one in each build directory it builds into, each with the
/// arguments `args` gives its pass.
fn cargo_passes(step: Step, args: impl Fn(CargoPass) -> Vec<&'static str>) -> Vec<Invocation> {
    step.target_dirs()
        .map(|(pass, dir)| Invocation::new(Program::Cargo(dir), &args(pass)))
        .collect()
}

/// `command` over the shipped crates and over the browser crate, at once.
fn both_passes(step: Step, command: &'static str, tail: &'static [&'static str]) -> Run {
    Run::AtOnce(cargo_passes(step, |pass| {
        let crates: &[&str] = match pass {
            CargoPass::Shipped => &SHIPPED,
            CargoPass::Browser => &BROWSER,
        };
        std::iter::once(command)
            .chain(crates.iter().copied())
            .chain(tail.iter().copied())
            .collect()
    }))
}

impl Run {
    fn at(self, urgency: Urgency) -> Self {
        let set = |invocations: Vec<Invocation>| {
            invocations
                .into_iter()
                .map(|inv| Invocation { urgency, ..inv })
                .collect()
        };
        match self {
            Run::InTurn(i) => Run::InTurn(set(i)),
            Run::AtOnce(i) => Run::AtOnce(set(i)),
        }
    }
}

/// The programs `step` runs, at the step's urgency.
pub fn run(step: Step, cx: &Context) -> Run {
    programs(step, cx).at(step.urgency())
}

/// The programs `step` runs. The unit tests take every core, the browser tests three
/// quarters: at every core their page loads ran past the time limit.
fn programs(step: Step, cx: &Context) -> Run {
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
        Step::CompileSite => Run::InTurn(cargo_passes(step, |_| {
            vec!["build", "-p", SITE, "--locked"]
        })),
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
    fn the_steps_off_the_chain_to_the_browser_tests_run_below_normal_priority() {
        let urgencies = |step| match run(step, &full()) {
            Run::InTurn(i) | Run::AtOnce(i) => i.iter().map(|inv| inv.urgency).collect::<Vec<_>>(),
        };
        assert_eq!(
            urgencies(Step::CargoTest),
            [Urgency::Background, Urgency::Background]
        );
        assert_eq!(urgencies(Step::E2e), [Urgency::Chain]);
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
        assert_eq!(site.get_current_dir(), Some(root().as_path()));
        assert_eq!(args(site), [DIST]);
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
