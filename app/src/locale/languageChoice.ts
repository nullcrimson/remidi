import { readStored, writeStored } from '../core/storage';

/** The language code the visitor last picked, as stored: not checked against any locale table. */
export function readChoice(): string | null {
  return readStored('locale');
}

/** Remembers the language code the visitor picked; blocked storage leaves it unsaved. */
export function writeChoice(code: string): void {
  writeStored('locale', code);
}
