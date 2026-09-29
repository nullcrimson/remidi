import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import i18next from 'eslint-plugin-i18next';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/wasm', 'src/generated', 'playwright-report', 'test-results'] },
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    jsx: true,
    commaDangle: 'always-multiline',
    arrowParens: true,
    braceStyle: '1tbs',
    blockSpacing: true,
    quoteProps: 'as-needed',
  }),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      betterTailwind.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: { i18next },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/index.css' },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: ['mr-scroll'] }],
      'no-restricted-properties': ['error', { object: 'location', property: 'pathname', message: 'Read the locale from src/locale.ts.' }],
      'i18next/no-literal-string': ['error', {
        mode: 'jsx-only',
        'should-validate-template': true,
        'jsx-attributes': { include: ['^aria-label$', '^title$', '^placeholder$', '^alt$', '^label$', '^heading$', '^hint$', '^tip$', '^tipTitle$', '^ariaLabel$', '^reason$', '^content$'] },
        words: { exclude: ['[^A-Za-z]*', 'Drumverter', 'MIDI', '\\.mid'] },
      }],
    },
  },
  {
    files: ['src/locale.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'scripts/**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/quotes': [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: 'always' },
      ],
      '@stylistic/jsx-one-expression-per-line': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
);
