import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });

const ruleIds = async (code: string) => {
  const [r] = await eslint.lintText(code, { filePath: 'src/components/X.tsx' });
  return r.messages.map((m) => m.ruleId);
};

describe('the literal-string lint rule', { timeout: 30_000 }, () => {
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
