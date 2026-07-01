import { useEffect, useState } from 'react';

export type FavoritesScope = 'from' | 'to';

export interface Favorites {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
}

function load(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function useFavorites(scope: FavoritesScope): Favorites {
  const key = `midiremap:favorites:${scope}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => load(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...favorites]));
    } catch {
      void 0;
    }
  }, [key, favorites]);

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return { favorites, toggleFavorite };
}
