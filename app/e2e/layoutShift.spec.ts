import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { delayed, DESKTOP, lateShift, PHONE, settledShift, watchShifts } from './shift';

type Viewport = typeof DESKTOP;

const WASM = '**/midiremap_wasm_bg-*.wasm';
const FROM_AN_ENGINE_PAGE = '/#from=ggd_invasion&to=ezdrummer2';

async function catalogLoads(page: Page, viewport: Viewport, address: string) {
  await page.setViewportSize(viewport);
  await watchShifts(page);
  await delayed(page, WASM, 2000);
  await page.goto(address);
  await expect(page.getByText('Your drum file', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('footer')).toBeVisible();
  expect(await settledShift(page)).toBeLessThan(0.01);
}

async function catalogFails(page: Page, viewport: Viewport, pageErrors: string[]) {
  await page.setViewportSize(viewport);
  await watchShifts(page);
  await delayed(page, WASM, 1000, (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('main .text-danger')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('footer')).toBeVisible();
  expect(await settledShift(page)).toBeLessThan(0.01);
  const expected = (e: string) => /wasm|WebAssembly|Failed to fetch|ERR_FAILED/i.test(e);
  const unexpected = pageErrors.filter((e) => !expected(e));
  pageErrors.length = 0;
  expect(unexpected).toEqual([]);
}

async function wholeConversion(page: Page, viewport: Viewport) {
  await page.setViewportSize(viewport);
  await watchShifts(page);
  await openPair(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
  await page.getByRole('button', { name: /^Convert/ }).click();
  await page.getByRole('heading', { name: /1 file converted → EZdrummer/ }).waitFor();
  await page.waitForTimeout(800);
  expect(await settledShift(page)).toBeLessThan(0.1);
}

async function languageOffer(page: Page, viewport: Viewport) {
  await page.setViewportSize(viewport);
  const shift = await lateShift(page, '/engines/ggd-invasion/', '**/assets/language-*.js');
  await expect(page.locator('#lang-offer')).toBeVisible();
  expect(shift).toBeLessThan(0.01);
}

test('the converter does not shift while its catalog loads on a desktop', async ({ page }) => {
  await catalogLoads(page, DESKTOP, '/');
});

test('the converter does not shift while its catalog loads on a phone', async ({ page }) => {
  await catalogLoads(page, PHONE, '/');
});

test('the converter opened from an engine page does not shift while its catalog loads on a desktop', async ({ page }) => {
  await catalogLoads(page, DESKTOP, FROM_AN_ENGINE_PAGE);
});

test('the converter opened from an engine page does not shift while its catalog loads on a phone', async ({ page }) => {
  await catalogLoads(page, PHONE, FROM_AN_ENGINE_PAGE);
});

test('the converter does not shift when its catalog fails on a desktop', async ({ page, pageErrors }) => {
  await catalogFails(page, DESKTOP, pageErrors);
});

test('the converter does not shift when its catalog fails on a phone', async ({ page, pageErrors }) => {
  await catalogFails(page, PHONE, pageErrors);
});

test('a whole conversion stays within good layout shift on a desktop', async ({ page }) => {
  await wholeConversion(page, DESKTOP);
});

test('a whole conversion stays within good layout shift on a phone', async ({ page }) => {
  test.fixme(true, 'N32: adding a file on a phone shifts the steps by about 0.19');
  await wholeConversion(page, PHONE);
});

test.describe('a visitor whose browser speaks another language', () => {
  test.use({ locale: 'pl-PL' });

  test('the language offer does not shift a static page on a desktop', async ({ page }) => {
    await languageOffer(page, DESKTOP);
  });

  test('the language offer does not shift a static page on a phone', async ({ page }) => {
    await languageOffer(page, PHONE);
  });
});
