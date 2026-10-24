import { FluentParser, FluentSerializer, Placeable, StringLiteral, TextElement, Transformer, type Pattern } from '@fluent/syntax';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPECIAL = new Set(['.', '[', '*']);

class EscapeLeading extends Transformer {
  visitPattern(pattern: Pattern): Pattern {
    const [first] = pattern.elements;
    if (first instanceof TextElement && SPECIAL.has(first.value[0])) {
      pattern.elements.splice(0, 1, new Placeable(new StringLiteral(first.value[0])), new TextElement(first.value.slice(1)));
    }
    return this.genericVisit(pattern) as Pattern;
  }
}

/** The Fluent file `ftl` in the layout translate-toolkit, and so Weblate, writes. */
export function canonicalFtl(ftl: string): string {
  const resource = new FluentParser({ withSpans: false }).parse(ftl);
  new EscapeLeading().visit(resource);
  return new FluentSerializer().serialize(resource);
}

/** The `app.ftl` and `site.ftl` paths of every locale, relative to the repo root. */
export function ftlPaths(codes: string[]): string[] {
  return codes.flatMap((code) => ['app.ftl', 'site.ftl'].map((name) => `locales/${code}/${name}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const codes = (JSON.parse(readFileSync(join(root, 'locales/locales.json'), 'utf8')) as { code: string }[]).map((l) => l.code);
  const rewritten = ftlPaths(codes).filter((path) => {
    const file = join(root, path);
    const before = readFileSync(file, 'utf8');
    const after = canonicalFtl(before);
    if (after !== before) writeFileSync(file, after);
    return after !== before;
  });
  console.log(`rewrote ${rewritten.length} of ${ftlPaths(codes).length} files`);
}
