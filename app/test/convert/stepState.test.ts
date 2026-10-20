import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stepStates, type StepState } from '../../src/convert/stepState';
import { CONVERTER_STEPS } from '../../src/locale/docs';
import css from '../../src/index.css?raw';

const CASES = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'midiremap-site', 'tests', 'golden', 'step-states.json'),
  'utf8',
)) as { done: boolean[]; states: StepState[] }[];

const badge = css.slice(css.indexOf('@utility step-badge {'), css.indexOf('\n}\n', css.indexOf('@utility step-badge {')));

describe('stepStates', () => {
  it.each(CASES)('decides $done as the pages do', ({ done, states }) => {
    const decided = stepStates({ file: done[0], engines: done[1], convert: done[2] });
    expect(CONVERTER_STEPS.map(({ key }) => decided[key])).toEqual(states);
  });

  it.each([...new Set(CASES.flatMap((c) => c.states))])('dresses the %s badge from the stylesheet', (state) => {
    expect(badge).toContain(`&[data-state='${state}'] {`);
  });
});
