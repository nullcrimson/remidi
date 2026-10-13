import { describe, expect, it } from 'vitest';
import { drumLabels } from '../../src/core/drums';
import type { Drum } from '../../src/core/midiremap';
import { canon, note, typed } from '../typed';

const SHARED = typed<Drum[]>([
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  { note: 49, canon: 'crash.1.choke', label: 'Crash 1 choke', family: 'Cymbals' },
]);

describe('drumLabels', () => {
  it('names a note two drums share after the first of them', () => {
    expect(drumLabels(SHARED).atNote(note(49), 'c1')).toBe('Crash 1');
  });

  it('names a note no drum sits on by the note itself', () => {
    expect(drumLabels(SHARED).atNote(note(60), 'c1')).toBe('C4');
  });

  it('names a stand-in by its own drum when another drum is listed first on its note', () => {
    expect(drumLabels(SHARED).ofStandIn(canon('crash.1.choke'), note(49), 'c1')).toBe('Crash 1 choke');
  });

  it('names a stand-in by its own drum when it was played on a note another drum owns', () => {
    expect(drumLabels(SHARED).ofStandIn(canon('crash.1.hit'), note(60), 'c1')).toBe('Crash 1');
  });

  it('names a stand-in the target does not list by the note it was played on', () => {
    expect(drumLabels(SHARED).ofStandIn(canon('ride.1.bell'), note(60), 'c1')).toBe('C4');
  });
});
