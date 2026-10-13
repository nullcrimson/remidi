import { describe, expect, it } from 'vitest';
import { drumLabels } from '../../src/core/drums';
import type { Drum } from '../../src/core/midiremap';
import { canon, note, typed } from '../typed';

const SHARED = typed<Drum[]>([
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  { note: 49, canon: 'crash.1.choke', label: 'Crash 1 choke', family: 'Cymbals' },
]);

const KIT = typed<Drum[]>([
  { note: 49, canon: 'crash.2.hit', label: 'Crash 2', family: 'Cymbals' },
  { note: 51, canon: 'ride.1.bowtip', label: 'Ride', family: 'Cymbals' },
]);

describe('drumLabels', () => {
  it('names a note two drums share after the first of them', () => {
    expect(drumLabels(SHARED).atNote(note(49), 'c1')).toBe('Crash 1');
  });

  it('names a note no drum sits on by the note itself', () => {
    expect(drumLabels(KIT).atNote(note(60), 'c1')).toBe('C4');
  });

  it('names a stand-in on its own note by the stand-in alone', () => {
    expect(drumLabels(KIT).ofStandIn(canon('crash.2.hit'), note(49), 'c1')).toBe('Crash 2');
  });

  it('names a stand-in moved onto another drum\'s note by both, the stand-in first', () => {
    expect(drumLabels(KIT).ofStandIn(canon('crash.2.hit'), note(51), 'c1')).toBe('Crash 2 → Ride');
  });

  it('names a stand-in moved onto a note no drum sits on by the stand-in and the note', () => {
    expect(drumLabels(KIT).ofStandIn(canon('crash.2.hit'), note(60), 'c1')).toBe('Crash 2 → C4');
  });

  it('names a stand-in the target does not list by the drum on its note', () => {
    expect(drumLabels(KIT).ofStandIn(canon('china.2.hit'), note(51), 'c1')).toBe('Ride');
  });

  it('names a stand-in the target does not list, on a note no drum sits on, by the note', () => {
    expect(drumLabels(KIT).ofStandIn(canon('china.2.hit'), note(60), 'c1')).toBe('C4');
  });
});
