import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const kick = (name: string) => midFile(name, [{ channel: DRUMS, key: 24 }]);

async function choose(page: Page, ...files: ReturnType<typeof midFile>[]) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Choose files/ }).click();
  await (await chooser).setFiles(files);
}

test('files picked with Choose files can be removed one at a time or cleared', async ({ page }) => {
  await openPair(page);
  const convert = page.getByRole('button', { name: 'Convert', exact: true });
  await expect(convert).toBeDisabled();

  await choose(page, kick('one.mid'), kick('two.mid'));
  await expect(page.getByText('one.mid', { exact: true })).toBeVisible();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();

  await page.getByRole('button', { name: 'Remove one.mid' }).click();
  await expect(page.getByText('one.mid', { exact: true })).toBeHidden();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();

  await page.getByRole('button', { name: 'clear all' }).click();
  await expect(page.getByText('two.mid', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: /Choose files/ })).toBeVisible();
  await expect(convert).toBeDisabled();
});

test('Convert more leaves the done panel for an empty converter with the same engines', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  const done = page.getByRole('heading', { name: /1 file converted/ });
  await expect(done).toBeVisible();

  await page.getByRole('button', { name: 'Convert more' }).click();
  await expect(done).toBeHidden();
  await expect(page.getByText('kick.mid', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Convert', exact: true })).toBeDisabled();
  await expect(page.getByRole('group', { name: 'TO engine' }).getByTestId('chosen-engine'))
    .toHaveText('EZdrummer 3');

  await choose(page, kick('again.mid'));
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(done).toBeVisible();
});
