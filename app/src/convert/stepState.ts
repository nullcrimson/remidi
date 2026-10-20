import { CONVERTER_STEPS, type ConverterStep } from '../locale/docs';

/** Where a step stands: finished, the one to do now, or one that waits for an earlier step. */
export type StepState = 'done' | 'current' | 'later';

/** Each step's state: done when its own work is, the first undone one in order current. */
export function stepStates(done: Record<ConverterStep, boolean>): Record<ConverterStep, StepState> {
  const current = CONVERTER_STEPS.find(({ key }) => !done[key])?.key;
  const state = (key: ConverterStep): StepState => (done[key] ? 'done' : key === current ? 'current' : 'later');
  return { file: state('file'), engines: state('engines'), convert: state('convert') };
}
