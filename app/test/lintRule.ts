import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';

const COMPONENT_FILE = 'src/components/X.tsx';

/** How long a lint test may take: typed linting starts a TypeScript program, which takes seconds in a busy test run. */
export const LINT_TIMEOUT_MS = 60_000;

const linters = new Map<Linter.Config, ESLint>();

function linterFor(block: Linter.Config) {
  const known = linters.get(block);
  if (known) return known;
  const linter = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: [block, {
      files: ['**/*.tsx'],
      languageOptions: { parser: tseslint.parser, parserOptions: { projectService: { allowDefaultProject: [COMPONENT_FILE] } } },
    }],
  });
  linters.set(block, linter);
  return linter;
}

/** The rule ids `block` reports on `code`, linted as an app component with the TS parser. */
export async function ruleIds(block: Linter.Config, code: string) {
  const [r] = await linterFor(block).lintText(code, { filePath: COMPONENT_FILE });
  return r.messages.map((m) => m.ruleId);
}

/** The rules the project lint config applies to an app component. */
export async function componentRules(): Promise<Record<string, unknown>> {
  const config = await new ESLint({ cwd: process.cwd() }).calculateConfigForFile(COMPONENT_FILE);
  return config.rules;
}
