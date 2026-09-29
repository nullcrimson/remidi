import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { CONTACT_EMAIL, href, ISSUES_URL, localHref, plainText, sectionBlocks } from '../src/content/site';
import { FOOTER, NAV, SECTION_KEYS } from '../src/generated/i18n';
import { ENGLISH } from '../src/i18n';

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

  it('flattens inline links to their text', () => {
    expect(plainText(['See ', { text: 'maps', href: '/engines/' }, '.'])).toBe('See maps.');
  });

  it('leaves the home page head and no-script text to the site generator', () => {
    expect(indexHtml).toContain('<!--app-head--><title>Drumverter</title><!--/app-head-->');
    expect(indexHtml).toContain('<!--app-noscript--><!--/app-noscript-->');
    expect(indexHtml).not.toContain('application/ld+json');
  });

  it('points a document link at the same page in the page language', () => {
    expect(localHref('/engines/', 'pl')).toBe('/pl/engines/');
    expect(localHref('/faq/', 'pl')).toBe('/pl/faq/');
    expect(localHref('/engines/', 'en')).toBe('/engines/');
  });

  it('links a Polish page to its translated sections', () => {
    expect(href({ section: 'faq' }, 'pl')).toBe('/pl/faq/');
    expect(href({ section: 'terms' }, 'pl')).toBe('/pl/terms/');
    expect(href({ route: 'converter' }, 'pl')).toBe('/pl/');
    expect(href({ route: 'noteMaps' }, 'pl')).toBe('/pl/engines/');
  });
});
