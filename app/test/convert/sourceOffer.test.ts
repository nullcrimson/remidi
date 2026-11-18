import { describe, expect, it } from 'vitest';
import { offeredAdvice, suggestedEngine } from '../../src/convert/sourceOffer';
import type { Advised } from '../../src/core/midiremap';
import { advisedOf, engineId } from '../typed';

const ADVISED = advisedOf('sd3', 'ezd', { kind: 'suggest', missing: 3, hits: 10, engine: 'mm', recognized: 10, ask: null });
const OFFERED = { ...ADVISED.advice, source: 'sd3' };
const TARGET = advisedOf('sd3', 'ezd', { kind: 'looksLikeTarget', missing: 3, hits: 10, recognized: 10, ask: 'kick' });

const offered = (advised: Advised | null, src: string | null, tgt: string | null = 'ezd', srcEdits = {}) =>
  offeredAdvice(advised, src === null ? null : engineId(src), tgt === null ? null : engineId(tgt), srcEdits);

describe('offeredAdvice', () => {
  it('offers the advice for the chosen source and target, naming the source', () => {
    expect(offered(ADVISED, 'sd3')).toEqual(OFFERED);
  });

  it('offers the target when the advice names it, naming the source and the target', () => {
    expect(offered(TARGET, 'sd3')).toEqual({ ...TARGET.advice, source: 'sd3', target: 'ezd' });
  });

  it('offers nothing for a source that fits', () => {
    expect(offered(advisedOf('sd3', 'ezd', { kind: 'fits' }), 'sd3')).toBeNull();
  });

  it('offers nothing for a source that no engine reads better', () => {
    expect(offered(advisedOf('sd3', 'ezd', { kind: 'unknown' }), 'sd3')).toBeNull();
  });

  it('offers nothing before the advice arrives', () => {
    expect(offered(null, 'sd3')).toBeNull();
  });

  it('offers nothing before a source is chosen', () => {
    expect(offered(ADVISED, null)).toBeNull();
  });

  it('offers nothing from an advice for another source, which is stale', () => {
    expect(offered(ADVISED, 'mm')).toBeNull();
  });

  it('offers nothing from an advice for another target, which is stale', () => {
    expect(offered(ADVISED, 'sd3', 'gm')).toBeNull();
  });

  it('offers nothing from an advice for a target once none is chosen, which is stale', () => {
    expect(offered(ADVISED, 'sd3', null)).toBeNull();
  });

  it('offers nothing while source notes are edited, since the edits change what the source recognizes', () => {
    expect(offered(ADVISED, 'sd3', 'ezd', { 40: 'snare1.hit' })).toBeNull();
  });
});

describe('suggestedEngine', () => {
  it('is the engine suggested', () => {
    expect(suggestedEngine(offered(ADVISED, 'sd3'))).toBe('mm');
  });

  it('is nothing when the target is named', () => {
    expect(suggestedEngine(offered(TARGET, 'sd3'))).toBeNull();
  });

  it('is nothing when nothing is offered', () => {
    expect(suggestedEngine(null)).toBeNull();
  });
});
