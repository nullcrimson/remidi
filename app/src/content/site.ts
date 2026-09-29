import docs from './docs/en.json';
import { LOCALES, SECTION_KEYS, SECTION_MESSAGES, SECTION_SLUGS, TRANSLATED_SECTIONS, type Locale, type Message, type NavTarget, type SectionKey } from '../generated/i18n';
import type { Translator } from '../i18n';

export type Inline = string | { text: string; href: string };
export interface Step {
  title: string;
  body: string;
}
export interface Qa {
  q: string;
  a: string;
}
export type Block
  = | { p: Inline[] }
    | { steps: Step[] }
    | { list: Inline[][] }
    | { faq: Qa[] }
    | { h: string }
    | { note: Step };

export const ISSUES_URL = 'https://github.com/nullcrimson/remidi/issues';
export const CONTACT_EMAIL = 'null.crimson.dev@gmail.com';

export type Docs = Partial<Record<SectionKey, Block[]>>;

export const EN_DOCS: Record<SectionKey, Block[]> = docs as Record<SectionKey, Block[]>;

/** A section's document in the translator's language, or English when it lacks one. */
export function sectionBlocks(key: SectionKey, translator: Translator): Block[] {
  return translator.docs[key] ?? EN_DOCS[key];
}

/** Where a nav or footer link goes from a `locale` page; missing sections link to English. */
export function href(target: NavTarget, locale: Locale = 'en'): string {
  const { prefix } = LOCALES[locale];
  const base = prefix === '' ? '' : `/${prefix}`;
  if ('route' in target) return target.route === 'converter' ? `${base}/` : `${base}/engines/`;
  const slug = SECTION_SLUGS[target.section];
  return TRANSLATED_SECTIONS[locale].includes(target.section) ? `${base}/${slug}/` : `/${slug}/`;
}

/** A document's internal link, pointed at the same page in `locale`. */
export function localHref(path: string, locale: Locale): string {
  const section = SECTION_KEYS.find((k) => path === `/${SECTION_SLUGS[k]}/`);
  if (section !== undefined) return href({ section }, locale);
  const { prefix } = LOCALES[locale];
  return prefix === '' ? path : `/${prefix}${path}`;
}

export function targetLabel(target: NavTarget): Message {
  if ('route' in target) return { id: target.route === 'converter' ? 'nav-converter' : 'nav-note-maps' };
  return { id: SECTION_MESSAGES[target.section].label };
}

export function plainText(inline: Inline[]): string {
  return inline.map((i) => (typeof i === 'string' ? i : i.text)).join('');
}
