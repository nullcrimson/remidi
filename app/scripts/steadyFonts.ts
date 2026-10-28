import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateFontFace, getMetricsForFamily, readMetrics } from 'fontaine';
import postcss, { list, type AtRule, type Container, type Declaration, type Plugin, type Root } from 'postcss';
import { latinFont, type LatinFont } from './latinFonts.ts';

interface StandIn {
  suffix: string;
  font: string;
  sources: readonly string[];
}

interface WebFont {
  family: string;
  file: URL;
  fallbacks: readonly { standIn: StandIn; name: string }[];
}

const SANS: readonly StandIn[] = [
  { suffix: 'Arial', font: 'Arial', sources: ['Arial', 'Liberation Sans'] },
  { suffix: 'Roboto', font: 'Roboto', sources: ['Roboto'] },
];

const MONO: readonly StandIn[] = [{ suffix: 'Courier', font: 'Courier New', sources: ['Courier New', 'Liberation Mono'] }];

const REGULAR_WEIGHT = 400;

const URL_IN_SRC = /url\(\s*(['"]?)([^'")]+)\1\s*\)/;

const unquoted = (family: string) => family.trim().replace(/^['"]|['"]$/g, '');

function descriptor(node: Container, prop: string): string | undefined {
  let value: string | undefined;
  node.walkDecls(prop, (decl) => {
    value = decl.value;
  });
  return value;
}

function fontFaces(root: Root): AtRule[] {
  const faces: AtRule[] = [];
  root.walkAtRules('font-face', (face) => {
    faces.push(face);
  });
  return faces;
}

const sourceUrl = (face: AtRule) => URL_IN_SRC.exec(descriptor(face, 'src') ?? '')?.[2];

const drawsRegularText = (font: LatinFont) => font.weight === 'variable' || font.weight === REGULAR_WEIGHT;

const standInName = (family: string, standIn: StandIn) => `${family} ${standIn.suffix}`;

const insideFontFace = (decl: Declaration) => decl.parent?.type === 'atrule' && (decl.parent as AtRule).name === 'font-face';

const isStack = (decl: Declaration) => !insideFontFace(decl) && (decl.prop === 'font-family' || decl.prop.startsWith('--font-'));

function neverSwap(root: Root) {
  for (const face of fontFaces(root)) {
    face.walkDecls('font-display', (decl) => {
      decl.value = 'optional';
    });
  }
}

function latinFace(face: AtRule): [string, URL][] {
  const family = descriptor(face, 'font-family');
  const url = sourceUrl(face);
  if (url === undefined) return [];
  const font = latinFont(url);
  if (!family || !font || !drawsRegularText(font)) return [];
  const from = face.source?.input.file;
  if (!from) throw new Error(`steady fonts: ${family} has no source file to resolve ${url} against`);
  return [[unquoted(family), pathToFileURL(resolve(dirname(from), url))]];
}

function monoFamilies(root: Root): Set<string> {
  const mono = new Set<string>();
  root.walkDecls('--font-mono', (decl) => list.comma(decl.value).forEach((family) => mono.add(unquoted(family))));
  return mono;
}

function webFontsOf(root: Root): WebFont[] {
  const mono = monoFamilies(root);
  const files = new Map(fontFaces(root).flatMap(latinFace));
  return [...files].map(([family, file]) => ({
    family,
    file,
    fallbacks: (mono.has(family) ? MONO : SANS).map((standIn) => ({ standIn, name: standInName(family, standIn) })),
  }));
}

function withStandIns(value: string, standIns: ReadonlyMap<string, readonly string[]>): string {
  const families = list.comma(value);
  return families
    .flatMap((family) => {
      const names = standIns.get(unquoted(family)) ?? [];
      const missing = names.filter((name) => !families.some((other) => unquoted(other) === name));
      return [family, ...missing.map((name) => `'${name}'`)];
    })
    .join(', ');
}

function addStandIns(root: Root, webFonts: readonly WebFont[]) {
  const standIns = new Map(webFonts.map(({ family, fallbacks }) => [family, fallbacks.map(({ name }) => name)]));
  root.walkDecls((decl) => {
    if (isStack(decl)) decl.value = withStandIns(decl.value, standIns);
  });
}

async function sizedFace(file: URL, name: string, standIn: StandIn): Promise<AtRule> {
  const [metrics, fallback] = await Promise.all([readMetrics(file), getMetricsForFamily(standIn.font)]);
  if (!metrics) throw new Error(`steady fonts: no metrics for ${file.href}`);
  if (!fallback) throw new Error(`steady fonts: no metrics for ${standIn.font}`);
  const face = postcss.parse(generateFontFace(metrics, { name, font: standIn.font, metrics: fallback })).first as AtRule;
  face.walkDecls('src', (decl) => {
    decl.value = standIn.sources.map((source) => `local('${source}')`).join(', ');
  });
  return face;
}

const sizedFaces = (webFonts: readonly WebFont[]) =>
  Promise.all(webFonts.flatMap(({ file, fallbacks }) => fallbacks.map(({ standIn, name }) => sizedFace(file, name, standIn))));

/**
 * Web fonts never move the page: a font that is not ready at first paint is not swapped in
 * later (`font-display: optional`), and the text meanwhile is drawn in a system font sized to
 * the web font's proportions, placed right behind it in every font stack.
 */
export function steadyFonts(): Plugin {
  return {
    postcssPlugin: 'steady-fonts',
    async OnceExit(root) {
      neverSwap(root);
      const webFonts = webFontsOf(root);
      addStandIns(root, webFonts);
      root.append(...(await sizedFaces(webFonts)));
    },
  };
}
