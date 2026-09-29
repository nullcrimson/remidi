import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle';
import enFtl from '../../locales/en/app.ftl?raw';
import { EN_DOCS, type Docs } from './content/site';
import { LOCALES, MESSAGE_IDS, type Locale, type Message } from './generated/i18n';

type Pattern = NonNullable<NonNullable<ReturnType<FluentBundle['getMessage']>>['value']>;
export type Translate = (m: Message) => string;

export interface Translator {
  readonly locale: Locale;
  readonly t: Translate;
  readonly docs: Docs;
}

const FTL = import.meta.glob<string>(['../../locales/*/app.ftl', '!../../locales/en/app.ftl'], { query: '?raw', import: 'default' });
const DOCS = import.meta.glob<Docs>(['./content/docs/*.json', '!./content/docs/en.json'], { import: 'default' });

/** A translator for `ftl`; throws when it fails to parse or lacks one of `ids`. */
export function makeTranslator(locale: Locale, ftl: string, docs: Docs, ids: readonly string[] = MESSAGE_IDS): Translator {
  const bundle = new FluentBundle(LOCALES[locale].langTag, { useIsolating: false });
  const errors = bundle.addResource(new FluentResource(ftl));
  if (errors.length > 0) throw new Error(errors.map(String).join('; '));
  const patterns: Record<string, Pattern> = {};
  const missing: string[] = [];
  for (const id of ids) {
    const pattern = bundle.getMessage(id)?.value;
    if (pattern) patterns[id] = pattern;
    else missing.push(id);
  }
  if (missing.length > 0) throw new Error(`missing messages: ${missing.join(', ')}`);
  const t: Translate = (m) => {
    const formatErrors: Error[] = [];
    const text = bundle.formatPattern(patterns[m.id], m.args as Record<string, FluentVariable> | undefined, formatErrors);
    if (formatErrors.length > 0) console.error(m.id, formatErrors);
    return text;
  };
  return { locale, t, docs };
}

export const ENGLISH: Translator = makeTranslator('en', enFtl, EN_DOCS);

/** A locale's translator; English is bundled, the others load their messages and documents. */
export async function loadTranslator(locale: Locale): Promise<Translator> {
  if (locale === 'en') return ENGLISH;
  const [ftl, docs] = await Promise.all([
    FTL[`../../locales/${locale}/app.ftl`](),
    DOCS[`./content/docs/${locale}.json`](),
  ]);
  return makeTranslator(locale, ftl, docs);
}
