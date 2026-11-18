import type { Canon } from '../core/midiremap';
import { centerAndFocus } from '../ui/reveal';

function flash(row: HTMLElement): void {
  const faded = (e: AnimationEvent) => {
    if (e.target !== row) return;
    row.removeAttribute('data-flash');
    row.removeEventListener('animationend', faded);
  };
  row.removeAttribute('data-flash');
  row.getBoundingClientRect();
  row.setAttribute('data-flash', '');
  row.addEventListener('animationend', faded);
}

/** The editor row of the drum `canon`, when it is on the page: a filter may have hidden it. */
function rowOf(canon: Canon): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[data-row]')].find((el) => el.dataset.row === canon);
}

const targetNoteOf = (row: HTMLElement) => row.querySelector<HTMLElement>('button[aria-describedby]');

/** Puts focus on the target note of the editor row of the drum `canon`. */
export function focusRowTarget(canon: Canon): void {
  const row = rowOf(canon);
  if (row !== undefined) targetNoteOf(row)?.focus();
}

/**
 * Brings the editor row of the drum `canon` into view, puts focus on its target note and
 * marks the row `data-flash` until its highlight has faded. Says whether the row is on the
 * page: a filter may have hidden it.
 */
export function jumpToRow(canon: Canon): boolean {
  const row = rowOf(canon);
  if (row === undefined) return false;
  centerAndFocus(row, targetNoteOf(row));
  flash(row);
  return true;
}
