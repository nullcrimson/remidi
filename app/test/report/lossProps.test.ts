import { describe, expect, it } from 'vitest';
import { lossProps } from '../../src/report/lossProps';
import type { Report } from '../../src/core/midiremap';
import { typed, type Loose } from '../typed';

const report = (fields: Loose<Report>): Report => typed<Report>(fields);

const empty = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 10, merged: 0, read: 10, lost: 0 };

describe('lossProps', () => {
  const lossy = report({ dropped: { 'china.1.hit': 4 }, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.cup', note: 60, count: 1 } }, unmappedSource: { 51: { hits: 2, fate: 'removed' } }, untouched: 0, converted: 10, merged: 0, read: 16, lost: 6 });

  it('counts and lists the entries of each group of one file', () => {
    expect(lossProps([lossy])).toEqual({
      untouched: 0,
      dropped: 1,
      approximated: 1,
      unrecognized: 1,
      unrecognizedNotes: '51',
      droppedDrums: 'china.1.hit',
      approximatedDrums: 'ride.1.bell>ride.1.cup',
      missed: 'under25',
      lost: 'under50',
    });
  });

  it('buckets the share of the hits read that the source missed and that the file lost', () => {
    const kept = report({ ...empty, unmappedSource: { 51: { hits: 10, fate: 'keptFree' } }, read: 20, lost: 0 });
    expect(lossProps([kept])).toMatchObject({ missed: 'over50', lost: 'none' });
  });

  it('lists the unrecognized notes of all files once each, lowest first', () => {
    const a = report({ ...empty, unmappedSource: { 51: { hits: 1, fate: 'removed' }, 7: { hits: 1, fate: 'removed' } } });
    const b = report({ ...empty, unmappedSource: { 7: { hits: 1, fate: 'removed' }, 100: { hits: 1, fate: 'removed' } } });
    expect(lossProps([a, b]).unrecognizedNotes).toBe('7,51,100');
  });

  it('lists the dropped drums most hit first', () => {
    const a = report({ ...empty, dropped: { 'china.1.hit': 1, 'crash.1.hit': 9 } });
    expect(lossProps([a]).droppedDrums).toBe('crash.1.hit,china.1.hit');
  });

  it('orders the dropped drums by their hits across all files', () => {
    const a = report({ ...empty, dropped: { 'crash.1.hit': 3, 'china.1.hit': 4 } });
    const b = report({ ...empty, dropped: { 'crash.1.hit': 3 } });
    expect(lossProps([a, b]).droppedDrums).toBe('crash.1.hit,china.1.hit');
  });

  it('sums the hits left unchanged across files', () => {
    expect(lossProps([report({ ...empty, untouched: 3 }), report({ ...empty, untouched: 4 })]).untouched).toBe(7);
  });

  it('counts a drum dropped in two files once', () => {
    expect(lossProps([lossy, lossy]).dropped).toBe(1);
  });

  it('counts a drum approximated by two different stand-ins twice', () => {
    const other = report({ ...empty, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.bowtip', note: 60, count: 1 } } });
    expect(lossProps([lossy, other]).approximated).toBe(2);
  });

  it('counts a drum approximated by one stand-in once, whatever note it landed on', () => {
    const other = report({ ...empty, fallbackUsed: { 'ride.1.bell': { standIn: 'ride.1.cup', note: 61, count: 1 } } });
    expect(lossProps([lossy, other]).approximated).toBe(1);
  });

  it('counts nothing for a clean conversion', () => {
    expect(lossProps([report(empty)])).toEqual({
      untouched: 0,
      dropped: 0,
      approximated: 0,
      unrecognized: 0,
      unrecognizedNotes: '',
      droppedDrums: '',
      approximatedDrums: '',
      missed: 'none',
      lost: 'none',
    });
  });
});
