import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle';
import { FluentParser, FluentSerializer, Transformer, type Resource, type TextElement } from '@fluent/syntax';
import { pseudoLocalizeString } from 'pseudo-localization';
import { readFileSync } from 'node:fs';

const ftl = (code: string) => readFileSync(new URL(`../../locales/${code}/app.ftl`, import.meta.url), 'utf8');

class Pseudo extends Transformer {
  visitTextElement(node: TextElement) {
    node.value = `[${pseudoLocalizeString(node.value, { strategy: 'accented' })}]`;
    return node;
  }
}

/** English messages pseudo-localized: accented, longer, bracketed so clipping shows at either end. */
export function pseudoFtl(): string {
  const resource = new FluentParser({ withSpans: false }).parse(ftl('en'));
  return new FluentSerializer().serialize(new Pseudo().visit(resource) as Resource);
}

/** The pseudo-locale: English messages with every text widened and accented. */
export const PSEUDO = 'en-XA';

/** Formats a message of `code` (or the pseudo-locale), for accessible names in tests. */
export function messages(code: string) {
  const bundle = new FluentBundle(code === PSEUDO ? 'en' : code, { useIsolating: false });
  bundle.addResource(new FluentResource(code === PSEUDO ? pseudoFtl() : ftl(code)));
  return (id: string, args?: Record<string, FluentVariable>) => bundle.formatPattern(bundle.getMessage(id)!.value!, args);
}

/** What an argument of a message pattern stands for: any number, or any text. */
type Wildcard = 'number' | 'text';

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WILDCARD: Record<Wildcard, string> = { number: '\\d+', text: '.+' };

/**
 * The whole English text of message `id` as a pattern, each argument of `args` standing for
 * what it is given as; a selector on such an argument takes the message's default variant.
 */
export function englishPattern(id: string, args: Record<string, Wildcard>): RegExp {
  const token = (name: string) => `@${name}@`;
  const text = messages('en')(id, Object.fromEntries(Object.keys(args).map((name) => [name, token(name)])));
  const pattern = Object.entries(args).reduce((source, [name, wildcard]) => source.replaceAll(token(name), WILDCARD[wildcard]), escaped(text));
  return new RegExp(`^${pattern}$`);
}
