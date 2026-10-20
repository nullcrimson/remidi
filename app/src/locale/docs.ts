import docs from '../../../locales/en/docs.json';
import type { SectionKey } from '../generated/i18n';

export type Inline = string | { text: string; href: string };
interface Step {
  title: string;
  body: string;
}
interface Qa {
  q: string;
  a: Inline[];
}
/** The converter's steps, by the key the guide gives each one's text. */
export type ConverterStep = 'file' | 'engines' | 'convert';
export type Block
  = | { p: Inline[] }
    | { 'converter-steps': Record<ConverterStep, string> }
    | { list: Inline[][] }
    | { faq: Qa[] }
    | { h: string }
    | { note: Step };

export type Docs = Partial<Record<SectionKey, Block[]>>;

export const EN_DOCS: Record<SectionKey, Block[]> = docs as Record<SectionKey, Block[]>;

/** A section's document in `docs`, or English when it lacks one. */
export function sectionBlocks(key: SectionKey, docs: Docs): Block[] {
  return docs[key] ?? EN_DOCS[key];
}
