use std::{collections::BTreeSet, str::FromStr};

use strum::VariantArray;

use crate::step::{Group, Step};

/// A name on the command line: a group of steps or one step.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Target {
    Group(Group),
    Step(Step),
}

impl FromStr for Target {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.parse()
            .map(Target::Group)
            .or_else(|_| s.parse().map(Target::Step))
            .map_err(|_| {
                let groups: Vec<&str> = Group::VARIANTS.iter().map(|g| g.name()).collect();
                let steps: Vec<&str> = Step::VARIANTS.iter().map(|s| s.name()).collect();
                format!(
                    "unknown '{s}'; groups: {}; steps: {}",
                    groups.join(" "),
                    steps.join(" ")
                )
            })
    }
}

/// Whether a browser test file has changes in the working tree.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BrowserTests {
    Changed,
    Unchanged,
}

/// What the command line asked for.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Selection {
    Whole,
    Quick(BrowserTests),
    Partial(Vec<Target>),
}

/// How thoroughly the run checks: the full checks, or the quick local shortcut.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Full,
    Quick,
}

/// The steps one gate run executes, and how.
#[derive(Debug, PartialEq, Eq)]
pub struct Plan {
    steps: BTreeSet<Step>,
    mode: Mode,
}

impl Plan {
    /// The whole gate; the quick gate (every step but the size budgets, and the app and
    /// site builds and browser tests only when a browser test changed, since those are the
    /// browser tests it runs); or the named groups and steps plus the implied steps they
    /// need.
    pub fn new(selection: &Selection) -> Self {
        match selection {
            Selection::Whole => Self {
                steps: Step::VARIANTS.iter().copied().collect(),
                mode: Mode::Full,
            },
            Selection::Quick(browser) => {
                let builds = [
                    Step::BuildApp,
                    Step::CompileSite,
                    Step::BuildSite,
                    Step::E2e,
                ];
                Self {
                    steps: Step::VARIANTS
                        .iter()
                        .copied()
                        .filter(|&s| s != Step::Size)
                        .filter(|s| *browser == BrowserTests::Changed || !builds.contains(s))
                        .collect(),
                    mode: Mode::Quick,
                }
            }
            Selection::Partial(targets) => {
                let mut steps: BTreeSet<Step> = targets
                    .iter()
                    .flat_map(|t| match t {
                        Target::Group(g) => g.steps(),
                        Target::Step(s) => std::slice::from_ref(s),
                    })
                    .copied()
                    .collect();
                let implied: Vec<Step> = steps
                    .iter()
                    .flat_map(|s| s.needs().iter().copied())
                    .filter(|n| n.implied())
                    .collect();
                steps.extend(implied);
                Self {
                    steps,
                    mode: Mode::Full,
                }
            }
        }
    }

    pub fn steps(&self) -> impl Iterator<Item = Step> + '_ {
        self.steps.iter().copied()
    }

    pub fn mode(&self) -> Mode {
        self.mode
    }

    /// Whether `step` waits for `need` in this run: only when `need` runs too, since a
    /// partial run takes the rest as done.
    pub fn waits_for(&self, step: Step, need: Step) -> bool {
        step.needs().contains(&need) && self.steps.contains(&need)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn partial(args: &[&str]) -> Plan {
        Plan::new(&Selection::Partial(
            args.iter().map(|a| a.parse().unwrap()).collect(),
        ))
    }

    fn names(p: &Plan) -> Vec<&'static str> {
        p.steps().map(|s| s.name()).collect()
    }

    #[test]
    fn the_whole_gate_runs_every_step() {
        assert_eq!(
            Plan::new(&Selection::Whole).steps().count(),
            Step::VARIANTS.len()
        );
    }

    #[test]
    fn a_group_expands_to_its_steps() {
        assert_eq!(names(&partial(&["rust"])), ["fmt", "clippy", "cargo-test"]);
        assert_eq!(names(&partial(&["dist"])), ["size", "e2e"]);
    }

    #[test]
    fn app_steps_bring_the_generated_i18n_types_but_not_the_wasm_build() {
        assert_eq!(
            names(&partial(&["app"])),
            ["gen-i18n", "eslint", "tsc", "vitest"]
        );
        assert_eq!(names(&partial(&["tsc"])), ["gen-i18n", "tsc"]);
    }

    #[test]
    fn a_partial_run_waits_only_for_the_steps_it_runs() {
        assert!(partial(&["tsc", "build-wasm"]).waits_for(Step::Tsc, Step::BuildWasm));
        assert!(!partial(&["tsc"]).waits_for(Step::Tsc, Step::BuildWasm));
        assert!(partial(&["tsc"]).waits_for(Step::Tsc, Step::GenI18n));
    }

    #[test]
    fn an_unknown_name_lists_the_groups_and_steps() {
        let err = "lint".parse::<Target>().unwrap_err();
        assert!(err.starts_with("unknown 'lint'; groups: rust app dist; steps: fmt clippy"));
    }

    #[test]
    fn the_quick_gate_skips_the_size_budgets() {
        assert!(!names(&Plan::new(&Selection::Quick(BrowserTests::Changed))).contains(&"size"));
        assert!(!names(&Plan::new(&Selection::Quick(BrowserTests::Unchanged))).contains(&"size"));
    }

    #[test]
    fn the_quick_gate_builds_and_runs_browser_tests_only_when_one_changed() {
        let changed = names(&Plan::new(&Selection::Quick(BrowserTests::Changed)));
        let unchanged = names(&Plan::new(&Selection::Quick(BrowserTests::Unchanged)));
        assert!(changed.contains(&"build-site") && changed.contains(&"e2e"));
        assert!(!unchanged.contains(&"build-site") && !unchanged.contains(&"e2e"));
        assert!(unchanged.contains(&"vitest"));
    }

    #[test]
    fn building_the_site_brings_its_generator() {
        assert_eq!(
            names(&partial(&["build-site"])),
            ["compile-site", "build-site"]
        );
    }
}
