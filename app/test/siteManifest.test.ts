import { describe, expect, it } from 'vitest';
import { pageScriptOf, siteManifest, statsAttrs, stylesheetOf, type EmittedChunk } from '../scripts/siteManifest';

const FILES = ['index.html', 'assets/index-AbC123.js', 'assets/index-XyZ789.css', 'assets/site-pages-Lo1.js', 'assets/ibm-plex-sans-latin-wght-normal-Pl1.woff2'];

const chunk = (fileName: string, imports: string[] = [], isEntry = false): EmittedChunk => ({
  fileName,
  name: fileName.replace(/^assets\/|-[^-]+\.js$/g, ''),
  isEntry,
  imports,
});

const CHUNKS = [
  chunk('assets/index-AbC123.js', ['assets/storage-S1.js'], true),
  chunk('assets/site-pages-Lo1.js', ['assets/language-L1.js'], true),
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
    expect(pageScriptOf(CHUNKS, 'site-pages').src).toBe('/assets/site-pages-Lo1.js');
  });

  it('preloads the chunks the locale entry imports, through other chunks too, each once', () => {
    expect(pageScriptOf(CHUNKS, 'site-pages').preload).toEqual(['/assets/language-L1.js', '/assets/storage-S1.js']);
  });

  it('refuses a bundle without the locale entry', () => {
    expect(() => pageScriptOf(CHUNKS.slice(0, 1), 'site-pages')).toThrow(/entry chunk named site-pages/);
  });

  it('refuses an import the bundle does not emit', () => {
    const chunks = [chunk('assets/site-pages-Lo1.js', ['https://cdn.example/external.js'], true)];
    expect(() => pageScriptOf(chunks, 'site-pages')).toThrow(/https:\/\/cdn\.example\/external\.js.*emitted chunk/);
  });

  it('carries the policy text unescaped and the analytics scripts as given', () => {
    const analytics = [{ src: 'https://a.example/s.js', attrs: { 'data-x': '{"k": "v"}' } }];
    expect(siteManifest(FILES, CHUNKS, 'site-pages', `default-src 'self'`, analytics)).toEqual({
      stylesheet: '/assets/index-XyZ789.css',
      contentSecurityPolicy: `default-src 'self'`,
      analytics,
      pageScript: { src: '/assets/site-pages-Lo1.js', preload: ['/assets/language-L1.js', '/assets/storage-S1.js'] },
      fontPreloads: ['/assets/ibm-plex-sans-latin-wght-normal-Pl1.woff2'],
    });
  });

  it('preloads the latin text fonts and no other subset or single weight', () => {
    const files = [
      'assets/index-XyZ789.css',
      'assets/space-grotesk-latin-wght-normal-Gh4.woff2',
      'assets/ibm-plex-sans-latin-wght-normal-Ab1.woff2',
      'assets/ibm-plex-sans-latin-ext-wght-normal-Cd2.woff2',
      'assets/ibm-plex-mono-latin-400-normal-Ef3.woff2',
    ];
    expect(siteManifest(files, CHUNKS, 'site-pages', `default-src 'self'`, []).fontPreloads).toEqual([
      '/assets/ibm-plex-sans-latin-wght-normal-Ab1.woff2',
      '/assets/space-grotesk-latin-wght-normal-Gh4.woff2',
    ]);
  });

  it('refuses a bundle without latin text fonts', () => {
    const files = ['assets/index-XyZ789.css', 'assets/ibm-plex-sans-latin-ext-wght-normal-Cd2.woff2', 'assets/ibm-plex-mono-latin-400-normal-Ef3.woff2'];
    expect(() => siteManifest(files, CHUNKS, 'site-pages', `default-src 'self'`, [])).toThrow();
  });
});

describe('statsAttrs', () => {
  it('turns on web vitals and tags no build without a commit', () => {
    expect(statsAttrs(undefined)).toEqual({ 'data-performance': 'true' });
    expect(statsAttrs('')).toEqual({ 'data-performance': 'true' });
  });

  it('tags the events with the short commit of the build', () => {
    expect(statsAttrs('abcdef1234')).toEqual({ 'data-performance': 'true', 'data-tag': 'abcdef1' });
  });
});
