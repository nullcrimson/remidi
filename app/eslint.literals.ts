import type { Linter } from 'eslint';
import i18next from 'eslint-plugin-i18next';

const literalStrings = {
  mode: 'jsx-only',
  'should-validate-template': true,
  'jsx-attributes': { include: ['^aria-label$', '^title$', '^placeholder$', '^alt$', '^label$', '^heading$', '^hint$', '^tip$', '^tipTitle$', '^ariaLabel$', '^reason$', '^content$'] },
  words: { exclude: ['[^A-Za-z]*', 'Drumverter', 'MIDI', '\\.mid'] },
};

/** The lint block that keeps literal UI text out of the app's code: `eslint.config.js` and its test use it. */
export const literalStringRule: Linter.Config = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { i18next },
  rules: { 'i18next/no-literal-string': ['error', literalStrings] },
};
