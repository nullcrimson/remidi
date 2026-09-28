import type { SavedMapping } from './mappings';
import type { Drum, VoiceRow } from './midiremap';
import { noteName, type OctaveBase } from './notes';
import { knownEdits, type Edits, type SrcEdits } from './overrides';

/** How the current edits relate to the preset that is open, if any. */
export type PresetMatch
  = | { kind: 'none' }
    | { kind: 'saved'; name: string }
    | { kind: 'unsaved'; name: string };

const PREVIEW_LIMIT = 5;

function notes(list: number[], oct: OctaveBase): string {
  if (list.length === 0) return '—';
  const first = noteName(list[0], oct);
  return list.length === 1 ? first : `${first} +${list.length - 1}`;
}

function target(note: number | null, oct: OctaveBase): string {
  return note === null ? '—' : noteName(note, oct);
}

/**
 * One line per changed drum, in row order: its source notes and target note now, then by
 * default (`Kick: C1 → B1 (default C1 → C2)`).
 */
export function editLines(
  rows: VoiceRow[],
  changed: Set<string>,
  defaultSrc: Map<string, number[]>,
  oct: OctaveBase,
): string[] {
  return rows
    .filter((r) => changed.has(r.canon))
    .map((r) => {
      const now = `${notes(r.srcNotes, oct)} → ${target(r.tgtNote, oct)}`;
      const byDefault = `${notes(defaultSrc.get(r.canon) ?? [], oct)} → ${target(r.defaultTgtNote, oct)}`;
      return `${r.label}: ${now} (default ${byDefault})`;
    });
}

/** The first few lines, then how many more there are. */
export function previewLines(lines: string[]): string[] {
  if (lines.length <= PREVIEW_LIMIT) return lines;
  return [...lines.slice(0, PREVIEW_LIMIT), `+${lines.length - PREVIEW_LIMIT} more`];
}

interface EditSet {
  edits: Edits;
  srcEdits: SrcEdits;
}

function sameRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => k in b && a[k] === b[k]);
}

/** Whether two sets of note edits change the same drums the same way. */
export function sameEdits(a: EditSet, b: EditSet): boolean {
  return sameRecord(a.edits, b.edits) && sameRecord(a.srcEdits, b.srcEdits);
}

/**
 * Compares the current edits with the open preset's, leaving out the preset's edits for
 * drums this version does not know (loading it left them out too).
 */
export function presetMatch(
  preset: SavedMapping | undefined,
  current: EditSet,
  canons: ReadonlySet<string>,
): PresetMatch {
  if (!preset) return { kind: 'none' };
  const saved = canons.size > 0 ? knownEdits(preset.edits, preset.srcEdits, canons) : preset;
  return sameEdits(saved, current) ? { kind: 'saved', name: preset.name } : { kind: 'unsaved', name: preset.name };
}

/** The source notes each drum has by default. */
export function sourceDefaults(sourceNotes: Drum[]): Map<string, number[]> {
  const byCanon = new Map<string, number[]>();
  for (const d of sourceNotes) byCanon.set(d.canon, [...(byCanon.get(d.canon) ?? []), d.note]);
  return byCanon;
}
