import docs from '../../../locales/en/docs.json';
import type { MessageId, SectionKey } from '../generated/i18n';

export type Inline = string | { text: string; href: string };
interface Note {
  title: string;
  body: string;
}
interface Qa {
  q: string;
  a: Inline[];
}
/** The converter's steps in order, each by the key the guide gives its text, with the message that titles it. */
export const CONVERTER_STEPS = [
  { key: 'file', title: 'step-file' },
  { key: 'engines', title: 'step-engines' },
  { key: 'convert', title: 'step-convert' },
] as const satisfies readonly { key: string; title: MessageId }[];
export type ConverterStep = (typeof CONVERTER_STEPS)[number]['key'];
export type Block
  = | { p: Inline[] }
    | { 'converter-steps': Record<ConverterStep, string> }
    | { list: Inline[][] }
    | { faq: Qa[] }
    | { h: string }
    | { note: Note };

export type Docs = Partial<Record<SectionKey, Block[]>>;

export const EN_DOCS: Record<SectionKey, Block[]> = docs as Record<SectionKey, Block[]>;

/** A section's document in `docs`, or English when it lacks one. */
export function sectionBlocks(key: SectionKey, docs: Docs): Block[] {
  return docs[key] ?? EN_DOCS[key];
}
