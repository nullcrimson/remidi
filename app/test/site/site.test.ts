import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { href, localHref } from '../../src/site/site';
import { FOOTER, LOCALE_CODES, NAV } from '../../src/generated/i18n';

const NAV_LINKS: unknown = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'midiremap-site', 'tests', 'golden', 'nav-links.json'),
  'utf8',
));

describe('site content', () => {
  it('leaves the home page head to the site generator', () => {
    expect(indexHtml).toContain('<!--app-head--><title>Drumverter</title><!--/app-head-->');
  });

  it('leaves the home page no-script text to the site generator', () => {
    expect(indexHtml).toContain('<!--app-noscript--><!--/app-noscript-->');
  });

  it('keeps structured data out of the home page source', () => {
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
  });

  it('leaves a document link in English as it is', () => {
    expect(localHref('/engines/', 'en')).toBe('/engines/');
  });
});

describe('links', () => {
  it('resolves routes for English', () => {
    expect(href({ route: 'converter' })).toBe('/');
    expect(href({ route: 'noteMaps' })).toBe('/engines/');
  });

  it('links sections by slug for English', () => {
    expect(href({ section: 'guide' })).toBe('/how-it-works/');
  });
});
