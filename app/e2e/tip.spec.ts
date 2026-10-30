import type { Page } from '@playwright/test';
import { addFiles, expect, kick, openPair, test } from './fixtures';
import { convert, press } from './steps';

const tip = (page: Page) => page.getByRole('group', { name: 'Leave a tip' });
const DAY = 24 * 60 * 60 * 1000;

/** Saves the converted file once: the ask counts the press, so the saved bytes are left unread. */
async function save(page: Page) {
  const file = page.waitForEvent('download');
  await press(page.getByRole('link', { name: /Download \.mid/ }));
  await file;
}

async function convertAndSave(page: Page, times: number) {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await convert(page);
  for (let i = 0; i < times; i += 1) await save(page);
}

test('the tip ask waits for a third saved file', async ({ page }) => {
  await convertAndSave(page, 2);
  await expect(tip(page)).toHaveCount(0);
  await save(page);
  await expect(tip(page)).toBeVisible();
});

test('the tip ask stays pinned to the top while the page scrolls', async ({ page }) => {
  await convertAndSave(page, 3);
  await tip(page).waitFor();
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
  await convertAndSave(page, 3);
  await press(tip(page).getByRole('button', { name: 'Close' }));
  await expect(tip(page)).toHaveCount(0);

  await save(page);
  await expect(tip(page)).toHaveCount(0);

  await page.clock.setSystemTime(new Date(start.getTime() + DAY + 60_000));
  await save(page);
  await expect(tip(page)).toBeVisible();
});
