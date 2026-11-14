import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitsOf, midFile, openPair, test } from './fixtures';
import { convert, download, openSettings } from './steps';

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
  await openSettings(page);
  const select = page.getByRole('combobox', { name: 'Drum channel' });
  if (channel) await select.selectOption(channel);
  return select;
}

test('Auto converts the parts on channel 10 and leaves the other tracks as they were', async ({ page }) => {
  const select = await loadBand(page);
  await expect(select).toHaveValue('auto');
  await expect(page.getByText('channel 10, or the only part with notes · otherwise you pick')).toBeVisible();

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

test('Auto asks which parts are the drums when no part is on channel 10, and converts the ticked ones', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('split.mid', [{ channel: 1, key: KICK }], [{ channel: 2, key: KICK }]));
  await expect(page.getByRole('group', { name: 'Which parts of split.mid are the drums?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Convert/ })).toBeDisabled();

  await page.getByRole('checkbox', { name: /Track 1 · channel 1/ }).check();
  await convert(page);
  expect(hitsOf(await download(page))).toEqual([
    { channel: 1, key: EZ_KICK },
    { channel: 2, key: KICK },
  ]);
});

test('Auto offers another channel of a channel-10 track and converts it on request', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('mjod.mid', [{ channel: DRUMS, key: KICK }, { channel: 1, key: KICK }]));
  await convert(page);
  await expect(page.getByText(/1 note on Track 1 · channel 1 in mjod\.mid stayed as it was/)).toBeVisible();

  await page.getByRole('button', { name: 'Also convert them' }).click();
  await expect(page.getByText(/stayed as it was/)).toHaveCount(0);
  expect(hitsOf(await download(page))).toEqual([
    { channel: DRUMS, key: EZ_KICK },
    { channel: 1, key: EZ_KICK },
  ]);
});
