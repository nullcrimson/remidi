import { FluentParser, Junk, Message, type Pattern } from '@fluent/syntax';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface LocaleEntry { code: string; prefix: string; langTag: string; nativeName: string; fonts: string | null }
type Target = { route: 'converter' | 'noteMaps' } | { section: string };
interface Structure { sections: { key: string; slug: string }[]; nav: Target[]; footer: Target[] }
interface Sources { locales: LocaleEntry[]; structure: Structure; ftl: string }

function variables(pattern: Pattern | null, out: Set<string>): void {
  JSON.stringify(pattern, (_k, v) => {
    if (v && v.type === 'VariableReference') out.add(v.id.name);
    return v;
  });
}

/** Every message id in `ftl` with its variable names, in file order. */
export function argsOf(ftl: string): Record<string, string[]> {
  const resource = new FluentParser({ withSpans: false }).parse(ftl);
  const junk = resource.body.filter((e): e is Junk => e instanceof Junk);
  if (junk.length > 0) throw new Error(`locales/en/app.ftl: ${junk.map((j) => j.annotations.map((a) => a.message).join('; ')).join(' | ')}`);
  return Object.fromEntries(resource.body.filter((e): e is Message => e instanceof Message).map((m) => {
    const vars = new Set<string>();
    variables(m.value, vars);
    m.attributes.forEach((a) => variables(a.value, vars));
    return [m.id.name, [...vars]];
  }));
}

export function parseSources(s: Sources): Sources & { args: Record<string, string[]> } {
  const keys = new Set(s.structure.sections.map((x) => x.key));
  for (const t of [...s.structure.nav, ...s.structure.footer]) {
    if ('section' in t && !keys.has(t.section)) throw new Error(`structure.json: unknown section '${t.section}'`);
  }
  return { ...s, args: argsOf(s.ftl) };
}

const union = (xs: string[]) => xs.map((x) => `'${x}'`).join(' | ');

export function generate(s: ReturnType<typeof parseSources>): { ts: string; css: string } {
  const ids = Object.keys(s.args);
  const keys = s.structure.sections.map((x) => x.key);
  const header = ids.some((id) => s.args[id].length > 0) ? 'import type { FluentVariable } from \'@fluent/bundle\';\n\n' : '';
  const ts = `${header}export type Locale = ${union(s.locales.map((l) => l.code))};
export const LOCALES: Record<Locale, { prefix: string; langTag: string }> = ${JSON.stringify(Object.fromEntries(s.locales.map(({ code, prefix, langTag }) => [code, { prefix, langTag }])))};
export function parseLocale(segment: string): Locale | undefined {
  return (Object.keys(LOCALES) as Locale[]).find((l) => LOCALES[l].prefix !== '' && LOCALES[l].prefix === segment);
}

export type SectionKey = ${union(keys)};
export const SECTION_KEYS: readonly SectionKey[] = ${JSON.stringify(keys)};
export const SECTION_SLUGS: Record<SectionKey, string> = ${JSON.stringify(Object.fromEntries(s.structure.sections.map((x) => [x.key, x.slug])))};
export type NavTarget = { route: 'converter' } | { route: 'noteMaps' } | { section: SectionKey };
export const NAV: NavTarget[] = ${JSON.stringify(s.structure.nav)};
export const FOOTER: NavTarget[] = ${JSON.stringify(s.structure.footer)};

export type MessageId = ${union(ids)};
export const MESSAGE_IDS: readonly MessageId[] = ${JSON.stringify(ids)};
export interface ArgsOf {
${ids.map((id) => `  '${id}': { ${s.args[id].map((v) => `${v}: FluentVariable`).join('; ')} };`).join('\n')}
}
export type Message = { [K in MessageId]: { id: K } & (keyof ArgsOf[K] extends never ? { args?: undefined } : { args: ArgsOf[K] }) }[MessageId];
export const SECTION_MESSAGES = {
${keys.map((k) => `  ${k}: { label: 'section-${k}-label', heading: 'section-${k}-heading', description: 'section-${k}-description' },`).join('\n')}
} as const satisfies Record<SectionKey, { label: MessageId; heading: MessageId; description: MessageId }>;
`;
  const css = s.locales.filter((l) => l.fonts).map((l) => `:lang(${l.langTag}) {\n  --font-sans: ${l.fonts};\n  --font-display: var(--font-sans);\n}\n`).join('');
  return { ts, css };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const read = (p: string) => readFileSync(join(root, p), 'utf8');
  const out = generate(parseSources({
    locales: JSON.parse(read('locales/locales.json')),
    structure: JSON.parse(read('app/src/content/structure.json')),
    ftl: read('locales/en/app.ftl'),
  }));
  const dir = join(root, 'app/src/generated');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'i18n.ts'), out.ts);
  writeFileSync(join(dir, 'lang.css'), out.css);
}
