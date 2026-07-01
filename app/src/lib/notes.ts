export type OctaveBase = 'c1' | 'c2';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function baseOffset(base: OctaveBase): number {
  return base === 'c1' ? 1 : 2;
}

export function octaveOf(n: number, base: OctaveBase): number {
  return Math.floor(n / 12) - baseOffset(base);
}

export function noteName(n: number, base: OctaveBase): string {
  return NAMES[((n % 12) + 12) % 12] + octaveOf(n, base);
}

export function octaveIndexOf(n: number): number {
  return Math.floor(n / 12) - 1;
}

export function noteInOctave(octIndex: number, semitone: number): number {
  return (octIndex + 1) * 12 + semitone;
}

export function octaveTabLabel(octIndex: number, base: OctaveBase): number {
  return octaveOf((octIndex + 1) * 12, base);
}
