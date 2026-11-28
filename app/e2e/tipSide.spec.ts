import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { fits } from './layout';
import { downloadMap, ENGINE_PAGE, openEditor, press, skeleton, TIP_START, tipAsk } from './steps';

const CONVERTER = '/?from=ggd_invasion&to=ezdrummer';
const RAIL_ATTRS = ['class', 'href', 'target', 'rel'];

const side = (page: Page) => page.locator('.tip-side-rail a');

/** Downloads three drum maps, which raises the tip ask. */
async function raiseTipAsk(page: Page) {
  for (const daw of ['Reaper', 'Studio One', 'Cubase']) await downloadMap(page, daw);
  await expect(tipAsk(page)).toBeVisible();
}

/** Opens `path` at `width` and fails unless the margin link shows inside the window, right of the card, without sideways scroll. */
async function fitsAt(page: Page, width: number, path: string) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(path);
  await expect(side(page)).toBeVisible();
  await fits(page, `${path} at ${width}`);
  const link = (await side(page).boundingBox())!;
  const main = (await page.getByRole('main').boundingBox())!;
  expect(link.x + link.width).toBeLessThanOrEqual(width);
  expect(link.x).toBeGreaterThanOrEqual(main.x + main.width);
}

test.describe('the tip link in the margin', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone has no margin');
    await page.clock.setSystemTime(TIP_START);
  });

  test('shows beside a static page from 1024 px wide', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(ENGINE_PAGE);
    await expect(side(page)).toHaveText('Buy me a coffee');
    await page.setViewportSize({ width: 1023, height: 768 });
    await expect(side(page)).toBeHidden();
  });

  test('shows beside the converter from 1280 px wide', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CONVERTER);
    await expect(side(page)).toBeVisible();
    await page.setViewportSize({ width: 1279, height: 800 });
    await expect(side(page)).toBeHidden();
  });

  test('never shows beside the note editor', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openPair(page);
    await addFiles(page, midFile('groove.mid', [{ channel: DRUMS, key: 24 }]));
    await openEditor(page);
    await expect(side(page)).toHaveCount(0);
  });

  for (const lang of ['', 'de/', 'ja/']) {
    test(`fits beside a static page at 1024 px, ${lang || 'en/'}`, async ({ page }) => {
      await fitsAt(page, 1024, `/${lang}engines/ggd-invasion/`);
    });

    test(`fits beside the converter at 1280 px, ${lang || 'en/'}`, async ({ page }) => {
      await fitsAt(page, 1280, `/${lang}${CONVERTER.slice(1)}`);
    });
  }

  test('hides while the tip ask is open', async ({ page }) => {
    await page.goto(ENGINE_PAGE);
    await raiseTipAsk(page);
    await expect(side(page)).toBeHidden();
    await press(tipAsk(page).getByRole('button', { name: 'Close' }));
    await expect(side(page)).toBeVisible();
  });

  test('hides once an amount is chosen in the tip ask', async ({ page, context }) => {
    await context.route('https://buy.stripe.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>pay</title>' }));
    await page.goto(ENGINE_PAGE);
    await raiseTipAsk(page);
    const popup = page.waitForEvent('popup');
    await press(tipAsk(page).getByRole('link', { name: '€5' }));
    await (await popup).close();
    await expect(tipAsk(page)).toBeHidden();
    await expect(side(page)).toBeHidden();
  });

  test('hides after a tip, on the converter too', async ({ page }) => {
    await page.goto('/thanks/');
    await page.goto(ENGINE_PAGE);
    await expect(side(page)).toBeHidden();
    await page.goto(CONVERTER);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(side(page)).toBeHidden();
  });

  test('hides when a tip lands on the thanks page in another tab', async ({ page, context }) => {
    await page.goto(ENGINE_PAGE);
    await expect(side(page)).toBeVisible();
    const thanks = await context.newPage();
    await thanks.goto('/thanks/');
    await expect(side(page)).toBeHidden();
  });

  test('is built like the converter\'s', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ENGINE_PAGE);
    const onPage = await skeleton(side(page).locator('..'), RAIL_ATTRS);
    await page.goto(CONVERTER);
    expect(await skeleton(side(page).locator('..'), RAIL_ATTRS)).toEqual(onPage);
  });
});

test('a phone shows no tip link in the margin @phone', async ({ page }) => {
  await page.goto(ENGINE_PAGE);
  await expect(side(page)).toBeHidden();
});
