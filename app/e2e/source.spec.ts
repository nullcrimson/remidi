import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, leaveEditor, openEditor, press } from './steps';

const STRAY = 49;

const kickAndStray = () => midFile('stray.mid', [
  { channel: DRUMS, key: 24 },
  { channel: DRUMS, key: STRAY, gap: 48 },
]);

/**
 * Adds the file and waits for the converter to count the note its source lacks: the count
 * comes a moment later, from the worker, and moves the controls below it down.
 */
async function addStray(page: Page) {
  await addFiles(page, kickAndStray());
  await expect(page.getByRole('status').filter({ hasText: "1 of 2 notes in your file isn't in the GetGood Drums Invasion layout." }))
    .toBeVisible();
}

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
  await addStray(page);
  await openEditor(page);
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'false');
  await press(advanced(page));
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('textbox', { name: 'Add source note' }).fill(String(STRAY));
  await press(page.getByRole('button', { name: 'add', exact: true }));
  await strayPlaysKick(page);
});

test('a note the FROM engine lacks is counted as unrecognized and left out of the file', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await convert(page);
  await expect(page.getByRole('listitem').filter({ hasText: /^1 unrecognized$/ })).toBeVisible();
  expect(hitKeys(await download(page))).toEqual([36]);
});

test('Assign in the report opens the unrecognized note in Advanced', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await convert(page);

  await press(page.getByRole('button', { name: /View report/ }));
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await expect(report.getByText('C#3', { exact: true })).toBeVisible();
  await press(report.getByRole('button', { name: 'Assign →' }));
  await expect(report).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');
});

test('assigning the unrecognized note from the report fixes the file', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await convert(page);
  await press(page.getByRole('button', { name: /View report/ }));
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await press(report.getByRole('button', { name: 'Assign →' }));
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();

  await strayPlaysKick(page);
});
