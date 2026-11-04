import { sameLanguage } from './language';
import { readChoice, writeChoice } from './languageChoice';
import { asLocale } from './localeCode';
import { readOffer, writeOffer } from './localeOffer';
import type { Locale } from '../generated/localeCodes';
import { send } from '../core/umami';

const afterLoad = (run: () => void) => window.addEventListener('load', run, { once: true });

/**
 * What the static pages do about the visitor's language: remember a clicked language link,
 * send a visitor with a stored choice to that language's page, and otherwise offer the
 * browser's language when the page has it, on the page where it was first offered only:
 * moving on to another page without answering counts as ignoring it.
 */
export function runLocaleScript(document: Document, languages: readonly string[], location: Pick<Location, 'replace'>): void {
  const here = new URL(document.URL).pathname;
  document.querySelectorAll<HTMLElement>('[data-locale]').forEach((link) => {
    link.addEventListener('click', () => {
      const code = link.dataset.locale;
      if (code === undefined) return;
      writeChoice(code);
      const to = asLocale(code);
      if (to !== undefined && link.dataset.offer === undefined && link.getAttribute('aria-current') === null) send('language-picked', { to, where: 'page' });
    });
  });

  const offer = document.getElementById('lang-offer');
  if (offer === null) return;
  const links = [...offer.querySelectorAll<HTMLAnchorElement>('[data-offer]')];
  const stored = readChoice();
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const to = asLocale(link.dataset.offer);
      if (to !== undefined) send('language-offer-answered', { to, answer: 'accepted' });
    });
  });
  const chosen = links.find((link) => link.dataset.offer === stored);
  if (chosen !== undefined) {
    location.replace(chosen.href);
    return;
  }
  if (stored !== null) return;
  const before = readOffer();
  if (before?.kind === 'answered') return;
  if (before?.kind === 'shown' && before.page !== here) {
    writeOffer({ kind: 'answered' });
    afterLoad(() => send('language-offer-answered', { to: before.to, answer: 'ignored' }));
    return;
  }

  const page = document.documentElement.lang;
  let offered: Locale | undefined;
  for (const tag of languages) {
    if (sameLanguage(tag, page)) break;
    const match = links.find((link) => sameLanguage(link.lang, tag));
    if (match !== undefined) {
      match.hidden = false;
      offer.hidden = false;
      offered = asLocale(match.dataset.offer);
      break;
    }
  }
  const to = offered;
  if (to !== undefined && before === null) {
    writeOffer({ kind: 'shown', to, page: here });
    afterLoad(() => send('language-offered', { to }));
  }
  offer.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    writeOffer({ kind: 'answered' });
    offer.hidden = true;
    if (to !== undefined) send('language-offer-answered', { to, answer: 'dismissed' });
  });
}
