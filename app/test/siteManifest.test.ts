import { describe, expect, it } from 'vitest';
import { localeScriptOf, siteManifest, stylesheetOf, type EmittedChunk } from '../scripts/siteManifest';

const FILES = ['index.html', 'assets/index-AbC123.js', 'assets/index-XyZ789.css', 'assets/site-locale-Lo1.js'];

const chunk = (fileName: string, imports: string[] = [], isEntry = false): EmittedChunk => ({
  fileName,
  name: fileName.replace(/^assets\/|-[^-]+\.js$/g, ''),
  isEntry,
  imports,
});

const CHUNKS = [
  chunk('assets/index-AbC123.js', ['assets/storage-S1.js'], true),
  chunk('assets/site-locale-Lo1.js', ['assets/language-L1.js'], true),
  chunk('assets/language-L1.js', ['assets/storage-S1.js']),
  chunk('assets/storage-S1.js'),
];

describe('site manifest', () => {
  it('names the bundle stylesheet by its address', () => {
    expect(stylesheetOf(FILES)).toBe('/assets/index-XyZ789.css');
  });

  it('refuses a bundle without a stylesheet', () => {
    expect(() => stylesheetOf(['assets/index-AbC123.js'])).toThrow(/found 0/);
  });

  it('refuses a bundle with two stylesheets', () => {
    expect(() => stylesheetOf([...FILES, 'assets/other-1.css'])).toThrow(/found 2/);
  });

  it('names the locale entry by its address', () => {
    expect(localeScriptOf(CHUNKS, 'site-locale').src).toBe('/assets/site-locale-Lo1.js');
  });

  it('preloads the chunks the locale entry imports, through other chunks too, each once', () => {
    expect(localeScriptOf(CHUNKS, 'site-locale').preload).toEqual(['/assets/language-L1.js', '/assets/storage-S1.js']);
  });

  it('refuses a bundle without the locale entry', () => {
    expect(() => localeScriptOf(CHUNKS.slice(0, 1), 'site-locale')).toThrow(/entry chunk named site-locale/);
  });

  it('refuses an import the bundle does not emit', () => {
    const chunks = [chunk('assets/site-locale-Lo1.js', ['https://cdn.example/external.js'], true)];
    expect(() => localeScriptOf(chunks, 'site-locale')).toThrow(/https:\/\/cdn\.example\/external\.js.*emitted chunk/);
  });

  it('carries the policy text unescaped and the analytics scripts as given', () => {
    const analytics = [{ src: 'https://a.example/s.js', attrs: { 'data-x': '{"k": "v"}' } }];
    expect(siteManifest(FILES, CHUNKS, 'site-locale', `default-src 'self'`, analytics)).toEqual({
      stylesheet: '/assets/index-XyZ789.css',
      contentSecurityPolicy: `default-src 'self'`,
      analytics,
      localeScript: { src: '/assets/site-locale-Lo1.js', preload: ['/assets/language-L1.js', '/assets/storage-S1.js'] },
    });
  });
});
