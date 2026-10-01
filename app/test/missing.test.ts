import { describe, expect, it } from 'vitest';
import type { Drum, VoiceRow } from '../src/lib/midiremap';
import { MISSING_OPTIONS, missingHint, swapList, swappedCanons } from '../src/lib/missing';
import { ENGLISH } from '../src/i18n';

const { t } = ENGLISH;

function row(canon: string, extra: Partial<VoiceRow>): VoiceRow {
  return {
    canon,
    label: canon,
    srcNotes: [1],
    defaultTgtNote: 36,
    outcome: { status: 'direct', tgtNote: 36 },
    ...extra,
  };
}

const SWAP = row('china.1.hit', { outcome: { status: 'fallback', tgtNote: 36, otherDrum: true } });
const SAME = row('snare1.rimshot', { outcome: { status: 'fallback', tgtNote: 36, otherDrum: false } });
const DROPPED_SWAP = row('tom.rack4.hit', { outcome: { status: 'dropped', otherDrum: true } });
const SILENT_SWAP = row('splash.1.hit', { srcNotes: [], outcome: { status: 'fallback', tgtNote: 36, otherDrum: true } });

describe('missing drums setting', () => {
  it('offers Nearest then Drop', () => {
    expect(MISSING_OPTIONS.map((o) => [o.value, t(o.label)])).toEqual([
      ['nearest', 'Nearest'],
      ['drop', 'Drop'],
    ]);
  });

  it('explains the choice before a pair is picked', () => {
    expect(t(missingHint('nearest', []))).toBe('play on the closest drum');
    expect(t(missingHint('drop', []))).toBe('leave them out');
  });

  it('counts drums played on another drum under Nearest', () => {
    expect(t(missingHint('nearest', [SAME]))).toBe('no drum moves to another drum');
    expect(t(missingHint('nearest', [SWAP, SAME, SILENT_SWAP]))).toBe('1 drum played on another drum');
    expect(t(missingHint('nearest', [SWAP, row('x', { outcome: { status: 'fallback', tgtNote: 36, otherDrum: true } })]))).toBe(
      '2 drums played on another drum',
    );
  });

  it('counts drums the setting drops under Drop', () => {
    expect(t(missingHint('drop', [SAME]))).toBe('no drums dropped');
    expect(t(missingHint('drop', [DROPPED_SWAP, SAME]))).toBe('1 drum dropped');
    expect(t(missingHint('drop', [DROPPED_SWAP, row('y', { outcome: { status: 'dropped', otherDrum: true } })]))).toBe(
      '2 drums dropped',
    );
  });

  it('lists each drum the setting moves and the target drum that plays it now', () => {
    const drums = [
      { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
      { note: 49, canon: 'crash.1.choke', label: 'Crash 1 choke', family: 'Cymbals' },
      { note: 45, canon: 'tom.rack3.hit', label: 'Tom 3', family: 'Toms' },
    ] as Drum[];
    const china = row('china.1.hit', { label: 'China', outcome: { status: 'fallback', tgtNote: 49, otherDrum: true } });
    const tom = row('tom.rack4.hit', { label: 'Tom 4', outcome: { status: 'fallback', tgtNote: 45, otherDrum: true } });
    expect(swapList([china, SAME, tom, SILENT_SWAP], drums, 'c1')).toEqual([
      { drum: 'China', now: 'Crash 1' },
      { drum: 'Tom 4', now: 'Tom 3' },
    ]);
  });

  it('lists a dropped drum as played by nothing', () => {
    expect(swapList([{ ...DROPPED_SWAP, label: 'Tom 4' }], [], 'c1')).toEqual([{ drum: 'Tom 4', now: null }]);
  });

  it('collects the canons that play on another drum', () => {
    expect(swappedCanons([SWAP, SAME, DROPPED_SWAP, SILENT_SWAP])).toEqual(
      new Set(['china.1.hit', 'tom.rack4.hit']),
    );
  });
});
