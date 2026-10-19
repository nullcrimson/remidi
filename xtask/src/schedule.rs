use std::{
    collections::BTreeMap,
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};

use crate::{
    plan::Plan,
    step::{Lane, Step},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    Passed(Duration),
    Failed(Duration),
    /// Not run because a step it waits for did not pass.
    Skipped(Step),
}

impl Outcome {
    pub fn passed(self) -> bool {
        matches!(self, Outcome::Passed(_))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum State {
    Waiting,
    Running,
    Done(Outcome),
}

fn capacity(lane: Lane) -> usize {
    match lane {
        Lane::Cargo | Lane::Node => 1,
        Lane::Free => usize::MAX,
    }
}

/// Where every step of a plan stands; deciding what runs next takes no threads.
pub struct Schedule<'p> {
    plan: &'p Plan,
    states: BTreeMap<Step, State>,
}

impl<'p> Schedule<'p> {
    pub fn new(plan: &'p Plan) -> Self {
        Self {
            plan,
            states: plan.steps().map(|s| (s, State::Waiting)).collect(),
        }
    }

    fn blocker(&self, step: Step) -> Option<Step> {
        step.needs().iter().copied().find(|&n| {
            self.plan.waits_for(step, n) && matches!(self.states[&n], State::Done(o) if !o.passed())
        })
    }

    fn ready(&self, step: Step) -> bool {
        self.states[&step] == State::Waiting
            && step.needs().iter().all(|&n| {
                !self.plan.waits_for(step, n)
                    || matches!(self.states[&n], State::Done(Outcome::Passed(_)))
            })
    }

    /// Skips every waiting step that waits for a step that did not pass, down the whole
    /// chain, and returns them in the order they were skipped.
    pub fn skip_blocked(&mut self) -> Vec<(Step, Outcome)> {
        let mut skipped = Vec::new();
        loop {
            let blocked: Vec<(Step, Step)> = self
                .states
                .iter()
                .filter(|(_, st)| **st == State::Waiting)
                .filter_map(|(&s, _)| self.blocker(s).map(|n| (s, n)))
                .collect();
            if blocked.is_empty() {
                return skipped;
            }
            for (step, need) in blocked {
                let outcome = Outcome::Skipped(need);
                self.states.insert(step, State::Done(outcome));
                skipped.push((step, outcome));
            }
        }
    }

    /// Marks running, and returns, the ready steps their lanes have room for, the
    /// highest-priority step first.
    pub fn start_ready(&mut self) -> Vec<Step> {
        let mut ready: Vec<Step> = self
            .states
            .keys()
            .copied()
            .filter(|&s| self.ready(s))
            .collect();
        ready.sort_by_key(|s| s.priority());
        let mut started = Vec::new();
        for step in ready {
            let busy = self
                .states
                .iter()
                .filter(|(&s, st)| **st == State::Running && s.lane() == step.lane())
                .count();
            if busy < capacity(step.lane()) {
                self.states.insert(step, State::Running);
                started.push(step);
            }
        }
        started
    }

    pub fn finish(&mut self, step: Step, outcome: Outcome) {
        self.states.insert(step, State::Done(outcome));
    }

    pub fn is_running(&self) -> bool {
        self.states.values().any(|st| *st == State::Running)
    }

    /// Every step's outcome once nothing runs and nothing more can start: each step has
    /// then passed, failed or been skipped, since every step's needs come before it.
    pub fn into_outcomes(self) -> BTreeMap<Step, Outcome> {
        self.states
            .into_iter()
            .map(|(s, st)| match st {
                State::Done(o) => (s, o),
                State::Waiting | State::Running => {
                    unreachable!("{} has no outcome when nothing runs", s.name())
                }
            })
            .collect()
    }
}

/// Runs every step of `plan` on its own thread as the schedule allows. `run` reports
/// whether a step passed; `done` hears each outcome as it happens.
pub fn run_plan(
    plan: &Plan,
    run: impl Fn(Step) -> bool + Sync,
    mut done: impl FnMut(Step, Outcome),
) -> BTreeMap<Step, Outcome> {
    let mut schedule = Schedule::new(plan);
    let (tx, rx) = mpsc::channel::<(Step, Outcome)>();
    thread::scope(|scope| loop {
        for (step, outcome) in schedule.skip_blocked() {
            done(step, outcome);
        }
        for step in schedule.start_ready() {
            let tx = tx.clone();
            let run = &run;
            scope.spawn(move || {
                let start = Instant::now();
                let outcome = if run(step) {
                    Outcome::Passed(start.elapsed())
                } else {
                    Outcome::Failed(start.elapsed())
                };
                tx.send((step, outcome)).ok();
            });
        }
        if !schedule.is_running() {
            break;
        }
        let (step, outcome) = rx.recv().expect("a running step always reports back");
        schedule.finish(step, outcome);
        done(step, outcome);
    });
    schedule.into_outcomes()
}

#[cfg(test)]
mod tests {
    use std::collections::VecDeque;

    use strum::VariantArray;

    use super::*;
    use crate::plan::{Selection, Target};

