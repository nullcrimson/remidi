mod command;
mod memo;
mod plan;
mod schedule;
mod step;

use std::{
    collections::BTreeMap,
    fs::{self, File},
    io,
    path::{Path, PathBuf},
    process::{Command, ExitCode, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use anyhow::{bail, Context as _, Result};
use clap::{Parser, Subcommand};

use crate::{
    command::{Context, Invocation, Run, APP},
    memo::{Passes, Policy},
    plan::{BrowserTests, Mode, Plan, Selection, Target},
    schedule::{run_plan, Outcome, Verdict},
    step::{Kept, Step, DIST, DIST_BUILD},
};

#[derive(Parser)]
#[command(about = "Drumverter's project tasks")]
struct Cli {
    #[command(subcommand)]
    task: Task,
}

#[derive(Subcommand)]
enum Task {
    /// Every check, or the named groups (rust, app, dist) and steps; logs in target/gate/.
    Gate {
        targets: Vec<Target>,
        /// The quick local gate: changed unit tests, changed browser tests on the desktop
        /// only, wasm with thin LTO, no size budgets. CI runs the full gate.
        #[arg(long, conflicts_with = "targets")]
        quick: bool,
        /// Runs every check, even one that passed before with nothing it reads changed.
        #[arg(long, conflicts_with = "quick")]
        fresh: bool,
    },
}

/// Where the gate runs: on a developer's machine, or in CI, which prints a failed step's
/// log.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Host {
    Local,
    Ci,
}

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("xtask lives one level below the workspace root")
        .to_path_buf()
}

struct Gate {
    root: PathBuf,
    logs: PathBuf,
    host: Host,
    cx: Context,
    policy: Policy,
    toolchains: String,
    passes: Mutex<Passes>,
}

/// The versions of the tools the checks run, which a kept pass depends on.
fn toolchains(root: &Path, nightly: &str) -> Result<String> {
    let mut versions = vec![nightly.to_owned()];
    for (program, args) in [("rustc", ["-vV"]), ("node", ["--version"])] {
        let out = Command::new(program)
            .args(args)
            .current_dir(root)
            .output()
            .with_context(|| format!("cannot run {program}"))?;
        if !out.status.success() {
            bail!("{program} {} failed", args.join(" "));
        }
        versions.push(String::from_utf8_lossy(&out.stdout).trim().to_owned());
    }
    Ok(versions.join("\n"))
}

impl Gate {
    fn new(plan: &Plan, fresh: bool) -> Result<Self> {
        let root = root();
        let logs = root.join("target").join("gate");
        fs::create_dir_all(&logs).with_context(|| format!("cannot create {}", logs.display()))?;
        let nightly = fs::read_to_string(root.join("nightly-toolchain"))
            .context("cannot read nightly-toolchain")?
            .trim()
            .to_owned();
        let host = if std::env::var_os("CI").is_some() {
            Host::Ci
        } else {
            Host::Local
        };
        let policy = match (host, plan.mode(), fresh) {
            (Host::Ci, _, _) => Policy::Off,
            (Host::Local, Mode::Quick, _) => Policy::ReadOnly,
            (Host::Local, Mode::Full, true) => Policy::Fresh,
            (Host::Local, Mode::Full, false) => Policy::Reuse,
        };
        Ok(Self {
            toolchains: toolchains(&root, &nightly)?,
            passes: Mutex::new(Passes::load(logs.join("passes.json"))),
            policy,
            cx: Context::new(nightly, plan),
            root,
            logs,
            host,
        })
    }

    /// Runs `step`, or finds it cached when it passed before with everything it reads
    /// unchanged (and for a build of `DIST`, `DIST` as the site build left it); keeps the
    /// result for the next run as the policy allows.
    fn verdict(&self, step: Step) -> Result<Verdict> {
        let ran = |passed| {
            if passed {
                Verdict::Passed
            } else {
                Verdict::Failed
            }
        };
        let (key, reads, dist) = match step.kept() {
            _ if self.policy == Policy::Off => return Ok(ran(self.run(step)?)),
            Kept::Never => return Ok(ran(self.run(step)?)),
            Kept::Check(reads) => (step.name(), reads, None),
            Kept::Dist { finishes } => (DIST, DIST_BUILD, Some(finishes)),
        };
        let read = memo::fingerprint(&self.root, key, &reads, &self.toolchains)?;
        let left = || memo::left(&self.root, DIST);
        let passes = || {
            self.passes
                .lock()
                .expect("no thread panics holding the passes")
        };
        if self.policy.reads() {
            let now = dist.map(|_| left()).transpose()?;
            if passes().has(key, &read, now.as_ref()) {
                return Ok(Verdict::Cached);
            }
        }
        let passed = self.run(step)?;
        if self.policy.writes() {
            match dist {
                None => passes().record(key, read, None, passed)?,
                Some(true) => {
                    let after = if passed { Some(left()?) } else { None };
                    passes().record(key, read, after, passed)?;
                }
                Some(false) => {}
            }
        }
        Ok(ran(passed))
    }

    fn log(&self, step: Step) -> PathBuf {
        self.logs.join(format!("{}.log", step.name()))
    }

    fn spawn(&self, inv: &Invocation, log: &File) -> Result<bool> {
        let status = inv
            .command(&self.root)
            .stdin(Stdio::null())
            .stdout(log.try_clone()?)
            .stderr(log.try_clone()?)
            .status()
            .with_context(|| format!("cannot start {}", inv.program()))?;
        Ok(status.success())
    }

