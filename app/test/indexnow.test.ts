import {
  changedUrls,
  datePages,
  hashPages,
  pageFile,
  parseDay,
  parseLive,
  payload,
  sitemapUrls,
  withLastmod,
} from '../scripts/indexnow';

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
    expect(changedUrls(hashPages(urls, (f) => files[f]), parseLive(before))).toEqual(['https://drumverter.com/faq/']);
  });

  it('submits new pages, and every page when nothing is live yet', () => {
    const now = { 'https://drumverter.com/': 'a', 'https://drumverter.com/new/': 'b' };
    expect(changedUrls(now, { 'https://drumverter.com/': { hash: 'a' } })).toEqual(['https://drumverter.com/new/']);
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

describe('sitemap lastmod', () => {
  const home = 'https://drumverter.com/';
  const faq = 'https://drumverter.com/faq/';
  const added = 'https://drumverter.com/new/';
  const sep1 = parseDay('2026-09-01');
  const sep2 = parseDay('2026-09-02');
  const today = parseDay('2026-09-28');

  it('keeps the live date of an unchanged page', () => {
    const live = { [home]: { hash: 'a', lastmod: sep1 } };
    expect(datePages({ [home]: 'a' }, live, today)).toEqual({ [home]: { hash: 'a', lastmod: '2026-09-01' } });
  });

  it('dates a changed page today', () => {
    const live = { [faq]: { hash: 'b', lastmod: sep2 } };
    expect(datePages({ [faq]: 'B' }, live, today)).toEqual({ [faq]: { hash: 'B', lastmod: '2026-09-28' } });
  });

  it('dates a new page today', () => {
    const live = { [home]: { hash: 'a', lastmod: sep1 } };
    expect(datePages({ [added]: 'c' }, live, today)).toEqual({ [added]: { hash: 'c', lastmod: '2026-09-28' } });
  });

  it('dates an unchanged page today when its live entry has no date', () => {
    expect(datePages({ [home]: 'a' }, { [home]: { hash: 'a' } }, today)).toEqual({
      [home]: { hash: 'a', lastmod: '2026-09-28' },
    });
  });

  it('reads a published entry with its date', () => {
    expect(parseLive({ [home]: { hash: 'a', lastmod: '2026-09-01' } })).toEqual({
      [home]: { hash: 'a', lastmod: '2026-09-01' },
    });
  });

  it('reads a bare hash from before pages carried dates', () => {
    expect(parseLive({ [home]: 'a' })).toEqual({ [home]: { hash: 'a' } });
  });

  it('refuses a published date that is not a day', () => {
    expect(() => parseLive({ [home]: { hash: 'a', lastmod: '</lastmod><loc>x' } })).toThrow(
      "'</lastmod><loc>x' is not a day (YYYY-MM-DD)",
    );
  });

  it('refuses a published entry without a hash', () => {
    expect(() => parseLive({ [home]: { lastmod: '2026-09-01' } })).toThrow(
      `page-hashes.json: the entry for ${home} is neither a hash nor { hash, lastmod }`,
    );
  });

  it('refuses a published entry without a date', () => {
    expect(() => parseLive({ [home]: { hash: 'a' } })).toThrow(
      `page-hashes.json: the entry for ${home} is neither a hash nor { hash, lastmod }`,
    );
  });

  it('refuses a published entry that is neither text nor an object', () => {
    expect(() => parseLive({ [faq]: 7 })).toThrow(
      `page-hashes.json: the entry for ${faq} is neither a hash nor { hash, lastmod }`,
    );
  });

  it('refuses a published file that is not an object of pages', () => {
    expect(() => parseLive(['a'])).toThrow('page-hashes.json is not an object of pages');
  });

  it('finds changed pages against a live file with dates', () => {
    const live = { [home]: { hash: 'a', lastmod: sep1 } };
    expect(changedUrls({ [home]: 'a', [added]: 'c' }, live)).toEqual([added]);
  });

  it('dates every page today when nothing is live yet', () => {
    expect(datePages({ [home]: 'a' }, undefined, today)).toEqual({ [home]: { hash: 'a', lastmod: '2026-09-28' } });
  });

  it('adds a lastmod after the loc of each dated URL only', () => {
    const xml = `<urlset>\n  <url><loc>${home}</loc></url>\n  <url><loc>${faq}</loc></url>\n</urlset>\n`;
    expect(withLastmod(xml, { [home]: { hash: 'a', lastmod: sep1 } })).toBe(
      `<urlset>\n  <url><loc>${home}</loc><lastmod>2026-09-01</lastmod></url>\n  <url><loc>${faq}</loc></url>\n</urlset>\n`,
    );
  });

  it('leaves the URL list readable after dates are added', () => {
    const xml = `<urlset><url><loc>${home}</loc></url><url><loc>${faq}</loc></url></urlset>`;
    const dated = withLastmod(xml, { [home]: { hash: 'a', lastmod: sep1 }, [faq]: { hash: 'b', lastmod: sep2 } });
    expect(sitemapUrls(dated)).toEqual([home, faq]);
  });
});
