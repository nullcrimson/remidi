import { literalStringRule } from '../eslint.literals.ts';
import { componentRules, LINT_TIMEOUT_MS, ruleIds as lint } from './lintRule';

const ruleIds = (code: string) => lint(literalStringRule, code);

describe('the literal-string lint rule', { timeout: LINT_TIMEOUT_MS }, () => {
  it('applies to every app component', async () => {
    expect(await componentRules()).toMatchObject({ 'i18next/no-literal-string': [2, expect.anything()] });
  });

  it('rejects a literal UI string in a component', async () => {
    expect(await ruleIds('export function X() {\n  return <p>Hello</p>;\n}\n')).toContain('i18next/no-literal-string');
  });

  it('rejects literal text inside a tooltip\'s content', async () => {
    expect(await ruleIds('export function X() {\n  return <Tip content={<b>Hello there</b>} />;\n}\n')).toContain('i18next/no-literal-string');
  });

  it('rejects a literal custom text prop', async () => {
    expect(await ruleIds('export function X() {\n  return <Tip tip="Some tip" />;\n}\n')).toContain('i18next/no-literal-string');
  });

  it('allows symbols, the brand and translated text', async () => {
    expect(await ruleIds("import { t } from '../i18n';\n\nexport function X() {\n  return <p><b>Drumverter</b> × {t({ id: 'close' })}</p>;\n}\n")).toEqual([]);
  });
});
