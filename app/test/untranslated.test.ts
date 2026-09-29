import { FluentParser, FluentSerializer, Message } from '@fluent/syntax';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALE_CODES } from '../src/generated/i18n';

const file = (path: string) => join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'locales', path);

function entries(code: string): Map<string, string> {
  const serializer = new FluentSerializer();
  const resource = new FluentParser({ withSpans: false }).parse(readFileSync(file(`${code}/app.ftl`), 'utf8'));
  return new Map(resource.body.filter((e): e is Message => e instanceof Message).map((m) => [m.id.name, serializer.serializeEntry(m)]));
}

function allowed(code: string): string[] {
  const list = file(`${code}/same-as-english.txt`);
  return existsSync(list) ? readFileSync(list, 'utf8').split(/\r?\n/).filter(Boolean) : [];
}

describe('translated messages', () => {
  const english = entries('en');
  for (const code of LOCALE_CODES.filter((c) => c !== 'en')) {
    it(`${code} keeps English text only where it says so`, () => {
      const same = [...entries(code)]
        .filter(([id, text]) => english.get(id) === text && /\p{L}/u.test(text.replace(/\{[^}]*\}/g, '').replace(/^[\w-]+ =/, '')))
        .map(([id]) => id);
      expect(same.filter((id) => !allowed(code).includes(id))).toEqual([]);
    });
  }
});
