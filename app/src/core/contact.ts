import type { StatEvents } from './umami';

/** Where bug reports and wrong-mapping reports go. */
export const ISSUES_URL = 'https://github.com/nullcrimson/remidi/issues';

/** The address a person can write to. */
export const CONTACT_EMAIL = 'null.crimson.dev@gmail.com';

/** Which of the two contact links `href` is, or null for any other address. */
export function contactLink(href: string): StatEvents['contact-used']['link'] | null {
  if (href === ISSUES_URL) return 'issues';
  return href === `mailto:${CONTACT_EMAIL}` ? 'email' : null;
}
