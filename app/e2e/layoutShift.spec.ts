import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const WASM = '**/midiremap_wasm_bg-*.wasm';
const VIEWPORTS = [
  { name: 'desktop', width: 1350, height: 940 },
  { name: 'phone', width: 412, height: 823 },
];
const ADDRESSES = ['/', '/#from=ggd_invasion&to=ezdrummer2'];

async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { shift: number };
    w.shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.shift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const settledShift = (page: Page) => page.evaluate(() => new Promise<number>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve((window as unknown as { shift: number }).shift)));
}));

for (const viewport of VIEWPORTS) {
  for (const address of ADDRESSES) {
    test(`the converter does not shift while its catalog loads (${viewport.name}, ${address})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await watchShifts(page);
      await page.route(WASM, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });
      await page.goto(address);
      await expect(page.getByText('Your drum file', { exact: true }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('footer')).toBeVisible();
      expect(await settledShift(page)).toBeLessThan(0.01);
    });
  }

  test(`the converter does not shift when its catalog fails (${viewport.name})`, async ({ page, pageErrors }) => {
    await page.setViewportSize(viewport);
    await watchShifts(page);
    await page.route(WASM, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.abort();
    });
    await page.goto('/');
    await expect(page.locator('main .text-danger')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('footer')).toBeVisible();
    expect(await settledShift(page)).toBeLessThan(0.01);
    const expected = (e: string) => /wasm|WebAssembly|Failed to fetch|ERR_FAILED/i.test(e);
    const unexpected = pageErrors.filter((e) => !expected(e));
    pageErrors.length = 0;
    expect(unexpected).toEqual([]);
  });
}

for (const viewport of VIEWPORTS) {
  test(`a whole conversion stays within good layout shift (${viewport.name})`, async ({ page }) => {
    test.fixme(viewport.name === 'phone', 'N32: adding a file on a phone shifts the steps by about 0.19');
    await page.setViewportSize(viewport);
    await watchShifts(page);
    await openPair(page);
    await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
    await page.getByRole('button', { name: /^Convert/ }).click();
    await page.getByRole('heading', { name: /1 file converted → EZdrummer/ }).waitFor();
    await page.waitForTimeout(800);
    expect(await settledShift(page)).toBeLessThan(0.1);
  });
}

test.describe('a visitor whose browser speaks another language', () => {
  test.use({ locale: 'pl-PL' });

  for (const viewport of VIEWPORTS) {
    test(`the language offer does not shift a static page (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await watchShifts(page);
      await page.route('**/assets/language-*.js', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      });
      await page.goto('/engines/ggd-invasion/');
      await expect(page.locator('#lang-offer')).toBeVisible();
      await page.waitForLoadState('load');
      expect(await settledShift(page)).toBeLessThan(0.01);
    });
  }
});
