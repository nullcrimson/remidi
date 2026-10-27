import { describe, expect, it } from 'vitest';
import type { Drum, VoicePlan } from '../../src/core/midiremap';
import { planBreakdown } from '../../src/convert/planBreakdown';
import { typed, type Loose } from '../typed';

function row(label: string, extra: Partial<Loose<VoicePlan>>): VoicePlan {
  return typed<VoicePlan>({
    canon: label.toLowerCase(),
    label,
    family: 'Kick',
    srcNotes: [36],
    defaultTgtNote: 36,
    outcome: { status: 'direct', note: 36 },
    ...extra,
  });
}

const DRUMS = typed<Drum[]>([
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  { note: 36, canon: 'kick', label: 'Kick', family: 'Kick' },
]);

describe('planBreakdown', () => {
  it('sorts every drum into exactly one group', () => {
    const rows = [
      row('Kick', { srcNotes: [35], outcome: { status: 'direct', note: 36 } }),
      row('Snare', { srcNotes: [38], outcome: { status: 'direct', note: 40 } }),
      row('Hat', { srcNotes: [42], outcome: { status: 'direct', note: 42 } }),
      row('Kick (Alt)', { srcNotes: [34], outcome: { status: 'fallback', standIn: 'kick', note: 36, otherDrum: false } }),
      row('China', { srcNotes: [52], outcome: { status: 'fallback', standIn: 'crash.1.hit', note: 49, otherDrum: true } }),
      row('Tom 4', { srcNotes: [41], outcome: { status: 'dropped', otherDrum: false } }),
      row('Splash', { srcNotes: [], outcome: { status: 'direct', note: 55 } }),
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
