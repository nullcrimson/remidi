import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, press } from './steps';

const REPORT_FORM = 'https://tally.so/r/J95eYd';

test('each file in the done list downloads on its own, converted', async ({ page }) => {
  await openPair(page);
  await addFiles(
    page,
    midFile('kick.mid', [{ channel: DRUMS, key: 24 }]),
    midFile('snare.mid', [{ channel: DRUMS, key: 26 }, { channel: DRUMS, key: 26, gap: 48 }]),
  );
  await convert(page, 2);
  const list = page.getByRole('list', { name: 'Converted files' });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  const row = (name: string) => list.getByRole('listitem').filter({ hasText: name });
  await expect(row('snare-ezdrummer.mid')).toContainText('clean');

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
