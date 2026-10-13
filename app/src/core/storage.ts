/** A saved value, or null when there is none or storage is blocked. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Saves a value; a blocked or full storage leaves it unsaved. */
export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    void 0;
  }
}
