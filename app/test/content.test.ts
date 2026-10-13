import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { CONTACT_EMAIL, href, ISSUES_URL, localHref, sectionBlocks } from '../src/content/site';
import { FOOTER, LOCALE_CODES, NAV, SECTION_KEYS } from '../src/generated/i18n';
import { ENGLISH } from '../src/i18n';

const NAV_LINKS: unknown = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'midiremap-site', 'tests', 'golden', 'nav-links.json'),
  'utf8',
));

describe('site content', () => {
  it('links the contact and issue documents to the addresses the app uses', () => {
    const links = JSON.stringify([sectionBlocks('issue', ENGLISH), sectionBlocks('contact', ENGLISH)]);
    expect(links).toContain(`"href":"${ISSUES_URL}"`);
    expect(links).toContain(`"href":"mailto:${CONTACT_EMAIL}"`);
  });

  it('links internally only to known routes and sections', () => {
    const known = new Set([...NAV, ...FOOTER, ...SECTION_KEYS.map((section) => ({ section }))].map((target) => href(target)));
    const internal = SECTION_KEYS.flatMap((k) => JSON.stringify(sectionBlocks(k, ENGLISH)).match(/"href":"\/[^"]*"/g) ?? [])
      .map((m) => m.slice(8, -1));
    expect(internal.length).toBeGreaterThan(0);
    for (const h of internal) expect(known).toContain(h);
  });

  it('leaves the home page head and no-script text to the site generator', () => {
    expect(indexHtml).toContain('<!--app-head--><title>Drumverter</title><!--/app-head-->');
    expect(indexHtml).toContain('<!--app-noscript--><!--/app-noscript-->');
    expect(indexHtml).not.toContain('application/ld+json');
  });

  it('links nav and footer to the addresses the site generator records for every locale', () => {
    const table = Object.fromEntries(LOCALE_CODES.map((locale) => [locale, {
      nav: NAV.map((target) => href(target, locale)),
      footer: FOOTER.map((target) => href(target, locale)),
    }]));
    expect(table).toEqual(NAV_LINKS);
  });

  it('points a document link at the same page in the page language', () => {
    expect(localHref('/engines/', 'pl')).toBe('/pl/engines/');
    expect(localHref('/faq/', 'pl')).toBe('/pl/faq/');
    expect(localHref('/engines/', 'en')).toBe('/engines/');
  });
});
