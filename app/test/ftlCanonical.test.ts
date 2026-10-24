import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { canonicalFtl, ftlPaths } from '../scripts/format-ftl';
import { LOCALE_CODES } from '../src/generated/i18n';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const ftl = (...lines: string[]) => `${lines.join('\n')}\n`;

const select = (zero: string, one: string, other: string) => [
  'missing-hint-moved =',
  '    { $count ->',
  `        [0] ${zero}`,
  `        [one] { $count } ${one}`,
  `       *[other] { $count } ${other}`,
  '    }',
];

const original = select('nichts wird ersetzt', 'Instrument wird ersetzt', 'Instrumente werden ersetzt');

const weblateEdits = {
  plain: ftl(...original, 'notice-dismiss = Ausblenden', 'files-drop = Eine oder mehrere .mid-Dateien irgendwo ablegen'),
  select: ftl(...select('keine Trommel wird verschoben', 'Trommel auf anderer Trommel', 'Trommeln auf anderen Trommeln'), 'notice-dismiss = Schließen', 'files-drop = Eine oder mehrere .mid-Dateien irgendwo ablegen'),
  literal: ftl(...original, 'notice-dismiss = Schließen', 'files-drop = { "." }mid-Dateien hier ablegen'),
};

describe('Fluent layout', () => {
  for (const path of ftlPaths([...LOCALE_CODES])) {
    it(`${path.slice('locales/'.length)} is in the layout Weblate writes (npm run fmt:ftl)`, () => {
      const text = readFileSync(join(root, path), 'utf8');
      expect(canonicalFtl(text)).toBe(text);
    });
  }

  for (const [edit, text] of Object.entries(weblateEdits)) {
    it(`keeps translate-toolkit's output for a ${edit} edit as it is`, () => {
      expect(canonicalFtl(text)).toBe(text);
    });
  }

  it('escapes a value that starts with a dot as translate-toolkit does', () => {
    expect(canonicalFtl(ftl('files-drop = .mid-Dateien hier ablegen'))).toBe(ftl('files-drop = { "." }mid-Dateien hier ablegen'));
  });
});
