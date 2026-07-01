import { useState } from 'react';

export function useFilter<T>(items: T[], key: (t: T) => string) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const filtered = needle ? items.filter((t) => key(t).toLowerCase().includes(needle)) : items;
  return { q, setQ, filtered };
}
