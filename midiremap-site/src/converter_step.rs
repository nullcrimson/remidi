/// A step of the converter.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConverterStep {
    File,
    Engines,
    Convert,
}

/// The converter's steps in the order it shows them.
const ALL: [ConverterStep; 3] = [
    ConverterStep::File,
    ConverterStep::Engines,
    ConverterStep::Convert,
];

/// Where a step stands: finished, the one to do now, or one that waits for an earlier step.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StepState {
    Done,
    Current,
    Later,
}

impl StepState {
    /// The name the stylesheet dresses its badge by, the converter's own.
    pub fn key(self) -> &'static str {
        match self {
            Self::Done => "done",
            Self::Current => "current",
            Self::Later => "later",
        }
    }
}

/// A step as a page lists it: the number its badge shows, from 1, and where it stands.
pub struct ShownStep<S> {
    pub step: S,
    pub number: usize,
    pub state: StepState,
}

/// `steps` as a page lists them: each one done when `done` says so, the first undone one
/// current, as the converter decides them.
pub fn shown_steps<S: Copy, const N: usize>(
    steps: [S; N],
    done: impl Fn(S) -> bool,
) -> [ShownStep<S>; N] {
    let current = steps.iter().position(|&step| !done(step));
    std::array::from_fn(|i| ShownStep {
        step: steps[i],
        number: i + 1,
        state: if done(steps[i]) {
            StepState::Done
        } else if current == Some(i) {
            StepState::Current
        } else {
            StepState::Later
        },
    })
}

/// The converter's steps, in its order, with `done` the finished ones.
pub fn converter_steps(done: &[ConverterStep]) -> [ShownStep<ConverterStep>; 3] {
    shown_steps(ALL, |step| done.contains(&step))
}

#[cfg(test)]
mod tests {
    use serde::Deserialize;

    use super::*;

    #[test]
    fn converter_steps_are_numbered_in_the_converters_order() {
        let numbered: Vec<(ConverterStep, usize)> = converter_steps(&[])
            .iter()
            .map(|s| (s.step, s.number))
            .collect();
        assert_eq!(
            numbered,
            [
                (ConverterStep::File, 1),
                (ConverterStep::Engines, 2),
                (ConverterStep::Convert, 3)
            ]
        );
    }

    #[derive(Deserialize)]
    struct RecordedStates {
        done: [bool; 3],
        states: [String; 3],
    }

    #[test]
    fn step_states_match_the_recorded_cases() {
        let cases: Vec<RecordedStates> =
            serde_json::from_str(include_str!("../tests/golden/step-states.json")).unwrap();
        assert!(!cases.is_empty());
        for case in cases {
            let done: Vec<ConverterStep> = ALL
                .into_iter()
                .zip(case.done)
                .filter_map(|(step, done)| done.then_some(step))
                .collect();
            let keys = converter_steps(&done).map(|s| s.state.key());
            assert_eq!(
                keys,
                case.states.each_ref().map(String::as_str),
                "{:?}",
                case.done
            );
        }
    }
}
