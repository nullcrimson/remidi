import { describe, expect, it } from 'vitest';
import { drumLabels, standInText } from '../../src/core/drums';
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

const named = (standIn: string, on: number) => standInText(drumLabels(KIT).ofStandIn(canon(standIn), note(on), 'c1'));

describe('drumLabels', () => {
  it('names a note two drums share after the first of them', () => {
    expect(drumLabels(SHARED).atNote(note(49), 'c1')).toBe('Crash 1');
  });

  it('names a note no drum sits on by the note itself', () => {
    expect(drumLabels(KIT).atNote(note(60), 'c1')).toBe('C4');
  });

  it('names a stand-in on its own note by the stand-in alone', () => {
    expect(named('crash.2.hit', 49)).toBe('Crash 2');
  });

  it('names a stand-in moved onto another drum\'s note by both, the stand-in first', () => {
    expect(named('crash.2.hit', 51)).toBe('Crash 2 → Ride');
  });

  it('names a stand-in moved onto a note no drum sits on by the stand-in and the note', () => {
    expect(named('crash.2.hit', 60)).toBe('Crash 2 → C4');
  });

  it('names a stand-in the target does not list by the drum on its note', () => {
    expect(named('china.2.hit', 51)).toBe('Ride');
  });

  it('names a stand-in the target does not list, on a note no drum sits on, by the note', () => {
    expect(named('china.2.hit', 60)).toBe('C4');
  });

  it('tells a moved stand-in from where it landed', () => {
    expect(drumLabels(KIT).ofStandIn(canon('crash.2.hit'), note(51), 'c1')).toEqual({ standIn: 'Crash 2', landed: 'Ride' });
  });

  it('says a stand-in on its own note landed nowhere else', () => {
    expect(drumLabels(KIT).ofStandIn(canon('crash.2.hit'), note(49), 'c1').landed).toBeNull();
  });
});
