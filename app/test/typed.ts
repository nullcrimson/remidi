import type { Canon, Note, PresetName } from '../src/core/midiremap';
import { parsePresetName } from '../src/presets/mappings';

/** `T` with every `Note` written as a plain number, and every `Canon` as a plain string. */
export type Loose<T> = T extends Note ? number
  : T extends Canon ? string
    : T extends PresetName ? T
      : T extends (...args: never[]) => unknown ? T
        : T extends ReadonlySet<unknown> | ReadonlyMap<unknown, unknown> | Uint8Array ? T
          : T extends readonly unknown[] ? { [K in keyof T]: Loose<T[K]> }
            : T extends object ? { [K in keyof T as K extends Canon ? string : K extends Note ? number : K]: Loose<T[K]> }
              : T;

/** A test fixture written with plain numbers and strings, typed as the real thing. */
export function typed<T>(fixture: Loose<T>): T {
  return fixture as T;
}

export const note = (n: number): Note => typed<Note>(n);
export const canon = (key: string): Canon => typed<Canon>(key);
export const presetName = (text: string): PresetName => {
  const name = parsePresetName(text);
  if (name === null) throw new Error(`"${text}" is not a preset name`);
  return name;
};
