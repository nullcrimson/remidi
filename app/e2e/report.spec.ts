import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { convertBand } from './steps';

const inside = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));

async function tab(page: Page) {
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() =>
    document.activeElement?.hasAttribute('data-floating-ui-focus-guard'),
  )).toBe(false);
}

test('the open report traps focus', async ({ page }) => {
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
});

test('the open report locks the page scroll', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  expect(await page.evaluate(() =>
    [document.body, document.documentElement].some((el) => getComputedStyle(el).overflow === 'hidden'),
  )).toBe(true);
});

test('Escape closes the report and gives focus back to its button', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');
  await open.click();
  await report.waitFor();

  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();
});

test('a click outside closes the report and gives focus back to its button', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();

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
