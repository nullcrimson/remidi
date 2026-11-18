import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitsOf, midFile, openPair, test } from './fixtures';
import { convert, doneCard, download, openSettings, press, seen } from './steps';

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
  const question = page.getByRole('group', { name: 'Which parts of split.mid are the drums?' });
  await expect(question).toBeVisible();
  await expect(page.getByRole('button', { name: /^Convert/ })).toBeDisabled();
  await expect(page.getByText('Tick the drum parts above to convert', { exact: true })).toBeVisible();
  const row = question.locator('label').filter({ hasText: /Track 1 · channel 1/ });
  await expect(row).toContainText('1 note');
  await expect(row).toContainText('Kick');

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

const split = (name = 'split.mid') => midFile(name, [{ channel: 1, key: KICK }], [{ channel: 2, key: KICK }]);

const partQuestion = (page: Page, file: string) => page.getByRole('group', { name: `Which parts of ${file} are the drums?` });

test('unticking the last part disables Convert again', async ({ page }) => {
  await openPair(page);
  await addFiles(page, split());
  const part = page.getByRole('checkbox', { name: /Track 1 · channel 1/ });
  await press(part);
  await expect(part).toBeChecked();
  const convertButton = page.getByRole('button', { name: /^Convert/ });
  await expect(convertButton).toBeEnabled();
  await press(part);
  await expect(part).not.toBeChecked();
  await expect(convertButton).toBeDisabled();
  await expect(page.getByText('Tick the drum parts above to convert', { exact: true })).toBeVisible();
});

/** Adds a file that waits for its drum parts beside one that is ready, and converts the ready one. */
async function convertTheReadyOne(page: Page) {
  await openPair(page);
  await addFiles(page, split(), midFile('kick.mid', [{ channel: DRUMS, key: KICK }]));
  await press(page.getByRole('button', { name: 'Convert the 1 file that is ready' }));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
}

test('with one file waiting, Convert converts the ready one, keeps asking and names the one left out', async ({ page }) => {
  await convertTheReadyOne(page);
  await expect(partQuestion(page, 'split.mid')).toBeVisible();
  await expect(doneCard(page).getByText('split.mid was left out: its drum parts are not picked.')).toBeVisible();
});

test('the done card\'s Pick its drum parts brings the question of the file left out into view', async ({ page }) => {
  await convertTheReadyOne(page);
  await press(doneCard(page).getByRole('button', { name: 'Pick its drum parts' }));
  await seen(partQuestion(page, 'split.mid'));
  await expect(partQuestion(page, 'split.mid').getByRole('checkbox').first()).toBeFocused();
});

test('Tick the same tracks ticks them in the next file', async ({ page }) => {
  const named = (name: string) => midFile(
    name,
    { name: 'Drums', hits: [{ channel: 1, key: KICK }] },
    { name: 'Bass', hits: [{ channel: 2, key: 40 }] },
  );
  await openPair(page);
  await addFiles(page, named('a.mid'), named('b.mid'));
  await press(partQuestion(page, 'a.mid').getByRole('checkbox', { name: /“Drums”/ }));
  await press(partQuestion(page, 'b.mid').getByRole('button', { name: 'Tick the same tracks as in a.mid' }));
  await expect(partQuestion(page, 'b.mid').getByRole('checkbox', { name: /“Drums”/ })).toBeChecked();
  await expect(partQuestion(page, 'b.mid').getByRole('checkbox', { name: /“Bass”/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Convert 2 files to EZdrummer 3' })).toBeEnabled();
});

test('asks when channel 10 holds only notes the target has no drum for', async ({ page }) => {
  await page.goto('/?from=addictive_drums2&to=ezdrummer');
  await addFiles(page, midFile('ad2.mid', [{ channel: DRUMS, key: 75 }], [{ channel: 1, key: 36 }]));
  await expect(partQuestion(page, 'ad2.mid')).toContainText('Channel 10 holds 1 note, and EZdrummer 3 has no drum for it.');
});
