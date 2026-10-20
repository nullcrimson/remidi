/** Where a step stands: finished, the one to do now, or one that waits for an earlier step. */
export type StepState = 'done' | 'current' | 'later';

/** The states of steps in order: each one done when its own work is, the first undone one current. */
export function stepStates(done: boolean[]): StepState[] {
  const current = done.indexOf(false);
  return done.map((d, i) => (d ? 'done' : i === current ? 'current' : 'later'));
}
