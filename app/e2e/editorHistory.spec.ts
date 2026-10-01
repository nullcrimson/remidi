import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

test('browser Back closes the note editor instead of leaving the converter', async ({ page }) => {
  await page.goto('/faq/');
  await openPair(page);
  await addFiles(page, midFile('groove.mid', [{ channel: DRUMS, key: 24 }]));
  await page.getByRole('button', { name: /Edit individual notes/ }).click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/\/faq\//);
  await expect(page.getByRole('button', { name: /Edit individual notes/ })).toBeFocused();
  await expect(page.getByText('groove.mid')).toBeVisible();

  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/faq\//);
});
