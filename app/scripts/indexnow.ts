import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://drumverter.com';
const KEY = 'b70482caafc9bdd6b2cc45b7fd07ddae';
const HASHES = 'page-hashes.json';

type Hashes = Record<string, string>;
type Page = { hash: string; lastmod: string };
type Pages = Record<string, Page>;
type UndatedHash = string;
type PublishedPages = Record<string, Page | UndatedHash>;

export function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export function pageFile(url: string): string {
  return `${new URL(url).pathname.slice(1)}index.html`;
}

/** Each page's content hash, blind to asset file names that change on every rebuild. */
export function hashPages(urls: string[], read: (file: string) => string): Hashes {
  return Object.fromEntries(
    urls.map((url) => {
      const html = read(pageFile(url)).replace(/\/assets\/[^"'\s)]+/g, '/assets/');
      return [url, createHash('sha256').update(html).digest('hex')];
    }),
  );
}

function livePage(live: PublishedPages | undefined, url: string): Partial<Page> | undefined {
  const entry = live?.[url];
  return typeof entry === 'string' ? { hash: entry } : entry;
}

/** URLs new or changed since `live`; every URL when nothing is live yet. */
export function changedUrls(now: Hashes, live: PublishedPages | undefined): string[] {
  return Object.keys(now).filter((url) => livePage(live, url)?.hash !== now[url]);
}

/** Each page with the day its content last changed: the live date if unchanged, else `today`. */
export function datePages(now: Hashes, live: PublishedPages | undefined, today: string): Pages {
  return Object.fromEntries(
    Object.entries(now).map(([url, hash]) => {
      const was = livePage(live, url);
      return [url, { hash, lastmod: was?.hash === hash && was.lastmod ? was.lastmod : today }];
    }),
  );
}

export function withLastmod(xml: string, pages: Pages): string {
  return xml.replace(/<loc>([^<]+)<\/loc>/g, (loc, url: string) =>
    pages[url] ? `${loc}<lastmod>${pages[url].lastmod}</lastmod>` : loc,
  );
}

export function payload(urls: string[]) {
  return {
    host: new URL(ORIGIN).host,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList: urls,
  };
}

async function liveHashes(): Promise<PublishedPages | undefined> {
  try {
    const res = await fetch(`${ORIGIN}/${HASHES}`, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as PublishedPages) : undefined;
  } catch {
    return undefined;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  const sitemap = join(dist, 'sitemap.xml');
  const xml = readFileSync(sitemap, 'utf8');
  const urls = sitemapUrls(xml);
  const now = hashPages(urls, (file) => readFileSync(join(dist, file), 'utf8'));
  const live = await liveHashes();
  const pages = datePages(now, live, new Date().toISOString().slice(0, 10));
  writeFileSync(sitemap, withLastmod(xml, pages));
  writeFileSync(join(dist, HASHES), JSON.stringify(pages));
  const changed = changedUrls(now, live);
  console.log(`${changed.length} of ${urls.length} pages new or changed`);
  const output = process.env.GITHUB_OUTPUT;
  if (output && changed.length > 0) {
    appendFileSync(output, `payload=${JSON.stringify(payload(changed))}\n`);
  }
}
