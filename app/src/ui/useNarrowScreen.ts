import { useSyncExternalStore } from 'react';
import { isNarrowScreen, WIDE_QUERY } from './breakpoint';

function subscribe(change: () => void): () => void {
  const wide = window.matchMedia(WIDE_QUERY);
  wide.addEventListener('change', change);
  return () => wide.removeEventListener('change', change);
}

/** Whether the window is narrower than `sm:`, read before the first paint and again whenever it crosses. */
export function useNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, isNarrowScreen);
}
