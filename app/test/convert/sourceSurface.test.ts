import { describe, expect, it } from 'vitest';
import type { Offered } from '../../src/convert/sourceOffer';
import { sourceStage, sourceSurface } from '../../src/convert/sourceSurface';
import type { Conv } from '../../src/convert/useConverter';
import type { QuestionState } from '../../src/convert/useSourceQuestion';
import type { FileResult } from '../../src/core/files';
import { enginePair, typed } from '../typed';

const OFFERED = typed<Offered>({ kind: 'suggest', missing: 3, hits: 10, engine: 'ggd_mm', recognized: 10, ask: 'kick', source: 'ggd_invasion' });
const RESULT = typed<FileResult>({ name: 'a-ezd.mid', url: 'blob:a', bytes: new Uint8Array(), report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1, merged: 0, read: 1, lost: 0 }, damage: [], input: { name: 'a.mid', bytes: new Uint8Array() }, picked: [], offers: [] });
const DONE: Conv = { kind: 'done', pair: enginePair('ggd_invasion', 'ezdrummer'), results: [RESULT], failures: [], heavy: false };
const IDLE: Conv = { kind: 'idle' };

const offer = (kind: Exclude<QuestionState['kind'], 'none'>): QuestionState => ({ kind, offered: OFFERED });
const NONE: QuestionState = { kind: 'none' };

const surfaceOf = (conv: Conv, state: QuestionState, unrecognized: number) =>
  sourceSurface(sourceStage(conv, state, unrecognized));

describe('sourceSurface', () => {
  it('shows the notice, with what is offered, while something is offered', () => {
    expect(surfaceOf(IDLE, offer('offered'), 0)).toEqual({ kind: 'notice', offered: OFFERED });
  });

  it('shows the notice, with what is offered, while Convert would ask and the question is not open', () => {
    expect(surfaceOf(IDLE, offer('due'), 0)).toEqual({ kind: 'notice', offered: OFFERED });
  });

  it('shows the question, and not the notice, while the question is open', () => {
    expect(surfaceOf(IDLE, offer('open'), 0)).toEqual({ kind: 'question', offered: OFFERED });
  });

  it('shows nothing while setting up when nothing is offered', () => {
    expect(surfaceOf(IDLE, NONE, 0)).toEqual({ kind: 'none' });
  });

  it('shows the done card block once a file is converted, whatever else is offered or open', () => {
    expect(surfaceOf(DONE, offer('open'), 4)).toEqual({ kind: 'done' });
  });

  it('shows nothing on a done card without unrecognized notes', () => {
    expect(surfaceOf(DONE, offer('offered'), 0)).toEqual({ kind: 'none' });
  });

  it('treats a run that converted no file as still setting up', () => {
    expect(surfaceOf({ ...DONE, results: [] }, offer('offered'), 0)).toEqual({ kind: 'notice', offered: OFFERED });
  });
});
