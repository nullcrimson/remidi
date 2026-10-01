import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, drumRow, noteButtons, openEditor, retarget, targetNote } from './steps';

const kickFile = () => midFile('kick.mid', [{ channel: DRUMS, key: 24 }]);

async function convertAndDownload(page: Parameters<typeof convert>[0]) {
  await convert(page);
  return hitKeys(await download(page));
}

test('a target note picked in the editor is written to the file without pressing Done', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openEditor(page);
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await retarget(page, 'Kick', 'E2');
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('button', { name: /^1 drum edited/ })).toBeVisible();
  expect(await convertAndDownload(page)).toEqual([40]);
  await expect(page.getByRole('heading', { name: /1 drum edited/ })).toBeVisible();
});

test('the Changed filter shows only the edited drum and Issues leaves it out', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  const rows = page.locator('[data-row]');
  const total = await rows.count();
  const show = page.getByRole('radiogroup', { name: 'Show' });
  await expect(show.getByRole('radio', { name: `All ${total}` })).toBeChecked();

  await show.getByText('Changed 1', { exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.getByTestId('drum-label')).toHaveText('Kick');

  const issues = show.getByText(/^Issues \d+$/);
  const count = Number((await issues.textContent())!.replace(/\D/g, ''));
  await issues.click();
  await expect(rows).toHaveCount(count);
  await expect(drumRow(page, 'Kick')).toHaveCount(0);

  await show.getByText(`All ${total}`, { exact: true }).click();
  await expect(rows).toHaveCount(total);
});

test('octave naming renames the notes in the editor but not in the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openEditor(page);
  await expect(noteButtons(page, 'Kick')).toHaveText(['C1', 'C2']);
  await page.getByRole('button', { name: '← Back' }).click();

  await page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2').click();
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
  await expect(page.getByText('Studio One · Cubase · FL Studio')).toBeVisible();
  await openEditor(page);
  await expect(noteButtons(page, 'Kick')).toHaveText(['C0', 'C1']);

  await page.getByRole('button', { name: '← Back' }).click();
  expect(await convertAndDownload(page)).toEqual([36]);
});
