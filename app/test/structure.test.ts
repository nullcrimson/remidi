import { createRequire } from 'node:module';
import { posix } from 'node:path';
import type * as TypeScript from 'typescript';
import { describe, expect, it } from 'vitest';

const ts: typeof TypeScript = createRequire(import.meta.url)('typescript');

const MAX_LINES = 250;

const SOURCES = import.meta.glob<string>(
  ['../src/**/*.{ts,tsx}', '!../src/{generated,wasm}/**'],
  { query: '?raw', import: 'default', eager: true },
);

const ALLOWED_IMPORTS: Record<string, readonly string[]> = {
  core: [],
  locale: ['core'],
  ui: ['core', 'locale'],
  site: ['core', 'locale', 'ui'],
  tip: ['core', 'locale', 'ui'],
  engines: ['core', 'locale', 'ui'],
  presets: ['core', 'locale', 'ui'],
  report: ['core', 'locale', 'ui'],
  editor: ['core', 'locale', 'presets', 'ui'],
  convert: ['core', 'editor', 'engines', 'locale', 'presets', 'report', 'tip', 'ui'],
};

const GENERATED_IMPORTERS: readonly string[] = Object.keys(ALLOWED_IMPORTS);
const WASM_IMPORTERS: readonly string[] = ['core'];

const SRC_PREFIX = '../src/';

function importSpecifiers(file: string, text: string): string[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const specifiers: string[] = [];
  const visit = (node: TypeScript.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      specifiers.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function targetFolder(file: string, specifier: string): string | null {
  if (specifier === '@wasm') return 'wasm';
  if (!specifier.startsWith('.')) return null;
  const target = posix.join(posix.dirname(file), specifier);
  if (!target.startsWith(SRC_PREFIX)) return null;
  const segments = target.slice(SRC_PREFIX.length).split('/');
  return segments.length > 1 ? segments[0] : '';
}

function ownFolder(file: string): string {
  const segments = file.slice(SRC_PREFIX.length).split('/');
  return segments.length > 1 ? segments[0] : '';
}

function edges(): { file: string; from: string; to: string }[] {
  return Object.entries(SOURCES).flatMap(([file, text]) => importSpecifiers(file, text).flatMap((specifier) => {
    const to = targetFolder(file, specifier);
    return to === null ? [] : [{ file: file.slice(SRC_PREFIX.length), from: ownFolder(file), to }];
  }));
}

describe('app structure', () => {
  it('scans the app sources', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(40);
  });

  it(`keeps every source file within ${MAX_LINES} lines`, () => {
    const long = Object.entries(SOURCES)
      .map(([file, text]) => [file, text.trimEnd().split('\n').length] as const)
      .filter(([, lines]) => lines > MAX_LINES)
      .map(([file, lines]) => `${file}: ${lines}`);
    expect(long).toEqual([]);
  });

  it('puts every source folder in the table of allowed imports', () => {
    const unlisted = [...new Set(Object.keys(SOURCES).map(ownFolder))].filter((folder) => folder !== '' && !(folder in ALLOWED_IMPORTS));
    expect(unlisted).toEqual([]);
  });

  it('lets no two folders import each other in the table', () => {
    const mutual = Object.entries(ALLOWED_IMPORTS).flatMap(([a, targets]) => targets
      .filter((b) => ALLOWED_IMPORTS[b]?.includes(a))
      .map((b) => `${a} <-> ${b}`));
    expect(mutual).toEqual([]);
  });

  it('imports across folders only along the table; files at the root of src may import any folder', () => {
    const outOfOrder = edges()
      .filter(({ from, to }) => from !== '' && to !== from && to !== 'generated' && to !== 'wasm' && !ALLOWED_IMPORTS[from]?.includes(to))
      .map(({ file, from, to }) => `${file}: ${from} -> ${to}`);
    expect(outOfOrder).toEqual([]);
  });

  it('imports generated/ from the folders of the table and wasm/ only from core', () => {
    const outOfOrder = edges()
      .filter(({ from, to }) => (to === 'generated' && from !== '' && !GENERATED_IMPORTERS.includes(from)) || (to === 'wasm' && !WASM_IMPORTERS.includes(from)))
      .map(({ file, from, to }) => `${file}: ${from} -> ${to}`);
    expect(outOfOrder).toEqual([]);
  });
});
