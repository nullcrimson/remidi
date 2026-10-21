import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';
import { describe, expect, it } from 'vitest';

const ts: typeof TypeScript = createRequire(import.meta.url)('typescript');

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..', '..', 'midiremap-site');

function filesIn(folder: string, extension: string): { name: string; text: string }[] {
  const dir = join(SITE, folder);
  return readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));
}

const TEMPLATES = filesIn('templates', '.html');
const SCRIPTS = filesIn('static', '.js');

function memberNames(type: TypeScript.TypeNode): string[] {
  if (ts.isTypeLiteralNode(type)) return type.members.flatMap((m) => (m.name === undefined ? [] : [m.name.getText()]));
  if (ts.isUnionTypeNode(type)) return type.types.flatMap(memberNames);
  return [];
}

function eventParameters(): Map<string, string[]> {
  const path = join(HERE, '..', 'src', 'core', 'umami.ts');
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const events = new Map<string, string[]>();
  source.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== 'StatEvents') return;
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || member.type === undefined) continue;
      events.set(member.name.getText().replace(/'/g, ''), memberNames(member.type));
    }
  });
  return events;
}

const EVENTS = eventParameters();

const markedTags = TEMPLATES.flatMap(({ name, text }) =>
  [...text.matchAll(/<[a-z][^<>]*?data-umami-event="([^"]+)"[^<>]*>/g)].map((m) => ({ name, event: m[1], tag: m[0] })),
);

const trackCalls = SCRIPTS.flatMap(({ name, text }) =>
  [...text.matchAll(/umami\??\.track\('([^']+)'(?:,\s*\{([^}]*)\})?\)/g)].map((m) => ({
    name,
    event: m[1],
    keys: [...(m[2] ?? '').matchAll(/(\w+)\s*:/g)].map((k) => k[1]),
  })),
);

describe('the events the static pages send', () => {
  it('reads the event map from its source', () => {
    expect(EVENTS.size).toBe(43);
  });

  it('finds links marked for Umami in the templates', () => {
    expect(markedTags.length).toBeGreaterThan(0);
  });

  it('finds the track calls of the static scripts', () => {
    expect(trackCalls.length).toBeGreaterThan(0);
  });

  it('marks links only with events of the map', () => {
    expect(markedTags.filter(({ event }) => !EVENTS.has(event)).map(({ name, event }) => `${name}: ${event}`)).toEqual([]);
  });

  it('gives a marked link only parameters of its event', () => {
    const wrong = markedTags.flatMap(({ name, event, tag }) =>
      [...tag.matchAll(/data-umami-event-([a-z]+)=/g)]
        .map((m) => m[1])
        .filter((key) => !EVENTS.get(event)?.includes(key))
        .map((key) => `${name}: ${event} has no ${key}`),
    );
    expect(wrong).toEqual([]);
  });

  it('tracks only events of the map from the static scripts', () => {
    expect(trackCalls.filter(({ event }) => !EVENTS.has(event)).map(({ name, event }) => `${name}: ${event}`)).toEqual([]);
  });

  it('sends only parameters of its event from the static scripts', () => {
    const wrong = trackCalls.flatMap(({ name, event, keys }) =>
      keys.filter((key) => !EVENTS.get(event)?.includes(key)).map((key) => `${name}: ${event} has no ${key}`),
    );
    expect(wrong).toEqual([]);
  });
});
