import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { builtFile } from '../scripts/devStatic';

const dist = mkdtempSync(join(tmpdir(), 'dist-'));
for (const file of ['index.html', 'engines/index.html', 'pl/index.html', 'pl/faq/index.html', 'assets/index-a.css', 'locale.js']) {
  mkdirSync(join(dist, file, '..'), { recursive: true });
  writeFileSync(join(dist, file), '');
}
const shells = ['/', '/pl/'];

describe('the dev server\'s built static pages', () => {
  it('serves a generated page', () => expect(builtFile(dist, '/engines/', shells)).toBe(join(dist, 'engines', 'index.html')));
  it('serves a translated page', () => expect(builtFile(dist, '/pl/faq/?x=1', shells)).toBe(join(dist, 'pl', 'faq', 'index.html')));
  it('serves the pages\' stylesheet and scripts', () => {
    expect(builtFile(dist, '/assets/index-a.css', shells)).toBe(join(dist, 'assets', 'index-a.css'));
    expect(builtFile(dist, '/locale.js', shells)).toBe(join(dist, 'locale.js'));
  });
  it('leaves the converter shells to the app', () => {
    expect(builtFile(dist, '/', shells)).toBeUndefined();
    expect(builtFile(dist, '/pl/', shells)).toBeUndefined();
    expect(builtFile(dist, '/index.html', shells)).toBeUndefined();
  });
  it('leaves source modules to Vite', () => expect(builtFile(dist, '/src/main.tsx', shells)).toBeUndefined());
  it('serves nothing for a page that was not built', () => expect(builtFile(dist, '/nope/', shells)).toBeUndefined());
  it('never serves outside the build', () => expect(builtFile(dist, '/assets/../../secret', shells)).toBeUndefined());
});
