import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';
import { content, plainText, sectionHref } from '../src/content/site';

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

  it('describes only the app on the home page; FAQ and guide schema live on their own pages', () => {
    expect(indexHtml.match(/application\/ld\+json/g)).toHaveLength(1);
    expect(indexHtml).toContain('"SoftwareApplication"');
    expect(indexHtml).not.toContain('FAQPage');
    expect(indexHtml).not.toContain('"HowTo"');
  });
});
