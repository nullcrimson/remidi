import { readStored, writeStored } from './storage';

const CHOICE_KEY = 'midiremap:locale';

/** The language code the visitor last picked, as stored: not checked against any locale table. */
export function readChoice(): string | null {
  return readStored(CHOICE_KEY);
}

/** Remembers the language code the visitor picked; blocked storage leaves it unsaved. */
export function writeChoice(code: string): void {
  writeStored(CHOICE_KEY, code);
}
