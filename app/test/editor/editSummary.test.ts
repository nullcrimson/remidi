import { describe, expect, it } from 'vitest';
import { editLines, previewLines } from '../../src/editor/editSummary';
import type { Canon, Note, VoicePlan } from '../../src/core/midiremap';
import { typed } from '../typed';
import { ENGLISH } from '../../src/locale/i18n';
import type { Message } from '../../src/generated/i18n';

const { t } = ENGLISH;

const row = (canon: string, label: string, srcNotes: number[], note: number | null, defaultTgtNote: number | null): VoicePlan =>
  typed<VoicePlan>({
    canon,
    label,
    family: 'Kick',
    srcNotes,
    defaultTgtNote,
    outcome: note === null ? { status: 'dropped', otherDrum: false } : { status: 'direct', note },
  });

const ROWS = [
  row('kick.main', 'Kick', [24], 35, 36),
  row('snare1.hit', 'Snare', [26, 24, 25], 38, 38),
  row('china.1.hit', 'China 1', [], null, null),
  row('hat.closed', 'Hi-Hat Closed', [42], 42, 42),
];
const DEFAULT_SRC = new Map(typed<[Canon, Note[]][]>([
  ['kick.main', [24]],
  ['snare1.hit', [26]],
  ['china.1.hit', [60]],
]));

describe('editLines', () => {
  it('describes each changed drum as its mapping now and by default, in row order', () => {
    const changed = new Set(typed<Canon[]>(['china.1.hit', 'kick.main', 'snare1.hit']));
    expect(editLines(ROWS, changed, DEFAULT_SRC, 'c1').map(t)).toEqual([
      'Kick: C1 → B1 (default C1 → C2)',
      'Snare: D1 +2 → D2 (default D1 → D2)',
      'China 1: — → — (default C4 → —)',
    ]);
  });

  it('names notes in the chosen octave convention', () => {
    expect(editLines(ROWS, new Set(typed<Canon[]>(['kick.main'])), DEFAULT_SRC, 'c2').map(t)).toEqual([
      'Kick: C0 → B0 (default C0 → C1)',
    ]);
  });
});

describe('previewLines', () => {
  const lines = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((drum): Message => ({ id: 'edit-line', args: { drum, now: '1', byDefault: '2' } }));
  const shown = (ls: Message[]) => ls.map(t);

  it('keeps five lines and counts the rest', () => {
    expect(shown(previewLines(lines))).toEqual([...shown(lines.slice(0, 5)), '+2 more']);
  });

  it('keeps up to five lines whole', () => {
    expect(previewLines(lines.slice(0, 5))).toEqual(lines.slice(0, 5));
  });
});
