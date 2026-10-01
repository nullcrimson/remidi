import { describe, expect, it } from 'vitest';
import type { Drum, VoiceRow } from '../src/lib/midiremap';
import { planBreakdown } from '../src/lib/planBreakdown';

function row(label: string, extra: Partial<VoiceRow>): VoiceRow {
  return {
    canon: label.toLowerCase(),
    label,
    srcNotes: [36],
    tgtNote: 36,
    defaultTgtNote: 36,
    status: 'direct',
    otherDrum: false,
    ...extra,
  };
}

const DRUMS = [
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  { note: 36, canon: 'kick', label: 'Kick', family: 'Kick' },
] as Drum[];

describe('planBreakdown', () => {
  it('sorts every drum into exactly one group', () => {
    const rows = [
      row('Kick', { srcNotes: [35], tgtNote: 36 }),
      row('Snare', { srcNotes: [38], tgtNote: 40 }),
      row('Hat', { srcNotes: [42], tgtNote: 42 }),
      row('Kick (Alt)', { srcNotes: [34], tgtNote: 36, status: 'fallback' }),
      row('China', { srcNotes: [52], tgtNote: 49, status: 'fallback', otherDrum: true }),
      row('Tom 4', { srcNotes: [41], tgtNote: null, status: 'dropped' }),
      row('Splash', { srcNotes: [], tgtNote: 55 }),
    ];
    const b = planBreakdown(rows, DRUMS, 'c1');
    expect(b).toEqual({
      moved: 2,
      same: 1,
      variant: [{ drum: 'Kick (Alt)', now: 'Kick' }],
      swapped: [{ drum: 'China', now: 'Crash 1' }],
      dropped: ['Tom 4'],
      unplayed: 1,
    });
    expect(b.moved + b.same + b.variant.length + b.swapped.length + b.dropped.length + b.unplayed).toBe(rows.length);
  });

  it('is all zeros before a pair is picked', () => {
    expect(planBreakdown([], [], 'c1')).toEqual({ moved: 0, same: 0, variant: [], swapped: [], dropped: [], unplayed: 0 });
  });
});
