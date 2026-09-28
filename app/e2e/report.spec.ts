import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const drumsAndBass = () => midFile(
  'band.mid',
  [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 65 }],
  [{ channel: 1, key: 40 }],
);

async function convertBand(page: Page) {
  await openPair(page);
  await addFiles(page, drumsAndBass());
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeVisible();
}

const inside = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));

/** Presses Tab and waits for Floating UI's focus guards, which redirect on the next frame. */
async function tab(page: Page) {
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() =>
    document.activeElement?.hasAttribute('data-floating-ui-focus-guard'),
  )).toBe(false);
}

test('the report traps focus, locks scroll and gives focus back', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  await expect.poll(() => inside(page)).toBe(true);
  for (let i = 0; i < 8; i += 1) {
    await tab(page);
    expect(await inside(page)).toBe(true);
  }
  expect(await page.evaluate(() =>
    [document.body, document.documentElement].some((el) => getComputedStyle(el).overflow === 'hidden'),
  )).toBe(true);

  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();

  await open.click();
  await expect(report).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();
});

test('the report sends untouched notes to the drum channel setting', async ({ page }) => {
  await convertBand(page);
  await page.getByRole('button', { name: /View report/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Drum channel/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('combobox', { name: 'Drum channel' })).toBeFocused();
});
