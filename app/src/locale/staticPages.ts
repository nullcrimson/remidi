import { sameLanguage } from './language';
import { readChoice, writeChoice } from './languageChoice';
import { readStored, writeStored } from '../core/storage';

/**
 * What the static pages do about the visitor's language: remember a clicked language link,
 * send a visitor with a stored choice to that language's page, and otherwise offer, once,
 * the browser's language when the page has it and the offer was not dismissed.
 */
export function runLocaleScript(document: Document, languages: readonly string[], location: Pick<Location, 'replace'>): void {
  document.querySelectorAll<HTMLElement>('[data-locale]').forEach((link) => {
    link.addEventListener('click', () => {
      if (link.dataset.locale !== undefined) writeChoice(link.dataset.locale);
    });
  });

  const offer = document.getElementById('lang-offer');
  if (offer === null) return;
  const links = [...offer.querySelectorAll<HTMLAnchorElement>('[data-offer]')];
  const stored = readChoice();
  const chosen = links.find((link) => link.dataset.offer === stored);
  if (chosen !== undefined) {
    location.replace(chosen.href);
    return;
  }
  if (stored !== null || readStored('locale-offer') !== null) return;

  const page = document.documentElement.lang;
  for (const tag of languages) {
    if (sameLanguage(tag, page)) break;
    const match = links.find((link) => sameLanguage(link.lang, tag));
    if (match !== undefined) {
      match.hidden = false;
      offer.hidden = false;
      break;
    }
  }
  offer.querySelector('[data-dismiss]')?.addEventListener('click', () => {
    writeStored('locale-offer', 'dismissed');
    offer.hidden = true;
  });
}
