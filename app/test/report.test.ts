import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/lib/report';
import type { FileResult } from '../src/lib/files';
import type { CanonInfo, Drum } from '../src/lib/midiremap';

const canons: CanonInfo[] = [
  { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
  { canon: 'ride.1.bell', label: 'Ride Bell', family: 'Cymbals' },
  { canon: 'splash.2.hit', label: 'Splash 2', family: 'Cymbals' },
];
const drums: Drum[] = [
  { note: 51, canon: 'ride.1', label: 'Ride', family: 'Cymbals' },
  { note: 57, canon: 'crash.2.hit', label: 'Crash 2', family: 'Cymbals' },
];

function result(name: string, report: FileResult['report']): FileResult {
  return { name, url: 'blob:x', bytes: new Uint8Array(), report };
}
const empty = { unmappedSource: {}, fallbackUsed: {}, dropped: {} };

describe('buildReport', () => {
  it('reports a clean conversion when nothing is lost', () => {
    const view = buildReport([result('a.mid', empty)], canons, drums, 'c1');
    expect(view.clean).toBe(true);
    expect(view.totals).toEqual({ dropped: 0, approximated: 0, unrecognized: 0 });
  });

  it('labels dropped, approximated (with substitute) and unrecognized entries', () => {
    const view = buildReport(
      [
        result('a.mid', {
          dropped: { 'china.1.hit': 4 },
          fallbackUsed: { 'ride.1.bell': { note: 51, count: 3 } },
          unmappedSource: { 63: 1 },
        }),
      ],
      canons,
      drums,
      'c1',
    );
    expect(view.clean).toBe(false);
    expect(view.groups.dropped).toEqual([{ label: 'China 1', count: 4 }]);
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'Ride', count: 3 }]);
    expect(view.groups.unrecognized[0].count).toBe(1);
    expect(view.groups.unrecognized[0].label).toMatch(/^[A-G]/);
    expect(view.totals).toEqual({ dropped: 4, approximated: 3, unrecognized: 1 });
  });

  it('aggregates counts across files and keeps per-file groups in order', () => {
    const view = buildReport(
      [
        result('a.mid', { dropped: { 'china.1.hit': 4 }, fallbackUsed: {}, unmappedSource: {} }),
        result('b.mid', { dropped: { 'china.1.hit': 2 }, fallbackUsed: {}, unmappedSource: {} }),
      ],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.dropped).toEqual([{ label: 'China 1', count: 6 }]);
    expect(view.files.map((f) => f.name)).toEqual(['a.mid', 'b.mid']);
    expect(view.files[1].groups.dropped).toEqual([{ label: 'China 1', count: 2 }]);
  });

  it('sorts entries by descending count then label', () => {
    const view = buildReport(
      [
        result('a.mid', {
          dropped: { 'china.1.hit': 1, 'splash.2.hit': 5 },
          fallbackUsed: {},
          unmappedSource: {},
        }),
      ],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.dropped.map((e) => e.count)).toEqual([5, 1]);
  });

  it('labels the substitute with the note the conversion actually used', () => {
    const view = buildReport(
      [result('a.mid', { dropped: {}, fallbackUsed: { 'ride.1.bell': { note: 57, count: 2 } }, unmappedSource: {} })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'Crash 2', count: 2 }]);
  });

  it('falls back to the canon id when the catalog lacks it', () => {
    const view = buildReport(
      [result('a.mid', { dropped: { 'tom.floor9.hit': 1 }, fallbackUsed: {}, unmappedSource: {} })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.dropped).toEqual([{ label: 'tom.floor9.hit', count: 1 }]);
  });

  it('names the substitute note when it is not a known target drum', () => {
    const view = buildReport(
      [result('a.mid', { dropped: {}, fallbackUsed: { 'ride.1.bell': { note: 60, count: 1 } }, unmappedSource: {} })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'C4', count: 1 }]);
  });
});
