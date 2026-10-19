import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { literalStringRule } from './eslint.literals.ts';

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
    settings: {
      'better-tailwindcss': { entryPoint: 'src/index.css' },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: ['mr-scroll'] }],
      'better-tailwindcss/enforce-canonical-classes': process.env.CI ? 'warn' : 'off',
      'no-restricted-properties': ['error', { object: 'location', property: 'pathname', message: 'Read the locale from src/locale/locale.ts.' }],
    },
  },
  literalStringRule,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/core/storage.ts'],
    rules: {
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'Browser storage is reached only through src/core/storage.ts.' }],
      'no-restricted-syntax': ['error', {
        selector: 'MemberExpression[property.name="localStorage"]',
        message: 'Browser storage is reached only through src/core/storage.ts.',
      }],
    },
  },
  {
    files: ['src/locale/locale.ts'],
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