    #[derive(Debug, PartialEq, Eq, Clone, Copy)]
    enum Event {
        Start(Step),
        End(Step),
    }

    fn whole() -> Plan {
        Plan::new(&Selection::Whole)
    }

    fn partial(steps: &[Step]) -> Plan {
        Plan::new(&Selection::Partial(
            steps.iter().map(|&s| Target::Step(s)).collect(),
        ))
    }

    /// Plays `plan` without threads: steps end in the order they started, the ones in
    /// `fails` failing.
    fn play(plan: &Plan, fails: &[Step]) -> (Vec<Event>, BTreeMap<Step, Outcome>) {
        let mut schedule = Schedule::new(plan);
        let mut events = Vec::new();
        let mut running = VecDeque::new();
        loop {
            schedule.skip_blocked();
            for step in schedule.start_ready() {
                events.push(Event::Start(step));
                running.push_back(step);
            }
            let Some(step) = running.pop_front() else {
                break;
            };
            events.push(Event::End(step));
            let outcome = if fails.contains(&step) {
                Outcome::Failed(Duration::ZERO)
            } else {
                Outcome::Passed(Duration::ZERO)
            };
            schedule.finish(step, outcome);
        }
        (events, schedule.into_outcomes())
    }

    fn at(events: &[Event], e: Event) -> usize {
        events.iter().position(|&x| x == e).unwrap()
    }

    fn never_overlaps(events: &[Event], lane: Lane) -> bool {
        let mut running = 0;
        events.iter().all(|e| {
            match e {
                Event::Start(s) if s.lane() == lane => running += 1,
                Event::End(s) if s.lane() == lane => running -= 1,
                Event::Start(_) | Event::End(_) => {}
            }
            running <= 1
        })
    }

    #[test]
    fn the_whole_gate_runs_every_step_once() {
        let (events, outcomes) = play(&whole(), &[]);
        assert_eq!(outcomes.len(), Step::VARIANTS.len());
        assert!(outcomes.values().all(|o| o.passed()));
        assert_eq!(events.len(), 2 * Step::VARIANTS.len());
    }

    #[test]
    fn a_step_starts_only_after_what_it_needs_has_ended() {
        let (events, _) = play(&whole(), &[]);
        for step in Step::VARIANTS {
            for &need in step.needs() {
                assert!(at(&events, Event::End(need)) < at(&events, Event::Start(*step)));
            }
        }
    }

    #[test]
    fn cargo_steps_never_overlap() {
        assert!(never_overlaps(&play(&whole(), &[]).0, Lane::Cargo));
    }

    #[test]
    fn node_steps_never_overlap() {
        assert!(never_overlaps(&play(&whole(), &[]).0, Lane::Node));
    }

    #[test]
    fn the_wasm_build_takes_the_cargo_lane_before_the_rust_checks() {
        let plan = whole();
        let first = Schedule::new(&plan).start_ready();
        assert!(first.contains(&Step::BuildWasm));
        assert!(!first.contains(&Step::Clippy));
        assert!(!first.contains(&Step::CargoTest));
    }

    #[test]
    fn eslint_starts_while_the_wasm_build_runs() {
        let plan = whole();
        let mut schedule = Schedule::new(&plan);
        schedule.start_ready();
        schedule.finish(Step::GenI18n, Outcome::Passed(Duration::ZERO));
        assert!(schedule.start_ready().contains(&Step::Eslint));
        assert!(schedule.is_running());
    }

    #[test]
    fn a_failed_build_skips_the_whole_chain_below_it() {
        let plan = partial(&[Step::BuildWasm, Step::BuildApp, Step::BuildSite]);
        let (_, outcomes) = play(&plan, &[Step::BuildWasm]);
        assert_eq!(outcomes[&Step::BuildApp], Outcome::Skipped(Step::BuildWasm));
        assert_eq!(outcomes[&Step::BuildSite], Outcome::Skipped(Step::BuildApp));
    }

    #[test]
    fn a_failed_build_leaves_the_steps_that_do_not_need_it_running() {
        let (_, outcomes) = play(&whole(), &[Step::BuildWasm]);
        assert_eq!(outcomes[&Step::Tsc], Outcome::Skipped(Step::BuildWasm));
        assert_eq!(outcomes[&Step::E2e], Outcome::Skipped(Step::BuildSite));
        assert!(outcomes[&Step::Eslint].passed());
        assert!(outcomes[&Step::CargoTest].passed());
    }

    #[test]
    fn a_partial_run_takes_the_builds_it_leaves_out_as_done() {
        let (_, outcomes) = play(&partial(&[Step::Tsc]), &[]);
        assert_eq!(
            outcomes.keys().copied().collect::<Vec<_>>(),
            [Step::GenI18n, Step::Tsc]
        );
        assert!(outcomes.values().all(|o| o.passed()));
    }

    #[test]
    fn run_plan_runs_every_step_on_threads_and_reports_each_once() {
        let mut heard = Vec::new();
        let outcomes = run_plan(&whole(), |_| true, |s, _| heard.push(s));
        assert_eq!(outcomes.len(), Step::VARIANTS.len());
        heard.sort();
        assert_eq!(heard, Step::VARIANTS);
    }
}
