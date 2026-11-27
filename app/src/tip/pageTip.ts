import { send, type TipAfter } from '../core/umami';
import { amountAnswer, answerTip, askAfterDownload, rememberTip, tipEuros, type TipAnswer } from './tipAsk';

const PAGE_DOWNLOADS = ['drum-map', 'note-map', 'rack'] as const satisfies readonly TipAfter[];

/** The download a `[data-download]` wrapper names; a name `tip-asked` does not know is a fault of the page, thrown so it is seen. */
function downloadKind(kind: string | undefined): TipAfter {
  const after = PAGE_DOWNLOADS.find((known) => known === kind);
  if (after === undefined) throw new Error(`data-download="${kind}" names no download tip-asked knows`);
  return after;
}

/**
 * Wires the tip ask of a static page. The thanks page (`[data-tipped]`) remembers a tip. On a
 * page with downloads, a click on a `[data-download]` link counts toward the ask, unless
 * `onPhone()` says the page is laid out for a phone, which cannot use the file; when
 * `askAfterDownload` says so the hidden `[data-tip-toast]` shows, with its amounts in the
 * page's language. Its close button, Escape inside it, or an amount answers and hides it,
 * giving focus back to the download when focus was inside. The download itself is never held up.
 */
export function runTipScript(document: Document, onPhone: () => boolean): void {
  if (document.querySelector('[data-tipped]')) rememberTip();
  const toast = document.querySelector<HTMLElement>('[data-tip-toast]');
  if (toast === null) return;
  const main = toast.closest('main');
  if (main === null) throw new Error('the tip ask sits outside main');
  const euros = tipEuros(document.documentElement.lang);
  toast.querySelectorAll<HTMLAnchorElement>('a[data-euros]').forEach((a) => {
    a.textContent = euros.format(Number(a.dataset.euros));
  });

  let opener: HTMLElement | null = null;
  const answer = (given: TipAnswer) => {
    const hadFocus = toast.contains(document.activeElement);
    send('tip-answered', answerTip(given, 'toast', 'page'));
    toast.hidden = true;
    if (hadFocus && opener?.isConnected) opener.focus();
  };

  const kinds = new Map([...main.querySelectorAll<HTMLElement>('[data-download]')].map((wrapper) => [wrapper, downloadKind(wrapper.dataset.download)]));
  main.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-download] a[download]') : null;
    const wrapper = link?.closest<HTMLElement>('[data-download]');
    const after = wrapper ? kinds.get(wrapper) : undefined;
    if (link === null || after === undefined || onPhone() || !askAfterDownload()) return;
    opener = link;
    toast.hidden = false;
    send('tip-asked', { after, page: 'page' });
  });
  toast.querySelector('[data-tip-close]')?.addEventListener('click', () => answer('closed'));
  toast.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') answer('closed');
  });
  toast.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
    a.addEventListener('click', () => answer(a.dataset.euros === undefined ? 'other' : amountAnswer(Number(a.dataset.euros))));
  });
}