    fn run(&self, step: Step) -> Result<bool> {
        match command::run(step, &self.cx) {
            Run::InTurn(invocations) => {
                let log = File::create(self.log(step))?;
                for inv in &invocations {
                    if !self.spawn(inv, &log)? {
                        return Ok(false);
                    }
                }
                Ok(true)
            }
            Run::AtOnce(invocations) => self.run_at_once(step, &invocations),
        }
    }

    /// Runs the invocations together, each into a log of its own, then joins the logs in
    /// order into the step's log.
    fn run_at_once(&self, step: Step, invocations: &[Invocation]) -> Result<bool> {
        let parts: Vec<PathBuf> = (0..invocations.len())
            .map(|i| self.logs.join(format!("{}.{i}.log", step.name())))
            .collect();
        let passed = thread::scope(|scope| {
            let runs: Vec<_> = invocations
                .iter()
                .zip(&parts)
                .map(|(inv, part)| {
                    scope.spawn(move || {
                        File::create(part)
                            .map_err(Into::into)
                            .and_then(|log| self.spawn(inv, &log))
                    })
                })
                .collect();
            runs.into_iter()
                .map(|r| r.join().expect("a pass thread does not panic"))
                .collect::<Result<Vec<bool>>>()
        })?;
        let mut log = File::create(self.log(step))?;
        for part in &parts {
            io::copy(&mut File::open(part)?, &mut log)?;
            fs::remove_file(part)?;
        }
        Ok(passed.into_iter().all(|p| p))
    }

    fn report(&self, step: Step, outcome: Outcome) {
        let name = step.name();
        match outcome {
            Outcome::Passed(span) => println!("ok      {name} {}s", span.took.as_secs()),
            Outcome::Failed(span) => {
                let log = self.log(step);
                let shown = log.strip_prefix(&self.root).unwrap_or(&log);
                println!(
                    "FAILED  {name} {}s  {}",
                    span.took.as_secs(),
                    shown.display()
                );
                if self.host == Host::Ci {
                    match fs::read_to_string(&log) {
                        Ok(text) => print!("{text}"),
                        Err(e) => println!("cannot read {}: {e}", log.display()),
                    }
                }
            }
            Outcome::Cached(_) => println!("cached  {name}"),
            Outcome::Skipped(need) => println!("skipped {name}  (needs {})", need.name()),
        }
    }

    /// The closing summary: the counts the log of each step that ran and passed reports.
    fn summarize(&self, outcomes: &BTreeMap<Step, Outcome>) -> Result<()> {
        for (&step, _) in outcomes
            .iter()
            .filter(|(_, o)| matches!(o, Outcome::Passed(_)))
        {
            let log = self.log(step);
            let text = fs::read_to_string(&log)
                .with_context(|| format!("cannot read {}", log.display()))?;
            for line in command::summary(step, &text) {
                println!("{line}");
            }
        }
        Ok(())
    }

    fn timings(&self, outcomes: &BTreeMap<Step, Outcome>, total: Duration) -> Result<()> {
        let steps: Vec<serde_json::Value> = outcomes
            .iter()
            .map(|(s, o)| {
                let (result, span) = match o {
                    Outcome::Passed(span) => ("ok", Some(span)),
                    Outcome::Failed(span) => ("failed", Some(span)),
                    Outcome::Cached(span) => ("cached", Some(span)),
                    Outcome::Skipped(_) => ("skipped", None),
                };
                serde_json::json!({
                    "step": s.name(),
                    "result": result,
                    "start": span.map(|t| t.start.as_secs_f64()),
                    "secs": span.map(|t| t.took.as_secs_f64()),
                })
            })
            .collect();
        let json = serde_json::json!({ "steps": steps, "total": total.as_secs_f64() });
        fs::write(self.logs.join("timings.json"), format!("{json:#}\n"))?;
        Ok(())
    }
}

fn browser_tests(root: &Path) -> Result<BrowserTests> {
    let out = Command::new("git")
        .args(["status", "--porcelain", "--", "e2e"])
        .current_dir(root.join(APP))
        .output()
        .context("cannot run git status")?;
    if !out.status.success() {
        bail!(
            "git status failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        );
    }
    Ok(if out.stdout.is_empty() {
        BrowserTests::Unchanged
    } else {
        BrowserTests::Changed
    })
}

fn gate(selection: &Selection, fresh: bool) -> Result<ExitCode> {
    let plan = Plan::new(selection);
    let gate = Gate::new(&plan, fresh)?;
    let start = Instant::now();
    let outcomes = run_plan(
        &plan,
        |step| {
            gate.verdict(step).unwrap_or_else(|e| {
                eprintln!("{}: {e:#}", step.name());
                Verdict::Failed
            })
        },
        |step, outcome| gate.report(step, outcome),
    );
    let total = start.elapsed();
    println!();
    gate.summarize(&outcomes)?;
    println!("gate    {}s", total.as_secs());
    gate.timings(&outcomes, total)?;
    Ok(if outcomes.values().all(|o| o.passed()) {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    })
}

fn main() -> Result<ExitCode> {
    match Cli::parse().task {
        Task::Gate { quick: true, .. } => gate(&Selection::Quick(browser_tests(&root())?), false),
        Task::Gate { targets, fresh, .. } if targets.is_empty() => gate(&Selection::Whole, fresh),
        Task::Gate { targets, fresh, .. } => gate(&Selection::Partial(targets), fresh),
    }
}
