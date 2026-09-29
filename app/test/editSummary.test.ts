import { describe, expect, it } from 'vitest';
import { editLines, previewLines, sameEdits } from '../src/lib/editSummary';
import type { VoiceRow } from '../src/lib/midiremap';
import { t } from '../src/i18n';
import type { Message } from '../src/generated/i18n';

const row = (canon: string, label: string, srcNotes: number[], tgtNote: number | null, defaultTgtNote: number | null): VoiceRow => ({
  canon,
  label,
  srcNotes,
  tgtNote,
  defaultTgtNote,
  status: tgtNote === null ? 'dropped' : 'direct',
  otherDrum: false,
});

const ROWS = [
  row('kick.main', 'Kick', [24], 35, 36),
  row('snare1.hit', 'Snare', [26, 24, 25], 38, 38),
  row('china.1.hit', 'China 1', [], null, null),
  row('hat.closed', 'Hi-Hat Closed', [42], 42, 42),
];
const DEFAULT_SRC = new Map([
  ['kick.main', [24]],
  ['snare1.hit', [26]],
  ['china.1.hit', [60]],
]);

describe('editLines', () => {
  it('describes each changed drum as its mapping now and by default, in row order', () => {
    const changed = new Set(['china.1.hit', 'kick.main', 'snare1.hit']);
    expect(editLines(ROWS, changed, DEFAULT_SRC, 'c1').map(t)).toEqual([
      'Kick: C1 → B1 (default C1 → C2)',
      'Snare: D1 +2 → D2 (default D1 → D2)',
      'China 1: — → — (default C4 → —)',
    ]);
  });

  it('names notes in the chosen octave convention', () => {
    expect(editLines(ROWS, new Set(['kick.main']), DEFAULT_SRC, 'c2').map(t)).toEqual([
      'Kick: C0 → B0 (default C0 → C1)',
    ]);
  });
});

describe('previewLines', () => {
  it('keeps up to five lines and counts the rest', () => {
    const lines = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((drum): Message => ({ id: 'edit-line', args: { drum, now: '1', byDefault: '2' } }));
    const shown = (ls: Message[]) => ls.map(t);
    expect(shown(previewLines(lines))).toEqual([...shown(lines.slice(0, 5)), '+2 more']);
    expect(previewLines(lines.slice(0, 5))).toEqual(lines.slice(0, 5));
  });
});

describe('sameEdits', () => {
  it('compares target and source edits regardless of key order', () => {
    const a = { edits: { 'kick.main': 35, 'china.1.hit': 52 }, srcEdits: { 24: 'snare1.hit', 60: null } };
    const b = { edits: { 'china.1.hit': 52, 'kick.main': 35 }, srcEdits: { 60: null, 24: 'snare1.hit' } };
    expect(sameEdits(a, b)).toBe(true);
    expect(sameEdits(a, { ...b, edits: { 'kick.main': 35 } })).toBe(false);
    expect(sameEdits(a, { ...b, srcEdits: { 24: 'snare1.hit', 60: 'kick.main' } })).toBe(false);
    expect(sameEdits(a, { ...b, srcEdits: { 24: 'snare1.hit' } })).toBe(false);
  });
});
