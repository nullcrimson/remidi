import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { convert, download, press } from './steps';

const kick = () => midFile('kick.mid', [{ channel: DRUMS, key: 24 }]);
const tip = (page: Page) => page.getByRole('group', { name: 'Leave a tip' });
const DAY = 24 * 60 * 60 * 1000;

async function convertAndSave(page: Page, times = 1) {
  await addFiles(page, kick());
  await convert(page);
  for (let i = 0; i < times; i += 1) await download(page);
}

test('the tip ask waits for a third saved file, then stays pinned to the top while the page scrolls', async ({ page }) => {
  await openPair(page);
  await convertAndSave(page, 2);
  await expect(tip(page)).toHaveCount(0);
  await download(page);
  await expect(tip(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const box = (await tip(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(40);
  await expect(tip(page)).toBeInViewport();
});

test('the tip ask comes at most once a day', async ({ page }) => {
  const start = new Date('2026-10-01T12:00:00Z');
  await page.clock.setSystemTime(start);
  await openPair(page);
  await convertAndSave(page, 3);
  await press(tip(page).getByRole('button', { name: 'Close' }));
  await expect(tip(page)).toHaveCount(0);

  await press(page.getByRole('button', { name: 'Convert more' }));
  await convertAndSave(page);
  await expect(tip(page)).toHaveCount(0);

  await page.clock.setSystemTime(new Date(start.getTime() + DAY + 60_000));
  await press(page.getByRole('button', { name: 'Convert more' }));
  await convertAndSave(page);
  await expect(tip(page)).toBeVisible();
});
