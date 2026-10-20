import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';

const kick = (name: string) => midFile(name, [{ channel: DRUMS, key: 24 }]);

test('converts a kick through the real engine and downloads the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: /^Convert/ }).click();
  await page.getByRole('heading', { name: /1 file converted → EZdrummer/ }).waitFor();

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download \.mid/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.mid$/);
  expect(hitKeys(await readFile(await file.path()))).toEqual([36]);
});

test('focus moves to the converted heading after Convert', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect(page.getByRole('heading', { name: /1 file converted → EZdrummer/ })).toBeFocused();
});

async function hoverDisabledConvert(page: Page) {
  await openPair(page);
  await expect(page.getByRole('button', { name: /Edit individual notes/ })).toBeVisible();
  const convert = page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });
  await convert.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await convert.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  return box;
}

test('a disabled Convert explains itself in a tooltip beside the mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hover on touch');
  await hoverDisabledConvert(page);
  await expect(page.getByRole('tooltip')).toHaveText('Add a .mid file to convert');
});

test('the Convert tooltip follows the mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hover on touch');
  const box = await hoverDisabledConvert(page);
  await page.getByRole('tooltip').waitFor();
  await page.mouse.move(box.x + 80, box.y + box.height / 2);
  await expect(page.getByRole('tooltip')).toHaveCSS('left', `${Math.round(box.x + 80 + 14)}px`);
});

test('the Convert tooltip goes when the mouse leaves the button', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hover on touch');
  const box = await hoverDisabledConvert(page);
  await page.getByRole('tooltip').waitFor();
  await page.mouse.move(box.x + 40, box.y - 60);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('downloads several converted files as one zip', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('one.mid'), kick('two.mid'));
  await page.getByRole('button', { name: /^Convert/ }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download 2 files \(\.zip\)/ }).click();
  const zip = unzipSync(await readFile(await (await download).path()));
  expect(Object.keys(zip)).toHaveLength(2);
  for (const bytes of Object.values(zip)) expect(hitKeys(bytes)).toEqual([36]);
});
