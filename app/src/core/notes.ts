import naming from '../wasm/note_naming.json';
import type { Note, NoteNamings, OctaveBase } from './midiremap';

export type { OctaveBase };

const NAMING: NoteNamings = naming;
const NOTE_COUNT = NAMING.c1.names.length;
const SEMITONES = 12;

/** The name of each octave convention: the octave MIDI note 0 sits in. */
export const OCTAVE_NAME: Record<OctaveBase, string> = { c1: 'C-1', c2: 'C-2' };

/** The value as a `Note` when it is the number of a note the core names, else null. */
export function parseNote(value: unknown): Note | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < NOTE_COUNT
    ? (value as Note)
    : null;
}

/** The entries of a record keyed by note, each key as the note it was written under. */
export function byNote<V>(record: Record<Note, V>): [Note, V][] {
  return Object.entries(record).map(([note, value]) => [Number(note) as Note, value]);
}

/** Orders notes from the lowest up. */
export function ascending(a: Note, b: Note): number {
  return a - b;
}

export function noteName(n: Note, base: OctaveBase): string {
  return NAMING[base].names[n];
}

const octaveOf = (n: number): number => Math.floor(n / SEMITONES) - 1;

export function octaveIndexOf(n: Note): number {
  return octaveOf(n);
}

/** Every octave that holds a note, lowest first; the last one may be partly filled. */
export const OCTAVE_INDICES: readonly number[] = Array.from({ length: octaveOf(NOTE_COUNT - 1) - octaveOf(0) + 1 }, (_, i) => octaveOf(0) + i);

export function noteInOctave(octIndex: number, semitone: number): Note | null {
  return parseNote((octIndex + 1) * SEMITONES + semitone);
}

/** The number the convention gives the octave, or null when the octave holds no note. */
export function octaveTabLabel(octIndex: number, base: OctaveBase): number | null {
  const first = noteInOctave(octIndex, 0);
  return first === null ? null : NAMING[base].octaves[first];
}
