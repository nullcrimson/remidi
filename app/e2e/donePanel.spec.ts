import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, press } from './steps';

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

test('Wrong mapping? Report it opens the problem form told the engines and language', async ({ page, context }) => {
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
  expect(Object.fromEntries(url.searchParams)).toEqual({ from: 'ggd_invasion', to: 'ezdrummer', lang: 'en' });
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
