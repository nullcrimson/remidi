import { fileURLToPath } from 'node:url';
import postcss, { type AtRule, type Container, type Declaration, type Root } from 'postcss';
import { steadyFonts } from '../scripts/steadyFonts';

const INDEX_CSS = fileURLToPath(new URL('../src/index.css', import.meta.url));

const face = (family: string, file: string, weight = '300 700') =>
  `@font-face{font-family:${family};font-style:normal;font-display:swap;font-weight:${weight};src:url(../node_modules/${file})format("woff2-variations")}`;

const SPACE = face('Space Grotesk Variable', '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2');
const SPACE_EXT = face('Space Grotesk Variable', '@fontsource-variable/space-grotesk/files/space-grotesk-latin-ext-wght-normal.woff2');
const PLEX = face('IBM Plex Sans Variable', '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2', '100 700');
const MONO = face('IBM Plex Mono', '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', '400');
const MONO_BOLD = face('IBM Plex Mono', '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2', '600');

const STACKS = `:root{--font-display:'Space Grotesk Variable', 'IBM Plex Sans Variable', system-ui;--font-mono:'IBM Plex Mono', monospace}`;

const ARIAL = "local('Arial'), local('Liberation Sans')";
const ROBOTO = "local('Roboto')";
const COURIER = "local('Courier New'), local('Liberation Mono')";

const run = async (css: string): Promise<Root> => (await postcss([steadyFonts()]).process(css, { from: INDEX_CSS })).root;

const declsOf = (node: Container) => Object.fromEntries(
  (node.nodes ?? []).filter((child): child is Declaration => child.type === 'decl').map((decl) => [decl.prop, decl.value]),
);

const bare = (family: string) => family.replace(/['"]/g, '').trim();

const stackOf = (root: Root, prop: string) => bare(declsOf(root.nodes.find((node) => node.type === 'rule') as Container)[prop]).split(/\s*,\s*/);

const facesNamed = (root: Root, family: string) => root.nodes
  .filter((node): node is AtRule => node.type === 'atrule' && node.name === 'font-face')
  .map(declsOf)
  .filter((decls) => bare(decls['font-family']) === family);

const standInsAfter = (root: Root, prop: string, family: string, count: number) => {
  const stack = stackOf(root, prop);
  const at = stack.indexOf(family);
  return { sized: stack.slice(at + 1, at + 1 + count).map((name) => facesNamed(root, name)), next: stack[at + 1 + count] };
};

const expectSized = (faces: Record<string, string>[], src: string) => {
  expect(faces).toHaveLength(1);
  expect(faces[0].src).toBe(src);
  expect(faces[0]['size-adjust']).not.toBe('100%');
};

describe('steady fonts', () => {
  it('never swaps a late web font in', async () => {
    const root = await run(MONO);
    expect(facesNamed(root, 'IBM Plex Mono')[0]['font-display']).toBe('optional');
  });

  it('puts sized Arial and Roboto stand-ins right behind each sans web font', async () => {
    const root = await run(SPACE + SPACE_EXT + PLEX + STACKS);
    const space = standInsAfter(root, '--font-display', 'Space Grotesk Variable', 2);
    expectSized(space.sized[0], ARIAL);
    expectSized(space.sized[1], ROBOTO);
    expect(space.next).toBe('IBM Plex Sans Variable');
    const plex = standInsAfter(root, '--font-display', 'IBM Plex Sans Variable', 2);
    expectSized(plex.sized[0], ARIAL);
    expectSized(plex.sized[1], ROBOTO);
    expect(plex.next).toBe('system-ui');
  });

  it('puts a sized Courier stand-in right behind the mono stack’s web font', async () => {
    const root = await run(SPACE + PLEX + MONO + MONO_BOLD + STACKS);
    const mono = standInsAfter(root, '--font-mono', 'IBM Plex Mono', 1);
    expectSized(mono.sized[0], COURIER);
    expect(mono.next).toBe('monospace');
  });

  it('leaves descriptors outside font faces alone', async () => {
    const root = await run('a{font-display:swap}');
    expect(root.toString()).toBe('a{font-display:swap}');
  });

  it('refuses a web font file it cannot read', async () => {
    const css = `${face('Nowhere', 'nowhere/files/nowhere-latin-wght-normal.woff2')}:root{--font-sans:'Nowhere', sans-serif}`;
    await expect(run(css)).rejects.toThrow();
  });
});
