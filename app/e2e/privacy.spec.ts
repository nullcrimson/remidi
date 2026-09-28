import { BEACON, expect, test } from './fixtures';

const PAGES = ['/', '/engines/', '/engines/ezdrummer/', '/convert/ggd-invasion-to-ezdrummer/', '/faq/'];

for (const path of PAGES) {
  test(`${path} sets the policy, loads fonts from the site and asks only for the beacon`, async ({ page, baseURL }) => {
    const beacon: string[] = [];
    const fonts: string[] = [];
    page.on('request', (r) => {
      if (BEACON.test(r.url())) beacon.push(r.url());
      if (r.resourceType() === 'font') fonts.push(r.url());
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const policy = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(policy).toHaveAttribute('content', /default-src 'self'.*font-src 'self'/);
    expect(beacon).toEqual(['https://static.cloudflareinsights.com/beacon.min.js']);
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(new URL(font).origin).toBe(new URL(baseURL!).origin);
    expect(await page.evaluate(() => document.fonts.check('600 16px "Space Grotesk Variable"'))).toBe(true);
  });
}
