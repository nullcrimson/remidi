mod command;
mod plan;
mod schedule;
mod step;

use std::{
    collections::BTreeMap,
    fs::{self, File},
    io,
    path::{Path, PathBuf},
    process::{Command, ExitCode, Stdio},
    thread,
    time::{Duration, Instant},
};

use anyhow::{bail, Context as _, Result};
use clap::{Parser, Subcommand};

use crate::{
    command::{Context, Invocation, Run, APP},
    plan::{BrowserTests, Plan, Selection, Target},
    schedule::{run_plan, Outcome},
    step::Step,
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
}

impl Gate {
    fn new(plan: &Plan) -> Result<Self> {
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
        Ok(Self {
            root,
            logs,
            host,
            cx: Context::new(nightly, plan),
        })
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
            Outcome::Skipped(need) => println!("skipped {name}  (needs {})", need.name()),
        }
    }

    /// The closing summary: the counts each passed step's log reports.
    fn summarize(&self, outcomes: &BTreeMap<Step, Outcome>) -> Result<()> {
        for (&step, _) in outcomes.iter().filter(|(_, o)| o.passed()) {
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

fn gate(selection: &Selection) -> Result<ExitCode> {
    let plan = Plan::new(selection);
    let gate = Gate::new(&plan)?;
    let start = Instant::now();
    let outcomes = run_plan(
        &plan,
        |step| {
            gate.run(step).unwrap_or_else(|e| {
                eprintln!("{}: {e:#}", step.name());
                false
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
        Task::Gate { quick: true, .. } => gate(&Selection::Quick(browser_tests(&root())?)),
        Task::Gate { targets, .. } if targets.is_empty() => gate(&Selection::Whole),
        Task::Gate { targets, .. } => gate(&Selection::Partial(targets)),
    }
}
