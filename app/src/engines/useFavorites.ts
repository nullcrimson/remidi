import { useEffect, useRef, useState } from 'react';
import { onStoredChange, readStored, writeStored, type StorageKey } from '../core/storage';

type FavoritesScope = 'from' | 'to';

interface Favorites {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
}

function load(key: StorageKey): Set<string> {
  try {
    const raw = readStored(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function useFavorites(scope: FavoritesScope): Favorites {
  const key = `favorites:${scope}` as const;
  const [favorites, setFavorites] = useState<Set<string>>(() => load(key));
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    writeStored(key, JSON.stringify([...favorites]));
  }, [key, favorites]);

  useEffect(() => onStoredChange(key, () => setFavorites(load(key))), [key]);

  const toggleFavorite = (id: string) => {
    dirty.current = true;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return { favorites, toggleFavorite };
}
