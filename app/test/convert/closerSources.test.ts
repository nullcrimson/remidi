import { describe, expect, it } from 'vitest';
import { closerSources } from '../../src/convert/closerSources';
import type { SourceFits } from '../../src/core/midiremap';
import { engineId, typed } from '../typed';

const fit = (engine: string, recognized: number) => ({ engine, recognized });

const fits = (hits: number, ...ranked: { engine: string; recognized: number }[]) => typed<SourceFits>({ hits, ranked });

const FITS = fits(10, fit('mm', 10), fit('rock', 9), fit('ezd', 8), fit('sd3', 7), fit('inv', 6), fit('none', 0));

const closer = (all: SourceFits, src: string, tgt: string | null = null) =>
  closerSources(all, engineId(src), tgt === null ? null : engineId(tgt));

describe('closerSources', () => {
  it('says what the source misses and offers the engines that recognize more, best first', () => {
    expect(closer(FITS, 'sd3')).toEqual({
      missing: 3,
      hits: 10,
      better: [
        { ...fit('mm', 10), rank: 1, complete: true },
        { ...fit('rock', 9), rank: 2, complete: false },
        { ...fit('ezd', 8), rank: 3, complete: false },
      ],
    });
  });

  it('offers at most three engines', () => {
    expect(closer(FITS, 'none')?.better.map((f) => f.engine)).toEqual(['mm', 'rock', 'ezd']);
  });

  it('offers only the engines that recognize more than the source', () => {
    expect(closer(FITS, 'rock')?.better.map((f) => f.engine)).toEqual(['mm']);
  });

  it('leaves out the target, which cannot also be the source', () => {
    expect(closer(FITS, 'inv', 'rock')?.better.map((f) => [f.engine, f.rank])).toEqual([['mm', 1], ['ezd', 2], ['sd3', 3]]);
  });

  it('offers nothing when the source recognizes every hit, even of a file without hits', () => {
    expect([closer(FITS, 'mm'), closer(fits(0, fit('a', 0), fit('b', 0)), 'a')]).toEqual([null, null]);
  });

  it('offers nothing when no engine does better', () => {
    expect(closer(fits(10, fit('a', 5), fit('b', 5)), 'a')).toBeNull();
  });

  it('offers nothing when the only better engine is the target', () => {
    expect(closer(FITS, 'rock', 'mm')).toBeNull();
  });
});
