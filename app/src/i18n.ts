import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle';
import enFtl from '../../locales/en/app.ftl?raw';
import { LOCALES, MESSAGE_IDS, type Locale, type Message } from './generated/i18n';

type Loader = () => Promise<string>;
type Pattern = NonNullable<NonNullable<ReturnType<FluentBundle['getMessage']>>['value']>;

const LOADERS = import.meta.glob<string>(['../../locales/*/app.ftl', '!../../locales/en/app.ftl'], { query: '?raw', import: 'default' });

let bundle: FluentBundle | null = null;
let patterns: Record<string, Pattern> = {};

function install(tag: string, ftl: string, ids: readonly string[] = MESSAGE_IDS): void {
  const b = new FluentBundle(tag, { useIsolating: false });
  const errors = b.addResource(new FluentResource(ftl));
  if (errors.length > 0) throw new Error(errors.map(String).join('; '));
  const found: Record<string, Pattern> = {};
  const missing: string[] = [];
  for (const id of ids) {
    const pattern = b.getMessage(id)?.value;
    if (pattern) found[id] = pattern;
    else missing.push(id);
  }
  if (missing.length > 0) throw new Error(`missing messages: ${missing.join(', ')}`);
  bundle = b;
  patterns = found;
}

/** Loads `locale`'s messages; English is bundled, the others are fetched. */
export async function loadMessages(locale: Locale, load?: Loader): Promise<void> {
  const loader = load ?? (locale === 'en' ? async () => enFtl : LOADERS[`../../locales/${locale}/app.ftl`]);
  install(LOCALES[locale].langTag, await loader());
}

export function initForTests(ftl: string, ids?: readonly string[]): void {
  install('en', ftl, ids ?? new FluentResource(ftl).body.map((m) => m.id));
}

/** The message's text in the loaded locale; total once `loadMessages` has resolved. */
export function t(m: Message): string {
  const errors: Error[] = [];
  const text = bundle!.formatPattern(patterns[m.id], m.args as Record<string, FluentVariable> | undefined, errors);
  if (errors.length > 0) console.error(m.id, errors);
  return text;
}
