import type { Page } from '@playwright/test';
import { ANALYTICS, expect, openPair, test } from './fixtures';
import {
  chipMenu,
  chosenEngine,
  exportedPreset,
  exportPreset,
  fillPresets,
  importPresets,
  openEditor,
  pickEngine,
  presetChip,
  press,
  saved,
  saveKickPreset,
  targetNote,
} from './steps';

const NAME = 'Heavy Kick';

test('a saved preset is still listed after a reload', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await page.reload();
  const chip = presetChip(page, NAME);
  await expect(chip).toBeVisible();
});

test('choosing a saved preset brings its edit back', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await page.reload();
  const chip = presetChip(page, NAME);
  await chip.waitFor();

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

async function exportKickPreset(page: Page) {
  await saveKickPreset(page, NAME);
  return exportPreset(page, NAME);
}

test('an exported preset is a file named after the preset', async ({ page }) => {
  const file = await exportKickPreset(page);
  expect(file.suggestedFilename()).toBe('heavy-kick-drumverter.json');
});

test('an exported preset imports into a browser that has never seen it', async ({ page, browser, baseURL }) => {
  const file = await exportKickPreset(page);
  const path = test.info().outputPath(file.suggestedFilename());
  await file.saveAs(path);

  const fresh = await browser.newContext({ baseURL });
  await fresh.route(ANALYTICS, (route) => route.abort());
  const other = await fresh.newPage();
  await other.goto('/');
  await expect(other.getByRole('button', { name: /Choose files/ })).toBeVisible();
  await expect(saved(other)).toHaveCount(0);
  const chooser = other.waitForEvent('filechooser');
  await other.getByRole('button', { name: /Choose files/ }).click();
  await (await chooser).setFiles(path);

  await expect(other.getByText(`Imported '${NAME}'.`)).toBeVisible();
  await presetChip(other, NAME).click();
  await expect(chosenEngine(other, 'FROM')).toHaveText('GetGood Drums Invasion');
  await openEditor(other);
  await expect(targetNote(other, 'Kick')).toHaveText('E2');
  await fresh.close();
});

test.describe('at the limit of saved presets', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'a rule about the store, not the layout');
    test.slow();
    await fillPresets(page, 'Cap', 50);
    await expect(presetChip(page, 'Cap copy')).toBeVisible();
    await expect(presetChip(page, 'Cap copy 2')).toBeVisible();
    await expect(saved(page).getByRole('listitem')).toHaveCount(50);
  });

  test('Duplicate is off', async ({ page }) => {
    await press(page.getByRole('button', { name: 'More actions for Cap', exact: true }));
    await expect(page.getByRole('menuitem', { name: /^Duplicate/ })).toBeDisabled();
  });

  test('an import is refused by name', async ({ page }) => {
    await importPresets(page, { name: 'Cap.json', text: await exportedPreset(page, 'Cap') });
    await expect(page.getByText("Couldn't import Cap.json: preset limit reached (50)")).toBeVisible();
  });

  test('Save says so', async ({ page }) => {
    await pickEngine(page, 'TO', 'General MIDI', 'General MIDI');
    await openEditor(page);
    await press(page.getByRole('button', { name: 'Save as preset' }));
    await expect(page.getByText('Preset limit reached (50).')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  });
});

const BROKEN = "Couldn't import broken.json: Not a preset file";

async function importBroken(page: Page) {
  await openPair(page);
  await importPresets(page, { name: 'broken.json', text: '{"not":"a preset"}' });
}

test('a file that is not a preset is refused by name', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the import, not the layout');
  await importBroken(page);
  await expect(page.getByText(BROKEN)).toBeVisible();
});

test('Dismiss removes the notice of a refused import', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the import, not the layout');
  await importBroken(page);
  await press(page.getByRole('button', { name: 'Dismiss' }));
  await expect(page.getByText(BROKEN)).toHaveCount(0);
});

test('a preset with a drum this version lacks says how many edits it skipped', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the import, not the layout');
  await saveKickPreset(page, NAME);
  const text = (await exportedPreset(page, NAME)).toString('utf8');
  expect(text).toContain('"kick.main"');
  await chipMenu(page, NAME, 'Delete');
  await expect(presetChip(page, NAME)).toHaveCount(0);
  await importPresets(page, { name: 'gone.json', text: text.replace('"kick.main"', '"kick.gone"') });
  await expect(page.getByText(`Imported '${NAME}' (1 edit skipped).`)).toBeVisible();
});

test('a browser that cannot store presets says they will be gone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the store, not the layout');
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'QuotaExceededError');
    };
  });
  await saveKickPreset(page, NAME);
  const unsaved = "Couldn't save presets: the browser's storage is full or blocked. They will be gone when you reload.";
  await expect(page.getByText(unsaved)).toBeVisible();
  await openEditor(page);
  await expect(page.getByRole('region', { name: 'Edit actions' }).getByText(unsaved)).toBeVisible();
});

test('a preset saved in another tab appears in this one', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'a rule about the store, not the layout');
  await openPair(page);
  await expect(page.getByRole('button', { name: /Choose files/ })).toBeVisible();
  const other = await context.newPage();
  await saveKickPreset(other, 'Other tab');
  await expect(presetChip(page, 'Other tab')).toBeVisible();
  await other.close();
});
