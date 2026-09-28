import { beforeEach, describe, expect, it } from 'vitest';
import type { VoiceRow } from '../src/lib/midiremap';
import {
  loadMissing,
  MISSING_KEY,
  MISSING_OPTIONS,
  missingHint,
  saveMissing,
  swappedCanons,
} from '../src/lib/missing';

function row(canon: string, extra: Partial<VoiceRow>): VoiceRow {
  return {
    canon,
    label: canon,
    srcNotes: [1],
    tgtNote: 36,
    defaultTgtNote: 36,
    status: 'direct',
    otherDrum: false,
    ...extra,
  };
}

const SWAP = row('china.1.hit', { status: 'fallback', otherDrum: true });
const SAME = row('snare1.rimshot', { status: 'fallback' });
const DROPPED_SWAP = row('tom.rack4.hit', { status: 'dropped', tgtNote: null, otherDrum: true });
const SILENT_SWAP = row('splash.1.hit', { status: 'fallback', otherDrum: true, srcNotes: [] });

describe('missing drums setting', () => {
  beforeEach(() => localStorage.clear());

  it('offers Nearest then Drop', () => {
    expect(MISSING_OPTIONS).toEqual([
      { value: 'nearest', label: 'Nearest' },
      { value: 'drop', label: 'Drop' },
    ]);
  });

  it('loads nearest by default and for unknown stored values', () => {
    expect(loadMissing()).toBe('nearest');
    localStorage.setItem(MISSING_KEY, 'maybe');
    expect(loadMissing()).toBe('nearest');
  });

  it('round-trips a saved choice', () => {
    saveMissing('drop');
    expect(localStorage.getItem(MISSING_KEY)).toBe('drop');
    expect(loadMissing()).toBe('drop');
  });

  it('explains the choice before a pair is picked', () => {
    expect(missingHint('nearest', [])).toBe('play on the closest drum');
    expect(missingHint('drop', [])).toBe('leave them out');
  });

  it('counts drums played on another drum under Nearest', () => {
    expect(missingHint('nearest', [SAME])).toBe('no drum moves to another drum');
    expect(missingHint('nearest', [SWAP, SAME, SILENT_SWAP])).toBe('1 drum played on another drum');
    expect(missingHint('nearest', [SWAP, row('x', { status: 'fallback', otherDrum: true })])).toBe(
      '2 drums played on another drum',
    );
  });

  it('counts drums the setting drops under Drop', () => {
    expect(missingHint('drop', [SAME])).toBe('no drums dropped');
    expect(missingHint('drop', [DROPPED_SWAP, SAME])).toBe('1 drum dropped');
    expect(missingHint('drop', [DROPPED_SWAP, row('y', { status: 'dropped', tgtNote: null, otherDrum: true })])).toBe(
      '2 drums dropped',
    );
  });

  it('collects the canons that play on another drum', () => {
    expect(swappedCanons([SWAP, SAME, DROPPED_SWAP, SILENT_SWAP])).toEqual(
      new Set(['china.1.hit', 'tom.rack4.hit']),
    );
  });
});
