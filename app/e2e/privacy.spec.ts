import { ANALYTICS, expect, test } from './fixtures';

const SYSTEM_FONTS = /^\/(ja|zh|ko)\//;
const PAGES = ['/', '/engines/', '/engines/ezdrummer/', '/convert/ggd-invasion-to-ezdrummer/', '/faq/', '/pl/', '/pl/faq/', '/pl/engines/', '/pl/convert/ggd-invasion-to-ezdrummer/', '/de/', '/ja/', '/ru/faq/', '/zh/engines/', '/ko/convert/ggd-invasion-to-ezdrummer/'];

for (const path of PAGES) {
  test(`${path} sets the policy, loads fonts from the site and asks only for the analytics scripts`, async ({ page, baseURL }) => {
    const analytics: string[] = [];
    const fonts: string[] = [];
    page.on('request', (r) => {
      if (ANALYTICS.test(r.url())) analytics.push(r.url());
      if (r.resourceType() === 'font') fonts.push(r.url());
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const policy = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(policy).toHaveAttribute('content', /default-src 'self'.*font-src 'self'/);
    expect(analytics.sort()).toEqual([
      'https://cloud.umami.is/script.js',
      'https://static.cloudflareinsights.com/beacon.min.js',
    ]);
    for (const font of fonts) expect(new URL(font).origin).toBe(new URL(baseURL!).origin);
    if (!SYSTEM_FONTS.test(path)) {
      expect(fonts.length).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk Variable"'))).toBe(true);
    }
  });
}

test('a Russian page draws its headings with Plex Sans Cyrillic', async ({ page }) => {
  await page.goto('/ru/faq/');
  await page.evaluate(() => document.fonts.ready);
  const cyrillicPlex = await page.evaluate(() => [...document.fonts].some(
    (f) => f.family.includes('IBM Plex Sans') && /U\+0?400-0?45F/i.test(f.unicodeRange) && f.status === 'loaded',
  ));
  expect(cyrillicPlex).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).fontFamily)).toContain('IBM Plex Sans Variable');
});

test('English pages load no Cyrillic or CJK font files', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'font') fonts.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.goto('/faq/');
  await page.waitForLoadState('networkidle');
  expect(fonts.filter((f) => /cyrillic|greek|vietnamese/.test(f))).toEqual([]);
});
