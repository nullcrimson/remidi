import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = 'b70482caafc9bdd6b2cc45b7fd07ddae';
const PUBLISHED = 'page-hashes.json';
const LIVE_TIMEOUT_MS = 10_000;
const LOC = /<loc>([^<]+)<\/loc>/g;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Day = string & { readonly day: unique symbol };
type Hashes = Record<string, string>;
type Page = { hash: string; lastmod: Day };
type Pages = Record<string, Page>;
type LivePage = { hash: string; lastmod?: Day };
type LivePages = Record<string, LivePage>;

/** `text` as a calendar day, `YYYY-MM-DD`; anything else is refused. */
export function parseDay(text: string): Day {
  if (!DAY.test(text)) throw new Error(`'${text}' is not a day (YYYY-MM-DD)`);
  return text as Day;
}

export function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(LOC)].map((m) => m[1]);
}

/** The site's origin: the one every sitemap URL has. A sitemap with none, or with two, is refused. */
export function siteOrigin(urls: string[]): string {
  const origins = [...new Set(urls.map((url) => new URL(url).origin))];
  if (origins.length !== 1) throw new Error(`the sitemap names ${origins.length} origins, not one`);
  return origins[0];
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

function parseLivePage(url: string, entry: unknown): LivePage {
  if (typeof entry === 'string') return { hash: entry };
  if (
    typeof entry === 'object' && entry !== null
    && 'hash' in entry && typeof entry.hash === 'string'
    && 'lastmod' in entry && typeof entry.lastmod === 'string'
  ) {
    return { hash: entry.hash, lastmod: parseDay(entry.lastmod) };
  }
  throw new Error(`${PUBLISHED}: the entry for ${url} is neither a hash nor { hash, lastmod }`);
}

/**
 * The published file as pages: an entry is `{ hash, lastmod }`, or a bare hash from before
 * pages carried dates. Anything else is refused.
 */
export function parseLive(json: unknown): LivePages {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error(`${PUBLISHED} is not an object of pages`);
  }
  return Object.fromEntries(Object.entries(json).map(([url, entry]) => [url, parseLivePage(url, entry)]));
}

/** URLs new or changed since `live`; every URL when nothing is live yet. */
export function changedUrls(now: Hashes, live: LivePages | undefined): string[] {
  return Object.keys(now).filter((url) => live?.[url]?.hash !== now[url]);
}

/** Each page with the day its content last changed: the live date if unchanged, else `today`. */
export function datePages(now: Hashes, live: LivePages | undefined, today: Day): Pages {
  return Object.fromEntries(
    Object.entries(now).map(([url, hash]) => {
      const was = live?.[url];
      return [url, { hash, lastmod: was?.hash === hash && was.lastmod ? was.lastmod : today }];
    }),
  );
}

export function withLastmod(xml: string, pages: Pages): string {
  return xml.replace(LOC, (loc, url: string) =>
    pages[url] ? `${loc}<lastmod>${pages[url].lastmod}</lastmod>` : loc,
  );
}

export function payload(origin: string, urls: string[]) {
  return {
    host: new URL(origin).host,
    key: KEY,
    keyLocation: `${origin}/${KEY}.txt`,
    urlList: urls,
  };
}

async function livePages(origin: string): Promise<LivePages | undefined> {
  const res = await fetch(`${origin}/${PUBLISHED}`, { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${PUBLISHED}: HTTP ${res.status}`);
  return parseLive(await res.json());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  const sitemap = join(dist, 'sitemap.xml');
  const xml = readFileSync(sitemap, 'utf8');
  const urls = sitemapUrls(xml);
  const now = hashPages(urls, (file) => readFileSync(join(dist, file), 'utf8'));
  const origin = siteOrigin(urls);
  const live = await livePages(origin);
  const pages = datePages(now, live, parseDay(new Date().toISOString().slice(0, 10)));
  writeFileSync(sitemap, withLastmod(xml, pages));
  writeFileSync(join(dist, PUBLISHED), JSON.stringify(pages));
  const changed = changedUrls(now, live);
  console.log(`${changed.length} of ${urls.length} pages new or changed`);
  const output = process.env.GITHUB_OUTPUT;
  if (output && changed.length > 0) {
    writeFileSync(fileURLToPath(new URL('../indexnow.json', import.meta.url)), JSON.stringify(payload(origin, changed)));
    appendFileSync(output, `changed=${changed.length}\n`);
  }
}
