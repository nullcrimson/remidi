import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, kickAndChina, midFile, openPair, test } from './fixtures';
import { convert, doneBadge, doneCard, download, press } from './steps';

const REPORT_FORM = 'https://tally.so/r/J95eYd';

async function convertKickAndSnare(page: Page) {
  await openPair(page);
  await addFiles(
    page,
    midFile('kick.mid', [{ channel: DRUMS, key: 24 }]),
    midFile('snare.mid', [{ channel: DRUMS, key: 26 }, { channel: DRUMS, key: 26, gap: 48 }]),
  );
  await convert(page, 2);
  const list = page.getByRole('list', { name: 'Converted files' });
  const row = (name: string) => list.getByRole('listitem').filter({ hasText: name });
  return { list, row };
}

test('the done list has a row for each file and marks a clean one', async ({ page }) => {
  const { list, row } = await convertKickAndSnare(page);
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(row('snare-ezdrummer.mid')).toContainText('clean');
});

test('each file in the done list downloads on its own, converted', async ({ page }) => {
  const { row } = await convertKickAndSnare(page);

  const link = (name: string) => row(name).getByRole('link', { name: '↓ .mid' });
  await expect(link('snare-ezdrummer.mid')).toHaveAttribute('download', 'snare-ezdrummer.mid');
  expect(hitKeys(await download(page, link('snare-ezdrummer.mid')))).toEqual([38, 38]);
  expect(hitKeys(await download(page, link('kick-ezdrummer.mid')))).toEqual([36]);
});

test('Wrong mapping? Report it opens the problem form told what the conversion was', async ({ page, context }) => {
  await context.route(`${REPORT_FORM}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<title>form</title>' }));
  await openPair(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
  await convert(page);

  const popup = page.waitForEvent('popup');
  await press(page.getByRole('link', { name: 'Wrong mapping? Report it' }));
  const form = await popup;
  await form.waitForLoadState();
  const url = new URL(form.url());
  expect(`${url.origin}${url.pathname}`).toBe(REPORT_FORM);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    from: 'ggd_invasion',
    to: 'ezdrummer',
    lang: 'en',
    build: expect.stringMatching(/^([0-9a-f]{7})?$/),
    files: '1',
    read: '1',
    lost: '0',
    unrecognized: '',
    dropped: '',
    approximated: '',
    closer: '',
    missing: 'nearest',
    keep: 'remove',
    channel: 'auto',
  });
  expect(await form.evaluate(() => window.opener)).toBeNull();
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeVisible();
});

test('the done card offers the download first and the next file below it', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
  await convert(page);
  const save = page.getByRole('link', { name: '↓ Download .mid' });
  const more = page.getByRole('button', { name: 'Convert more' });

  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  const saveBox = (await save.boundingBox())!;
  const moreBox = (await more.boundingBox())!;
  expect(moreBox.y).toBeGreaterThan(saveBox.y + saveBox.height);
});

test('a heavy loss shows the warning tone', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('stray.mid', [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 49, gap: 48 }]));
  await convert(page);
  await expect(doneBadge(page, 'Warning')).toBeVisible();
  await expect(page.getByText('1 of 2 notes was left out of the file.')).toBeVisible();
  await expect(page.getByRole('link', { name: '↓ Download .mid' })).toBeVisible();
});

test('a clean conversion keeps the accent tone', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
  await convert(page);
  await expect(doneBadge(page, 'Done')).toBeVisible();
});

test('the done card\'s own link drops the missing drums and converts again', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await convert(page);
  const link = doneCard(page).getByRole('button', { name: 'Drop missing drums & convert again' });
  await press(link);
  await expect(doneCard(page).getByRole('listitem').filter({ hasText: /^1 dropped$/ })).toBeVisible();
  await expect(link).toHaveCount(0);
  expect(hitKeys(await download(page))).toEqual([36]);
});
