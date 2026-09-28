import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { content, faqSchema, howToSchema, injectJsonLd, plainText, sectionHref } from '../src/content/site';

describe('site content', () => {
  it('gives every section a unique key and slug, and the footer names real sections', () => {
    const keys = content.sections.map((s) => s.key);
    const slugs = content.sections.map((s) => s.slug);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of content.footer) {
      if (typeof item === 'string') expect(keys).toContain(item);
    }
    expect(sectionHref(content.sections[0])).toBe('/how-it-works/');
  });

  it('keeps descriptions within 155 characters', () => {
    for (const s of content.sections) expect(s.description.length).toBeLessThanOrEqual(155);
  });

  it('flattens inline links to their text', () => {
    expect(plainText(['See ', { text: 'maps', href: '/engines/' }, '.'])).toBe('See maps.');
  });

  it('builds FAQPage and HowTo schema from the same text the modals show', () => {
    const faq = faqSchema(content);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Is Drumverter free?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. It runs entirely in your browser, with no account and no cost.' },
    });
    const howTo = howToSchema(content);
    expect(howTo.name).toBe('How to convert drum MIDI');
    expect(howTo.step.map((s) => s.name)).toEqual([
      'Add your files',
      'Pick source and target',
      'Fine-tune (optional)',
      'Download',
    ]);
  });

  it('injects the schema into the page head and the page carries no hand-written copy', () => {
    expect(indexHtml).not.toContain('FAQPage');
    expect(indexHtml).not.toContain('"HowTo"');
    const out = injectJsonLd('<head><title>x</title></head>', content);
    expect(out.match(/application\/ld\+json/g)).toHaveLength(2);
    expect(out.indexOf('FAQPage')).toBeLessThan(out.indexOf('</head>'));
    expect(out).toContain('"Is Drumverter free?"');
  });

  it('cannot close the schema script early', () => {
    const tricky = {
      ...content,
      sections: [{ ...content.sections[1], blocks: [{ faq: [{ q: '</script><b>', a: 'x' }] }] }],
    };
    const out = injectJsonLd('<head></head>', tricky);
    expect(out).not.toContain('</script><b>');
    expect(out.match(/<\/script>/g)).toHaveLength(2);
  });
});
