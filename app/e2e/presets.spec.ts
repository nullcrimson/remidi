import { BEACON, expect, test } from './fixtures';
import { openEditor, presetChip, saved, saveKickPreset, targetNote } from './steps';

const NAME = 'Heavy Kick';

test('a saved preset survives a reload and brings its edit back', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await page.reload();
  const chip = presetChip(page, NAME);
  await expect(chip).toBeVisible();

  await openEditor(page);
  await page.getByRole('button', { name: 'Reset all' }).click();
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('button', { name: /drum edited/ })).toHaveCount(0);

  await chip.click();
  await expect(page.getByRole('button', { name: `1 drum edited — review changes, from preset ${NAME}` }))
    .toBeVisible();
  await openEditor(page);
  await expect(targetNote(page, 'Kick')).toHaveText('E2');
});

test('an exported preset imports into a browser that has never seen it', async ({ page, browser, baseURL }) => {
  await saveKickPreset(page, NAME);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `More actions for ${NAME}` }).click();
  await page.getByRole('menuitem', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('heavy-kick-drumverter.json');
  const path = test.info().outputPath(file.suggestedFilename());
  await file.saveAs(path);

  const fresh = await browser.newContext({ baseURL });
  await fresh.route(BEACON, (route) => route.abort());
  const other = await fresh.newPage();
  await other.goto('/');
  await expect(other.getByRole('button', { name: /Choose files/ })).toBeVisible();
  await expect(saved(other)).toHaveCount(0);
  const chooser = other.waitForEvent('filechooser');
  await other.getByRole('button', { name: /Choose files/ }).click();
  await (await chooser).setFiles(path);

  await expect(other.getByText(`Imported '${NAME}'.`)).toBeVisible();
  await presetChip(other, NAME).click();
  await expect(other.getByRole('group', { name: 'FROM engine' }).getByTestId('chosen-engine'))
    .toHaveText('GetGood Drums Invasion');
  await openEditor(other);
  await expect(targetNote(other, 'Kick')).toHaveText('E2');
  await fresh.close();
});
