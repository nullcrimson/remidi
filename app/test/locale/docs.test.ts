import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, ISSUES_URL } from '../../src/core/contact';
import { FOOTER, NAV, SECTION_KEYS } from '../../src/generated/i18n';
import { sectionBlocks } from '../../src/locale/docs';
import { ENGLISH } from '../../src/locale/i18n';
import { href } from '../../src/site/site';

describe('documents', () => {
  it('links the contact and issue documents to the addresses the app uses', () => {
    const links = JSON.stringify([sectionBlocks('issue', ENGLISH.docs), sectionBlocks('contact', ENGLISH.docs)]);
    expect(links).toContain(`"href":"${ISSUES_URL}"`);
    expect(links).toContain(`"href":"mailto:${CONTACT_EMAIL}"`);
  });

  it('links internally only to known routes and sections', () => {
    const known = new Set([...NAV, ...FOOTER, ...SECTION_KEYS.map((section) => ({ section }))].map((target) => href(target)));
    const internal = SECTION_KEYS.flatMap((k) => JSON.stringify(sectionBlocks(k, ENGLISH.docs)).match(/"href":"\/[^"]*"/g) ?? [])
      .map((m) => m.slice(8, -1));
    expect(internal.length).toBeGreaterThan(0);
    for (const h of internal) expect(known).toContain(h);
  });
});
