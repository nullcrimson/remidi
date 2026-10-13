import type { Canon } from '../core/midiremap';

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

/**
 * Brings the editor row of the drum `canon` into view, puts focus on its target note and
 * marks the row `data-flash` until its highlight has faded. Says whether the row is on the
 * page: a filter may have hidden it.
 */
export function jumpToRow(canon: Canon): boolean {
  const row = [...document.querySelectorAll<HTMLElement>('[data-row]')].find((el) => el.dataset.row === canon);
  if (row === undefined) return false;
  row.scrollIntoView({ block: 'center' });
  row.querySelector<HTMLElement>('button[aria-describedby]')?.focus({ preventScroll: true });
  flash(row);
  return true;
}
