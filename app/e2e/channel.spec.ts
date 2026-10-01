import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitsOf, midFile, openPair, test } from './fixtures';
import { convert, download } from './steps';

const KICK = 24;
const EZ_KICK = 36;

const band = () => midFile(
  'band.mid',
  [{ channel: DRUMS, key: KICK }],
  [{ channel: 1, key: KICK }],
  [{ channel: 2, key: KICK }],
);

async function loadBand(page: Page, channel?: string) {
  await openPair(page);
  await addFiles(page, band());
  const select = page.getByRole('combobox', { name: 'Drum channel' });
  if (channel) await select.selectOption(channel);
  return select;
}

test('Auto converts only the tracks that play on channel 10', async ({ page }) => {
  const select = await loadBand(page);
  await expect(select).toHaveValue('auto');
  await expect(page.getByText('tracks with channel-10 hits · others unchanged')).toBeVisible();

  await convert(page);
  await expect(page.getByText('2 on other channels unchanged')).toBeVisible();
  expect(hitsOf(await download(page))).toEqual([
    { channel: DRUMS, key: EZ_KICK },
    { channel: 1, key: KICK },
    { channel: 2, key: KICK },
  ]);
});

test('All channels converts the notes on every channel', async ({ page }) => {
  await loadBand(page, 'All channels');
  await expect(page.getByText('every channel is converted')).toBeVisible();

  await convert(page);
  await expect(page.getByText(/on other channels unchanged/)).toHaveCount(0);
  expect(hitsOf(await download(page))).toEqual([
    { channel: DRUMS, key: EZ_KICK },
    { channel: 1, key: EZ_KICK },
    { channel: 2, key: EZ_KICK },
  ]);
});

test('a chosen channel converts that channel alone, leaving channel 10 as it was', async ({ page }) => {
  const select = await loadBand(page, '2');
  await expect(select).toHaveValue('2');
  await expect(page.getByText('only channel 2 is converted')).toBeVisible();

  await convert(page);
  await expect(page.getByText('2 on other channels unchanged')).toBeVisible();
  expect(hitsOf(await download(page))).toEqual([
    { channel: DRUMS, key: KICK },
    { channel: 1, key: KICK },
    { channel: 2, key: EZ_KICK },
  ]);
});
