import { describe, expect, it } from 'vitest';
import { buildReport, entryText, lossCounts } from '../../src/report/report';
import type { FileResult } from '../../src/core/files';
import type { CanonEntry, Drum } from '../../src/core/midiremap';
import { typed, type Loose } from '../typed';

const canons = typed<CanonEntry[]>([
  { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
  { canon: 'ride.1.bell', label: 'Ride Bell', family: 'Cymbals' },
  { canon: 'splash.2.hit', label: 'Splash 2', family: 'Cymbals' },
]);
const drums = typed<Drum[]>([
  { note: 51, canon: 'ride.1', label: 'Ride', family: 'Cymbals' },
  { note: 57, canon: 'crash.2.hit', label: 'Crash 2', family: 'Cymbals' },
]);

function result(name: string, report: Loose<FileResult['report']>): FileResult {
  return { name, url: 'blob:x', bytes: new Uint8Array(), report: typed<FileResult['report']>(report) };
}
const empty = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 10 };

describe('buildReport', () => {
  it('reports a clean conversion when nothing is lost', () => {
    const view = buildReport([result('a.mid', empty)], canons, drums, 'c1');
    expect(view.clean).toBe(true);
    expect(view.totals).toEqual({ dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 10 });
  });

  it('is not clean when nothing was converted', () => {
    const view = buildReport(
      [result('a.mid', { ...empty, converted: 0, untouched: 1188 }), result('b.mid', { ...empty, converted: 0 })],
      canons,
      drums,
      'c1',
    );
    expect(view.clean).toBe(false);
    expect(view.totals.converted).toBe(0);
    expect(view.totals.untouched).toBe(1188);
  });

  const withUnchanged = () => buildReport(
    [result('a.mid', { ...empty, untouched: 168 }), result('b.mid', { ...empty, untouched: 2 })],
    canons,
    drums,
    'c1',
  );

  it('does not count unchanged notes as loss', () => {
    const view = withUnchanged();
    expect(view.clean).toBe(true);
  });

  it('sums unchanged notes in total', () => {
    const view = withUnchanged();
    expect(view.totals.untouched).toBe(170);
  });

  it('sums unchanged notes per file', () => {
    const view = withUnchanged();
    expect(view.files.map((f) => f.totals.untouched)).toEqual([168, 2]);
  });

  const lossy = () => buildReport(
    [
      result('a.mid', {
        dropped: { 'china.1.hit': 4 },
        fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1', note: 51, count: 3 } },
        unmappedSource: { 63: 1 },
        untouched: 0,
        converted: 10,
      }),
    ],
    canons,
    drums,
    'c1',
  );

  it('is not clean when something is lost', () => {
    const view = lossy();
    expect(view.clean).toBe(false);
  });

  it('labels a dropped entry', () => {
    const view = lossy();
    expect(view.groups.dropped).toEqual([{ label: 'China 1', count: 4, canon: 'china.1.hit' }]);
  });

  it('labels an approximated entry with its substitute', () => {
    const view = lossy();
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'Ride', count: 3, canon: 'ride.1.bell' }]);
  });

  it('names the stand-in the converter chose, then the stock drum on the note an edit moved it to', () => {
    const view = buildReport(
      [result('a.mid', { ...empty, fallbackUsed: { 'china.1.hit': { standIn: 'crash.2.hit', note: 51, count: 2 } } })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.approximated[0].sub).toBe('Crash 2 → Ride');
  });

  it('writes a moved stand-in\'s line as the drum, the stand-in and the stock drum on its note', () => {
    const view = buildReport(
      [result('a.mid', { ...empty, fallbackUsed: { 'china.1.hit': { standIn: 'crash.2.hit', note: 51, count: 2 } } })],
      canons,
      drums,
      'c1',
    );
    expect(entryText(view.groups.approximated[0])).toBe('China 1 → Crash 2 → Ride');
  });

  it('labels an unrecognized entry', () => {
    const view = lossy();
    expect(view.groups.unrecognized[0].note).toBe(63);
    expect(view.groups.unrecognized[0].count).toBe(1);
    expect(view.groups.unrecognized[0].label).toMatch(/^[A-G]/);
  });

  it('totals the converted notes of each file and the notes of each of its groups', () => {
    const view = lossy();
    expect(view.files[0].totals).toEqual({ dropped: 4, approximated: 3, unrecognized: 1, untouched: 0, converted: 10 });
  });

  it('totals dropped, approximated and unrecognized notes', () => {
    const view = lossy();
    expect(view.totals).toEqual({ dropped: 4, approximated: 3, unrecognized: 1, untouched: 0, converted: 10 });
  });

  const twoFiles = () => buildReport(
    [
      result('a.mid', { dropped: { 'china.1.hit': 4 }, fallbackUsed: {}, unmappedSource: {}, untouched: 0, converted: 10 }),
      result('b.mid', { dropped: { 'china.1.hit': 2 }, fallbackUsed: {}, unmappedSource: {}, untouched: 0, converted: 10 }),
    ],
    canons,
    drums,
    'c1',
  );

  it('aggregates counts across files', () => {
    const view = twoFiles();
    expect(view.groups.dropped).toEqual([{ label: 'China 1', count: 6, canon: 'china.1.hit' }]);
  });

  it('keeps the files in order', () => {
    const view = twoFiles();
    expect(view.files.map((f) => f.name)).toEqual(['a.mid', 'b.mid']);
  });

  it('keeps the groups of each file', () => {
    const view = twoFiles();
    expect(view.files[1].groups.dropped).toEqual([{ label: 'China 1', count: 2, canon: 'china.1.hit' }]);
  });

  it('sorts entries by descending count then label', () => {
    const view = buildReport(
      [
        result('a.mid', {
          dropped: { 'china.1.hit': 1, 'splash.2.hit': 5 },
          fallbackUsed: {},
          unmappedSource: {},
          untouched: 0,
          converted: 10,
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
      [result('a.mid', { dropped: {}, fallbackUsed: { 'ride.1.bell': { standIn: 'crash.2.hit', note: 57, count: 2 } }, unmappedSource: {}, untouched: 0, converted: 10 })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'Crash 2', count: 2, canon: 'ride.1.bell' }]);
  });

  it('falls back to the canon id when the catalog lacks it', () => {
    const view = buildReport(
      [result('a.mid', { dropped: { 'tom.floor9.hit': 1 }, fallbackUsed: {}, unmappedSource: {}, untouched: 0, converted: 10 })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.dropped).toEqual([{ label: 'tom.floor9.hit', count: 1, canon: 'tom.floor9.hit' }]);
  });

  it('names the substitute note when it is not a known target drum', () => {
    const view = buildReport(
      [result('a.mid', { dropped: {}, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.cup', note: 60, count: 1 } }, unmappedSource: {}, untouched: 0, converted: 10 })],
      canons,
      drums,
      'c1',
    );
    expect(view.groups.approximated).toEqual([{ label: 'Ride Bell', sub: 'C4', count: 1, canon: 'ride.1.bell' }]);
  });
});

describe('lossCounts', () => {
  const lossy = result('a.mid', { dropped: { 'china.1.hit': 4 }, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.cup', note: 60, count: 1 } }, unmappedSource: { 51: 2 }, untouched: 0, converted: 10 });

  it('counts the entries of each group of one file', () => {
    expect(lossCounts([lossy.report])).toEqual({ dropped: 1, approximated: 1, unrecognized: 1 });
  });

  it('counts a drum dropped in two files once', () => {
    expect(lossCounts([lossy.report, lossy.report]).dropped).toBe(1);
  });

  it('counts a drum approximated by two different stand-ins twice', () => {
    const other = result('b.mid', { ...empty, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.bowtip', note: 60, count: 1 } } });
    expect(lossCounts([lossy.report, other.report]).approximated).toBe(2);
  });

  it('counts a drum approximated by one stand-in once, whatever note it landed on', () => {
    const other = result('b.mid', { ...empty, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.cup', note: 61, count: 1 } } });
    expect(lossCounts([lossy.report, other.report]).approximated).toBe(1);
  });

  it('counts nothing for a clean conversion', () => {
    expect(lossCounts([result('a.mid', empty).report])).toEqual({ dropped: 0, approximated: 0, unrecognized: 0 });
  });
});
