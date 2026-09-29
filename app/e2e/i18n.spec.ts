import { addFiles, expect, openPair, test } from './fixtures';

test('the shell carries a hidden load-failure notice', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#load-failed')).toHaveCount(1);
  await expect(page.locator('#load-failed')).toBeHidden();
});

test('/ makes no language-file request', async ({ page }) => {
  const ftl: string[] = [];
  page.on('request', (r) => {
    if (/\.ftl\b|app-[\w-]+\.js$/.test(r.url())) ftl.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(ftl).toEqual([]);
});

test('a bad MIDI file shows the message and its technical detail', async ({ page }) => {
  await openPair(page);
  await addFiles(page, { name: 'bad.mid', mimeType: 'audio/midi', buffer: Buffer.from('nope') });
  await page.getByRole('button', { name: /^Convert/ }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Not a MIDI file this converter can read');
  await expect(alert).toContainText(/Details: .+/);
});
