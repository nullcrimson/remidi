import { knownMark } from '../core/pageMark';
import { send, type PageDownload } from '../core/umami';
import { amountAnswer, answerTip, askAfterDownload, rememberTip, showTipPause, tipEuros, type TipAnswer } from './tipAsk';

const PAGE_DOWNLOADS: readonly PageDownload[] = ['drum-map', 'note-map', 'rack'];

/** The element of the tip ask that `selector` names; a tip ask without it is a fault of the page, thrown so it is seen. */
function part<E extends Element>(toast: HTMLElement, selector: string): E {
  const found = toast.querySelector<E>(selector);
  if (found === null) throw new Error(`the tip ask has no ${selector}`);
  return found;
}

/** The whole euros an amount link of the tip ask offers; any other `data-euros` is a fault of the page, thrown so it is seen. */
function euros(link: HTMLElement): number {
  const amount = Number(link.dataset.euros);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`data-euros="${link.dataset.euros}" is no whole amount of euros`);
  return amount;
}

/**
 * Wires the tip ask of a static page. Every page marks its root while a tip pauses the asks
 * (`showTipPause`), so the side link hides. The thanks page (`[data-tipped]`) remembers a tip. On a
 * page with downloads, a click on a link inside a `[data-download]` counts toward the ask,
 * unless `onPhone()` says the page is laid out for a phone, which cannot use the file; when
 * `askAfterDownload` says so the hidden `[data-tip-toast]` shows, with its amounts in the
 * page's language. Its close button, Escape inside it, an amount or the other amount answers
 * and hides it, giving focus back to the download when focus was inside. The download itself
 * is never held up.
 */
export function runTipScript(window: Window, onPhone: () => boolean): void {
  const { document } = window;
  showTipPause(window);
  if (document.querySelector('[data-tipped]')) rememberTip(document.documentElement);
  const toast = document.querySelector<HTMLElement>('[data-tip-toast]');
  if (toast === null) return;
  const format = tipEuros(document.documentElement.lang);

  let opener: HTMLElement | null = null;
  const answer = (given: TipAnswer) => {
    const hadFocus = toast.contains(document.activeElement);
    send('tip-answered', answerTip(given, 'static', document.documentElement));
    toast.hidden = true;
    if (hadFocus && opener?.isConnected) opener.focus();
  };

  document.querySelectorAll<HTMLElement>('[data-download]').forEach((wrapper) => {
    const after = knownMark(PAGE_DOWNLOADS, 'data-download', wrapper.dataset.download, 'download tip-asked knows');
    wrapper.addEventListener('click', (e) => {
      const link = e.target instanceof Element ? e.target.closest<HTMLElement>('a[download]') : null;
      if (link === null || onPhone() || !askAfterDownload()) return;
      opener = link;
      toast.hidden = false;
      send('tip-asked', { site: 'static', after });
    });
  });
  part<HTMLButtonElement>(toast, '[data-tip-close]').addEventListener('click', () => answer('closed'));
  toast.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') answer('closed');
  });
  toast.querySelectorAll<HTMLAnchorElement>('a[data-euros]').forEach((link) => {
    const amount = euros(link);
    link.textContent = format.format(amount);
    link.addEventListener('click', () => answer(amountAnswer(amount)));
  });
  part<HTMLAnchorElement>(toast, '[data-tip-other]').addEventListener('click', () => answer('other'));
}
