import type { Locator } from '@playwright/test';
import { addFiles, expect, kick, kickAndChina, openPair, test } from './fixtures';
import { messages } from './messages';
import {
  chipMenu,
  convert,
  convertBand,
  download,
  drumRow,
  leaveEditor,
  openEditor,
  openSettings,
  pickEngine,
  pickLanguage,
  presetChip,
  press,
  retarget,
  saved,
  saveKickPreset,
} from './steps';
import { simulateTranslation } from './translate';

const es = messages('es');

const chip = (group: Locator, text: string | RegExp) => group.locator('label').filter({ hasText: text });

test.beforeEach(async ({ page }) => {
  await simulateTranslation(page);
});

test('the reported Spanish path, from swapping engines to converting more, raises no error under translation', async ({ page }) => {
  await page.goto('/es/#from=ugritone&to=general_midi');
  await press(page.getByRole('button', { name: es('engine-swap') }));
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3', es);
  const convertButton = (count: number) =>
    page.getByRole('button', { name: es('convert-button-ready', { count, target: 'EZdrummer 3' }), exact: true });
  await addFiles(page, kick('one.mid'));
  await expect(convertButton(1)).toBeEnabled();
  await addFiles(page, kick('two.mid'));
  await expect(convertButton(2)).toBeEnabled();
  await press(page.getByRole('button', { name: es('files-remove', { name: 'one.mid' }) }));
  await press(convertButton(1));
  await expect(page.getByRole('heading', { name: new RegExp(`^${es('done-heading', { count: 1, target: 'EZdrummer 3' })}`) })).toBeVisible();
  await download(page, page.getByRole('link', { name: es('done-download-one') }));
  await press(page.getByRole('button', { name: es('done-convert-more') }));
  await expect(page.getByRole('button', { name: es('convert-button'), exact: true })).toBeVisible();
});

test('editing notes under translation raises no error and keeps the filter counts current', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  const filter = page.getByRole('textbox', { name: 'Filter drums' });
  await filter.fill('sn');
  await expect(drumRow(page, 'Kick')).toHaveCount(0);
  await filter.fill('');
  const show = page.getByRole('radiogroup', { name: 'Show' });
  await press(chip(show, 'Changed 1'));
  await expect(page.locator('[data-row]')).toHaveCount(1);
  await press(chip(show, /^All \d+$/));
  await press(page.getByRole('button', { name: 'Reset Kick' }));
  await expect(page.getByRole('button', { name: 'Reset Kick' })).toHaveCount(0);
  await retarget(page, 'Kick', 'E2');
  await press(page.getByRole('button', { name: 'Reset all' }));
  await leaveEditor(page);
});

test('the report opens and closes without an error under translation', async ({ page }) => {
  await convertBand(page);
  const report = page.getByRole('dialog');
  await press(page.getByRole('button', { name: /View report/ }));
  await expect(report).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();
});

test('switching the language there and back under translation leaves the converter converting', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await pickLanguage(page, 'Español');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await pickLanguage(page, 'English');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await convert(page);
});

test('renaming a preset raises no error under translation', async ({ page }) => {
  await saveKickPreset(page, 'Heavy Kick');
  await chipMenu(page, 'Heavy Kick', 'Rename');
  await page.getByRole('textbox', { name: 'Rename Heavy Kick' }).fill('Big Kick');
  await press(page.getByRole('button', { name: 'Save name' }));
  await expect(presetChip(page, 'Big Kick')).toBeVisible();
});

test('duplicating a preset raises no error under translation', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');
  await chipMenu(page, 'Big Kick', 'Duplicate');
  await expect(presetChip(page, 'Big Kick copy')).toBeVisible();
});

test('deleting a preset raises no error under translation', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');
  await chipMenu(page, 'Big Kick', 'Duplicate');
  await presetChip(page, 'Big Kick copy').waitFor();
  await chipMenu(page, 'Big Kick', 'Delete');
  await expect(saved(page).getByRole('listitem')).toHaveCount(1);
});

test('changing the settings raises no error under translation', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await openSettings(page);
  await press(chip(page.getByRole('radiogroup', { name: 'Missing drums' }), 'Drop'));
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await page.getByRole('combobox', { name: 'Drum channel' }).selectOption({ index: 2 });
  await press(chip(page.getByRole('radiogroup', { name: 'Octaves start at' }), 'C-2'));
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
  await convert(page);
});
