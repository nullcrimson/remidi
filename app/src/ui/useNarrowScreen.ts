import { useSyncExternalStore } from 'react';

/** The width from which `sm:` styles apply, as `--breakpoint-sm` in `index.css` sets it: below it the page is laid out for a phone. */
export const SM_WIDTH = '40rem';

const WIDE = `(min-width: ${SM_WIDTH})`;

function subscribe(change: () => void): () => void {
  const wide = window.matchMedia(WIDE);
  wide.addEventListener('change', change);
  return () => wide.removeEventListener('change', change);
}

/** Whether the window is narrower than `sm:`, read before the first paint and again whenever it crosses. */
export function useNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, () => !window.matchMedia(WIDE).matches);
}
