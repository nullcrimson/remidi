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
