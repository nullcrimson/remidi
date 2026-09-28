import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://drumverter.com';
const KEY = 'b70482caafc9bdd6b2cc45b7fd07ddae';
const HASHES = 'page-hashes.json';

type Hashes = Record<string, string>;

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

/** URLs new or changed since `live`; every URL when nothing is live yet. */
export function changedUrls(now: Hashes, live: Hashes | undefined): string[] {
  return Object.keys(now).filter((url) => live?.[url] !== now[url]);
}

export function payload(urls: string[]) {
  return {
    host: new URL(ORIGIN).host,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList: urls,
  };
}

async function liveHashes(): Promise<Hashes | undefined> {
  try {
    const res = await fetch(`${ORIGIN}/${HASHES}`, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as Hashes) : undefined;
  } catch {
    return undefined;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  const urls = sitemapUrls(readFileSync(join(dist, 'sitemap.xml'), 'utf8'));
  const now = hashPages(urls, (file) => readFileSync(join(dist, file), 'utf8'));
  writeFileSync(join(dist, HASHES), JSON.stringify(now));
  const changed = changedUrls(now, await liveHashes());
  console.log(`${changed.length} of ${urls.length} pages new or changed`);
  const output = process.env.GITHUB_OUTPUT;
  if (output && changed.length > 0) {
    appendFileSync(output, `payload=${JSON.stringify(payload(changed))}\n`);
  }
}
