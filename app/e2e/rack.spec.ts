import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import type { Download, Page } from '@playwright/test';
import { expect, openPair, test } from './fixtures';
import { openSettings, press } from './steps';

const rackButton = (page: Page) => page.getByRole('button', { name: /^Download an Ableton rack for / });

async function bytesOf(download: Download): Promise<Buffer> {
  return readFile(await download.path());
}

async function saveRack(page: Page, start: () => Promise<void>) {
  const file = page.waitForEvent('download');
  await start();
  const download = await file;
  const bytes = await bytesOf(download);
  return { name: download.suggestedFilename(), bytes, xml: gunzipSync(bytes).toString('utf8') };
}

test('the summary row downloads an Ableton rack', async ({ page }) => {
  await openPair(page);
  const rack = await saveRack(page, () => press(rackButton(page)));
  expect(rack.name).toBe('GetGood Drums Invasion to EZdrummer 3.adg');
  expect([...rack.bytes.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
  expect(rack.xml).toContain('<UserName Value="GetGood Drums Invasion → EZdrummer 3"/>');
  await expect(page.getByRole('status')).toContainText('Rack saved: GetGood Drums Invasion to EZdrummer 3.adg.');
});

test('the rack follows Missing drums and Unknown notes', async ({ page }) => {
  await page.goto('/?from=superior_drummer3&to=general_midi');
  await openSettings(page);
  await page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await page.getByRole('radiogroup', { name: 'Unknown notes' }).getByText('Keep as they are', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Keep as they are' })).toBeChecked();
  const rack = await saveRack(page, () => press(rackButton(page)));
  expect(rack.xml).toContain('<Name Value="Unknown, kept"/>');
  await expect(page.getByRole('status')).toContainText(/lacks? ha(s|ve) no row name in the clip, only a note like D1, and stays? silent\./);
});

test('the rack downloads from the keyboard', async ({ page }) => {
  await openPair(page);
  const edit = page.getByRole('button', { name: /Edit individual notes/ });
  await edit.focus();
  await page.keyboard.press('Tab');
  await expect(rackButton(page)).toBeFocused();
  const rack = await saveRack(page, () => page.keyboard.press('Enter'));
  expect(rack.name).toBe('GetGood Drums Invasion to EZdrummer 3.adg');
  await expect(rackButton(page)).toBeFocused();
});
