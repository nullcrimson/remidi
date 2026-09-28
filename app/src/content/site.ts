import raw from './pages.json';

export type Inline = string | { text: string; href: string };
export interface Step {
  title: string;
  body: string;
}
export interface Qa {
  q: string;
  a: string;
}
export type Block
  = | { p: Inline[] }
    | { steps: Step[] }
    | { list: Inline[][] }
    | { faq: Qa[] }
    | { h: string }
    | { note: Step };

export interface Section {
  key: string;
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  blocks: Block[];
}

export interface Link {
  label: string;
  href: string;
}

export interface Content {
  nav: Link[];
  footer: (string | Link)[];
  trademark: string;
  sections: Section[];
}

export const content: Content = raw as Content;

export function sectionHref(s: Section): string {
  return `/${s.slug}/`;
}

export function plainText(inline: Inline[]): string {
  return inline.map((i) => (typeof i === 'string' ? i : i.text)).join('');
}

function blocksOf(c: Content, key: string): Block[] {
  return c.sections.find((s) => s.key === key)?.blocks ?? [];
}

export function faqSchema(c: Content) {
  const qas = blocksOf(c, 'faq').flatMap((b) => ('faq' in b ? b.faq : []));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qas.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  };
}

export function howToSchema(c: Content) {
  const guide = c.sections.find((s) => s.key === 'guide');
  const steps = blocksOf(c, 'guide').flatMap((b) => ('steps' in b ? b.steps : []));
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide?.heading ?? '',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title.replace(/\.$/, ''),
      text: s.body,
    })),
  };
}

export function injectJsonLd(html: string, c: Content): string {
  const scripts = [howToSchema(c), faqSchema(c)]
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
  return html.replace('</head>', `${scripts}\n</head>`);
}
