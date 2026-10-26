import type { Page } from '@playwright/test';
import { ANALYTICS, expect, test } from './fixtures';

async function requested(page: Page, path: string) {
  const analytics: string[] = [];
  const fonts: string[] = [];
  page.on('request', (r) => {
    if (ANALYTICS.test(r.url())) analytics.push(r.url());
    if (r.resourceType() === 'font') fonts.push(r.url());
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  return { analytics: analytics.sort(), fonts };
}

async function setsThePolicy(page: Page, path: string) {
  await page.goto(path);
  const policy = page.locator('meta[http-equiv="Content-Security-Policy"]');
  await expect(policy).toHaveAttribute('content', /default-src 'self'.*font-src 'self'/);
}

async function asksOnlyForAnalytics(page: Page, path: string) {
  expect((await requested(page, path)).analytics).toEqual([
    'https://cloud.umami.is/script.js',
    'https://static.cloudflareinsights.com/beacon.min.js',
  ]);
}

async function drawsWithSpaceGrotesk(page: Page, path: string) {
  const { fonts } = await requested(page, path);
  expect(fonts.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk Variable"'))).toBe(true);
}

async function textFontsOf(page: Page, path: string) {
  return (await requested(page, path)).fonts.filter((font) => !/\/ibm-plex-mono-latin-/.test(font));
}

test('/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/');
});

test('/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/');
});

test('/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/');
});

test('/engines/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/engines/');
});

test('/engines/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/engines/');
});

test('/engines/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/engines/');
});

test('/engines/ezdrummer/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/engines/ezdrummer/');
});

test('/engines/ezdrummer/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/engines/ezdrummer/');
});

test('/engines/ezdrummer/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/engines/ezdrummer/');
});

test('/convert/ggd-invasion-to-ezdrummer/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/convert/ggd-invasion-to-ezdrummer/');
});

test('/convert/ggd-invasion-to-ezdrummer/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/convert/ggd-invasion-to-ezdrummer/');
});

test('/convert/ggd-invasion-to-ezdrummer/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/convert/ggd-invasion-to-ezdrummer/');
});

test('/faq/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/faq/');
});

test('/faq/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/faq/');
});

test('/faq/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/faq/');
});

test('/pl/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/pl/');
});

test('/pl/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/pl/');
});

test('/pl/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/pl/');
});

test('/pl/faq/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/pl/faq/');
});

test('/pl/faq/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/pl/faq/');
});

test('/pl/faq/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/pl/faq/');
});

test('/pl/engines/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/pl/engines/');
});

test('/pl/engines/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/pl/engines/');
});

test('/pl/engines/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/pl/engines/');
});

test('/pl/convert/ggd-invasion-to-ezdrummer/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/pl/convert/ggd-invasion-to-ezdrummer/');
});

test('/pl/convert/ggd-invasion-to-ezdrummer/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/pl/convert/ggd-invasion-to-ezdrummer/');
});

test('/pl/convert/ggd-invasion-to-ezdrummer/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/pl/convert/ggd-invasion-to-ezdrummer/');
});

test('/de/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/de/');
});

test('/de/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/de/');
});

test('/de/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/de/');
});

test('/ja/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/ja/');
});

test('/ja/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/ja/');
});

test('/ja/ loads no font for its text, which the system draws', async ({ page }) => {
  expect(await textFontsOf(page, '/ja/')).toEqual([]);
});

test('/ru/faq/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/ru/faq/');
});

test('/ru/faq/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/ru/faq/');
});

test('/ru/faq/ draws its text with Space Grotesk', async ({ page }) => {
  await drawsWithSpaceGrotesk(page, '/ru/faq/');
});

test('/zh/engines/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/zh/engines/');
});

test('/zh/engines/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/zh/engines/');
});

test('/zh/engines/ loads no font for its text, which the system draws', async ({ page }) => {
  expect(await textFontsOf(page, '/zh/engines/')).toEqual([]);
});

test('/ko/convert/ggd-invasion-to-ezdrummer/ sets the content security policy', async ({ page }) => {
  await setsThePolicy(page, '/ko/convert/ggd-invasion-to-ezdrummer/');
});

test('/ko/convert/ggd-invasion-to-ezdrummer/ asks no other site for anything but the two analytics scripts', async ({ page }) => {
  await asksOnlyForAnalytics(page, '/ko/convert/ggd-invasion-to-ezdrummer/');
});

test('/ko/convert/ggd-invasion-to-ezdrummer/ loads no font for its text, which the system draws', async ({ page }) => {
  expect(await textFontsOf(page, '/ko/convert/ggd-invasion-to-ezdrummer/')).toEqual([]);
});

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
