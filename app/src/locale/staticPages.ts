import { sameLanguage } from './language';
import { readChoice, writeChoice } from './languageChoice';
import { asLocale } from './localeCode';
import { readStored, writeStored } from '../core/storage';
import type { Locale } from '../generated/localeCodes';
import { send } from '../core/umami';

/**
 * What the static pages do about the visitor's language: remember a clicked language link,
 * send a visitor with a stored choice to that language's page, and otherwise offer, once,
 * the browser's language when the page has it and the offer was not dismissed.
 */
export function runLocaleScript(document: Document, languages: readonly string[], location: Pick<Location, 'replace'>): void {
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
  if (stored !== null || readStored('locale-offer') !== null) return;

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
  if (to !== undefined) window.addEventListener('load', () => send('language-offered', { to }), { once: true });
  offer.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    writeStored('locale-offer', 'dismissed');
    offer.hidden = true;
    if (to !== undefined) send('language-offer-answered', { to, answer: 'dismissed' });
  });
}
