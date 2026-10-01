import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, leaveEditor, openEditor, press } from './steps';

const STRAY = 49;

const kickAndStray = () => midFile('stray.mid', [
  { channel: DRUMS, key: 24 },
  { channel: DRUMS, key: STRAY, gap: 48 },
]);

const advanced = (page: Page) => page.getByRole('button', { name: 'Advanced — reassign source notes' });

async function strayPlaysKick(page: Page) {
  const picker = page.getByRole('dialog', { name: 'Canon for C#3' });
  await press(picker.getByRole('button', { name: /^Kick\s*kick\.main$/ }));
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: 'Clear source note C#3' })).toBeVisible();
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();
  await leaveEditor(page);
  await convert(page);
  expect(hitKeys(await download(page))).toEqual([36, 36]);
}

test('a source note the FROM engine lacks plays a drum once assigned in Advanced', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndStray());
  await openEditor(page);
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'false');
  await press(advanced(page));
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('textbox', { name: 'Add source note' }).fill(String(STRAY));
  await press(page.getByRole('button', { name: 'add', exact: true }));
  await strayPlaysKick(page);
});

test('Assign in the report opens the unrecognized note in Advanced, and assigning it fixes the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndStray());
  await convert(page);
  await expect(page.getByRole('listitem').filter({ hasText: /^1 unrecognized$/ })).toBeVisible();
  expect(hitKeys(await download(page))).toEqual([36]);

  await press(page.getByRole('button', { name: /View report/ }));
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await expect(report.getByText('C#3', { exact: true })).toBeVisible();
  await press(report.getByRole('button', { name: 'Assign →' }));
  await expect(report).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');
  await strayPlaysKick(page);
});
