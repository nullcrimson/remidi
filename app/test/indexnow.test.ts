import { changedUrls, hashPages, pageFile, payload, sitemapUrls } from '../scripts/indexnow';

const page = (css: string, body: string) =>
  `<link rel="stylesheet" href="/assets/index-${css}.css"><script src="/assets/index-${css}.js"></script>${body}`;

describe('IndexNow for changed pages only', () => {
  it('reads the sitemap and finds each URL page on disk', () => {
    const xml = '<urlset><url><loc>https://drumverter.com/</loc></url><url><loc>https://drumverter.com/faq/</loc></url></urlset>';
    expect(sitemapUrls(xml)).toEqual(['https://drumverter.com/', 'https://drumverter.com/faq/']);
    expect(pageFile('https://drumverter.com/')).toBe('index.html');
    expect(pageFile('https://drumverter.com/engines/bfd3/')).toBe('engines/bfd3/index.html');
  });

  it('ignores rebuilt asset names but not content', () => {
    const files: Record<string, string> = {
      'index.html': page('A1', 'home'),
      'faq/index.html': page('A1', 'faq'),
    };
    const urls = ['https://drumverter.com/', 'https://drumverter.com/faq/'];
    const before = hashPages(urls, (f) => files[f]);

    files['index.html'] = page('B2', 'home');
    files['faq/index.html'] = page('B2', 'faq, updated');
    expect(changedUrls(hashPages(urls, (f) => files[f]), before)).toEqual(['https://drumverter.com/faq/']);
  });

  it('submits new pages, and every page when nothing is live yet', () => {
    const now = { 'https://drumverter.com/': 'a', 'https://drumverter.com/new/': 'b' };
    expect(changedUrls(now, { 'https://drumverter.com/': 'a' })).toEqual(['https://drumverter.com/new/']);
    expect(changedUrls(now, undefined)).toEqual(Object.keys(now));
  });

  it('builds the IndexNow request body', () => {
    expect(payload(['https://drumverter.com/faq/'])).toEqual({
      host: 'drumverter.com',
      key: 'b70482caafc9bdd6b2cc45b7fd07ddae',
      keyLocation: 'https://drumverter.com/b70482caafc9bdd6b2cc45b7fd07ddae.txt',
      urlList: ['https://drumverter.com/faq/'],
    });
  });
});
