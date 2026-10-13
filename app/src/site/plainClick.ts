import type { MouseEvent } from 'react';

/** A primary click with no modifier: one the page may handle in place of the browser. */
export function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}
