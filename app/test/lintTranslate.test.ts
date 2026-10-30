import { translateSafeText } from '../eslint.translate.ts';
import { componentRules, LINT_TIMEOUT_MS, ruleIds } from './lintRule';

const lint = (code: string) => ruleIds(translateSafeText, `declare function t(message: { id: string }): string;
${code}`);

const OWN_ELEMENT = 'translate-safe/text-in-own-element';

describe('the translate-safe text lint rules', { timeout: LINT_TIMEOUT_MS }, () => {
  it('applies to every app component', async () => {
    expect(await componentRules()).toMatchObject({
      'react-google-translate/no-conditional-text-nodes-with-siblings': [2],
      'react-google-translate/no-return-text-nodes': [2],
      [OWN_ELEMENT]: [2],
    });
  });

  it('rejects conditional text beside other children', async () => {
    expect(await lint("export function X({ a }: { a: boolean }) {\n  return <p>{a && t({ id: 'close' })}<b /></p>;\n}\n"))
      .toContain('react-google-translate/no-conditional-text-nodes-with-siblings');
  });

  it('allows conditional text in its own element', async () => {
    expect(await lint("export function X({ a }: { a: boolean }) {\n  return <p>{a && <span>{t({ id: 'close' })}</span>}<b /></p>;\n}\n")).toEqual([]);
  });

  it('rejects text that switches to other children, as the report headline did', async () => {
    expect(await lint("export function X({ a }: { a: boolean }) {\n  if (a) return <p><span>{t({ id: 'x' })}</span>{' '}{t({ id: 'y' })}</p>;\n  return <p>{t({ id: 'z' })}</p>;\n}\n"))
      .toContain(OWN_ELEMENT);
  });

  it('rejects message parts returned beside elements, as the rich message did', async () => {
    expect(await lint("export function X({ parts }: { parts: Part[] }) {\n  return parts.map((part, i) => <Fragment key={i}>{'slot' in part ? <b /> : part.text}</Fragment>);\n}\n"))
      .toContain(OWN_ELEMENT);
  });

  it('rejects a conditional separator beside an element, as the edited chip did', async () => {
    expect(await lint("export function X({ name }: { name?: string }) {\n  return <button>{name && <><span>{name}</span>{' · '}</>}<span>{t({ id: 'y' })}</span></button>;\n}\n"))
      .toContain(OWN_ELEMENT);
  });

  it('rejects changing text beside an element, as the editor filter chips did', async () => {
    expect(await lint('export function X({ label }: { label: string }) {\n  return <label><input type="radio" />{label}</label>;\n}\n'))
      .toContain(OWN_ELEMENT);
  });

  it('allows changing text alone in an element', async () => {
    expect(await lint("export function X({ n }: { n: number }) {\n  return <p><b>{t({ id: 'x' })}</b><span>{n}</span></p>;\n}\n")).toEqual([]);
  });

  it('allows text alone in a component, which decides where it goes', async () => {
    expect(await lint("export function X() {\n  return <Tip>{t({ id: 'x' })}</Tip>;\n}\n")).toEqual([]);
  });

  it('rejects text alone in a fragment', async () => {
    expect(await lint("export function X({ on }: { on: boolean }) {\n  return <p>{on && <>{t({ id: 'x' })}</>}</p>;\n}\n")).toContain(OWN_ELEMENT);
  });

  it('rejects text typed through a type parameter', async () => {
    expect(await lint('export function X<T extends string>({ s }: { s: T }) {\n  return <p>{s}<b /></p>;\n}\n')).toContain(OWN_ELEMENT);
  });

  it('rejects branded text', async () => {
    expect(await lint("type Name = string & { brand: 'name' };\nexport function X({ s }: { s: Name }) {\n  return <p>{s}<b /></p>;\n}\n")).toContain(OWN_ELEMENT);
  });

  it('rejects a list of texts', async () => {
    expect(await lint('export function X({ s }: { s: { n: string }[] }) {\n  return <p>{s.map((x) => x.n)}<b /></p>;\n}\n')).toContain(OWN_ELEMENT);
  });

  it('allows a list of elements', async () => {
    expect(await lint('export function X({ s }: { s: string[] }) {\n  return <ul>{s.map((x) => <li key={x}>{x}</li>)}<li /></ul>;\n}\n')).toEqual([]);
  });

  it('rejects a lone list of texts', async () => {
    expect(await lint('export function X({ s }: { s: string[] }) {\n  return <p>{s}</p>;\n}\n')).toContain(OWN_ELEMENT);
  });

  it('rejects a lone mapped list of texts', async () => {
    expect(await lint('export function X({ s }: { s: { n: string }[] }) {\n  return <p>{s.map((x) => x.n)}</p>;\n}\n')).toContain(OWN_ELEMENT);
  });

  it('allows branded text alone in an element', async () => {
    expect(await lint("type Name = string & { brand: 'name' };\nexport function X({ s }: { s: Name }) {\n  return <p>{s}</p>;\n}\n")).toEqual([]);
  });

  it('allows a lone list of elements', async () => {
    expect(await lint('export function X({ s }: { s: string[] }) {\n  return <ul>{s.map((x) => <li key={x}>{x}</li>)}</ul>;\n}\n')).toEqual([]);
  });

  it('rejects a component that returns text', async () => {
    expect(await lint("export function X() {\n  return t({ id: 'x' });\n}\n")).toContain(OWN_ELEMENT);
  });

  it('rejects an arrow component that returns text', async () => {
    expect(await lint('export const X = ({ s }: { s: string }) => s;\n')).toContain(OWN_ELEMENT);
  });

  it('allows a helper that returns text', async () => {
    expect(await lint("export function label() {\n  return t({ id: 'x' });\n}\n")).toEqual([]);
  });
});
