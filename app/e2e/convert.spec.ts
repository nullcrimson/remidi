import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';

const kick = (name: string) => midFile(name, [{ channel: DRUMS, key: 24 }]);

test('converts a kick through the real engine and downloads the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect(page.getByRole('heading', { name: /1 file converted → EZdrummer/ })).toBeFocused();

  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download \.mid/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.mid$/);
  expect(hitKeys(await readFile(await file.path()))).toEqual([36]);
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
