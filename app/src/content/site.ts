import docs from './docs/en.json';
import { LOCALES, SECTION_MESSAGES, SECTION_SLUGS, type Locale, type Message, type NavTarget, type SectionKey } from '../generated/i18n';

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

const EN: Record<SectionKey, Block[]> = docs as Record<SectionKey, Block[]>;
const DOCS: Partial<Record<Locale, Partial<Record<SectionKey, Block[]>>>> = { en: EN };

/** A section's document in `locale`, or English when that locale lacks it. */
export function sectionBlocks(key: SectionKey, locale: Locale = 'en'): Block[] {
  return DOCS[locale]?.[key] ?? EN[key];
}

/** Where a nav or footer link goes from a `locale` page; missing sections link to English. */
export function href(target: NavTarget, locale: Locale = 'en'): string {
  const { prefix } = LOCALES[locale];
  const base = prefix === '' ? '' : `/${prefix}`;
  if ('route' in target) return target.route === 'converter' ? `${base}/` : '/engines/';
  const slug = SECTION_SLUGS[target.section];
  return DOCS[locale]?.[target.section] ? `${base}/${slug}/` : `/${slug}/`;
}

export function targetLabel(target: NavTarget): Message {
  if ('route' in target) return { id: target.route === 'converter' ? 'nav-converter' : 'nav-note-maps' };
  return { id: SECTION_MESSAGES[target.section].label };
}

export function plainText(inline: Inline[]): string {
  return inline.map((i) => (typeof i === 'string' ? i : i.text)).join('');
}
