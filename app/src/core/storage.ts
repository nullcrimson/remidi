const PREFIX = 'midiremap:';

/** The closed set of things this app keeps in the browser's storage. */
export type StorageKey = 'session' | 'missing' | 'mappings' | 'quarantine' | 'locale' | 'locale-offer' | 'tip' | `favorites:${'from' | 'to'}`;

/** The name a key is stored under; every one starts with `midiremap:`. */
export const storedName = (key: StorageKey): string => PREFIX + key;

/** What a read found: the browser refused it, or the value, null when nothing is stored. */
export type StoredRead = 'blocked' | { value: string | null };

/** Reads a value and tells a blocked storage from an empty one. */
export function readStoredStrict(key: StorageKey): StoredRead {
  try {
    return { value: localStorage.getItem(storedName(key)) };
  } catch {
    return 'blocked';
  }
}

/** A saved value, or null when there is none or storage is blocked. */
export function readStored(key: StorageKey): string | null {
  const read = readStoredStrict(key);
  return read === 'blocked' ? null : read.value;
}

/** Saves a value and says whether it was saved; a blocked or full storage leaves it unsaved. */
export function writeStored(key: StorageKey, value: string): boolean {
  try {
    localStorage.setItem(storedName(key), value);
    return true;
  } catch {
    return false;
  }
}

/** Removes a value; blocked storage leaves it. */
export function removeStored(key: StorageKey): void {
  try {
    localStorage.removeItem(storedName(key));
  } catch {
    void 0;
  }
}

/** Removes everything this app stored, and nothing else in the same storage. */
export function clearStored(): void {
  try {
    const names = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const name of names) if (name?.startsWith(PREFIX)) localStorage.removeItem(name);
  } catch {
    void 0;
  }
}

/** Calls `changed` when another tab changes this key or clears the storage; returns the stop function. */
export function onStoredChange(key: StorageKey, changed: () => void): () => void {
  const listener = (e: StorageEvent) => {
    if (e.key === storedName(key) || e.key === null) changed();
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
