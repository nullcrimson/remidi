import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, contactLink, ISSUES_URL } from '../../src/core/contact';

describe('contactLink', () => {
  it('knows the issues address', () => {
    expect(contactLink(ISSUES_URL)).toBe('issues');
  });

  it('knows the email address', () => {
    expect(contactLink(`mailto:${CONTACT_EMAIL}`)).toBe('email');
  });

  it('knows no other address', () => {
    expect(contactLink('https://example.com/')).toBeNull();
  });
});
