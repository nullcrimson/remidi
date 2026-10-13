import { describe, expect, it } from 'vitest';
import type { Drum, VoiceRow } from '../../src/core/midiremap';
import { playedOn } from '../../src/core/outcome';
import { typed, type Loose } from '../typed';

const DRUMS = typed<Drum[]>([
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  { note: 51, canon: 'ride.1.bowtip', label: 'Ride', family: 'Cymbals' },
]);

function china(outcome: Loose<VoiceRow>['outcome']): VoiceRow {
  return typed<VoiceRow>({ canon: 'china.1.hit', label: 'China', family: 'Cymbals', srcNotes: [52], defaultTgtNote: null, outcome });
}

describe('playedOn', () => {
  it('names the stand-in the converter chose, then the stock drum on the note an edit gave it', () => {
    const rows = [china({ status: 'fallback', standIn: 'crash.1.hit', tgtNote: 51, otherDrum: true })];
    expect(playedOn(rows, DRUMS, 'c1')).toEqual([{ drum: 'China', now: 'Crash 1 → Ride' }]);
  });

  it('names a stand-in on its own note by the stand-in alone', () => {
    const rows = [china({ status: 'fallback', standIn: 'crash.1.hit', tgtNote: 49, otherDrum: true })];
    expect(playedOn(rows, DRUMS, 'c1')).toEqual([{ drum: 'China', now: 'Crash 1' }]);
  });

  it('names a drum the target has by the drum on its note', () => {
    const rows = [china({ status: 'direct', tgtNote: 51 })];
    expect(playedOn(rows, DRUMS, 'c1')).toEqual([{ drum: 'China', now: 'Ride' }]);
  });
});
