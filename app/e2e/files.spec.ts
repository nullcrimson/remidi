import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const kick = (name: string) => midFile(name, [{ channel: DRUMS, key: 24 }]);

async function choose(page: Page, ...files: ReturnType<typeof midFile>[]) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Choose files/ }).click();
  await (await chooser).setFiles(files);
}

test('Choose files lists the picked files and enables Convert', async ({ page }) => {
  await openPair(page);
  const convert = page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });
  await expect(convert).toBeDisabled();

  await choose(page, kick('one.mid'), kick('two.mid'));
  await expect(page.getByText('one.mid', { exact: true })).toBeVisible();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();
});

test('a picked file is removed on its own', async ({ page }) => {
  await openPair(page);
  const convert = page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });
  await choose(page, kick('one.mid'), kick('two.mid'));
  await page.getByText('two.mid', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Remove one.mid' }).click();
  await expect(page.getByText('one.mid', { exact: true })).toBeHidden();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();
});

test('clear all empties the file list and disables Convert', async ({ page }) => {
  await openPair(page);
  const convert = page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });
  await choose(page, kick('one.mid'), kick('two.mid'));
  await page.getByText('two.mid', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'clear all' }).click();
  await expect(page.getByText('two.mid', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: /Choose files/ })).toBeVisible();
  await expect(convert).toBeDisabled();
});

test('Convert more leaves the done panel for an empty converter with the same engines', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }).click();
  const done = page.getByRole('heading', { name: /1 file converted/ });
  await expect(done).toBeVisible();

  await page.getByRole('button', { name: 'Convert more' }).click();
  await expect(done).toBeHidden();
  await expect(page.getByText('kick.mid', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ })).toBeDisabled();
  await expect(page.getByRole('group', { name: 'TO engine' }).getByTestId('chosen-engine'))
    .toHaveText('EZdrummer 3');
});

test('a file added after Convert more converts again', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }).click();
  const done = page.getByRole('heading', { name: /1 file converted/ });
  await done.waitFor();
  await page.getByRole('button', { name: 'Convert more' }).click();
  await done.waitFor({ state: 'hidden' });

  await choose(page, kick('again.mid'));
  await page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }).click();
  await expect(done).toBeVisible();
});
