import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { leaveEditor, openEditor, presetChip, press, retarget, saved, saveKickPreset, targetNote } from './steps';

const NAME = 'Heavy Kick';

async function menu(page: Page, name: string, action: 'Rename' | 'Duplicate' | 'Delete') {
  await press(page.getByRole('button', { name: `More actions for ${name}`, exact: true }));
  await press(page.getByRole('menuitem', { name: action }));
}

const chips = (page: Page) => saved(page).getByRole('listitem');

test('a preset is renamed, duplicated and deleted from its chip menu', async ({ page }) => {
  await saveKickPreset(page, NAME);

  await menu(page, NAME, 'Rename');
  const field = page.getByRole('textbox', { name: `Rename ${NAME}` });
  await expect(field).toHaveValue(NAME);
  await field.fill('Big Kick');
  await press(page.getByRole('button', { name: 'Save name' }));
  await expect(presetChip(page, 'Big Kick')).toBeFocused();
  await expect(presetChip(page, NAME)).toHaveCount(0);

  await menu(page, 'Big Kick', 'Duplicate');
  await expect(presetChip(page, 'Big Kick copy')).toBeVisible();
  await expect(chips(page)).toHaveCount(2);

  await page.reload();
  await expect(chips(page)).toHaveCount(2);
  await menu(page, 'Big Kick', 'Delete');
  await expect(chips(page)).toHaveCount(1);
  await expect(presetChip(page, 'Big Kick')).toHaveCount(0);
  await expect(presetChip(page, 'Big Kick copy')).toBeFocused();

  await openEditor(page);
  await press(page.getByRole('button', { name: 'Reset all' }));
  await leaveEditor(page);
  await press(presetChip(page, 'Big Kick copy'));
  await expect(page.getByRole('button', { name: '1 drum edited — review changes, from preset Big Kick copy' }))
    .toBeVisible();

  await page.reload();
  await expect(chips(page)).toHaveCount(1);
  await menu(page, 'Big Kick copy', 'Delete');
  await expect(saved(page)).toHaveCount(0);
});

test('Update preset saves a further edit into the preset that is open', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await expect(presetChip(page, NAME)).toHaveAttribute('title', '1 override');

  await openEditor(page);
  await retarget(page, 'Snare', 'F2');
  await leaveEditor(page);
  await expect(page.getByRole('button', { name: `2 drums edited — review changes, not saved to ${NAME}` }))
    .toBeVisible();

  await openEditor(page);
  await press(page.getByRole('button', { name: 'Update preset' }));
  await expect(page.getByRole('textbox', { name: 'Preset name' })).toHaveValue(NAME);
  await expect(page.getByText('A preset for GGD→EZD already exists.')).toBeVisible();
  await press(page.getByRole('button', { name: 'Update', exact: true }));
  await expect(page.getByRole('button', { name: 'Update preset' })).toBeVisible();
  await leaveEditor(page);
  await expect(page.getByRole('button', { name: `2 drums edited — review changes, from preset ${NAME}` }))
    .toBeVisible();
  await expect(chips(page)).toHaveCount(1);
  await expect(presetChip(page, NAME)).toHaveAttribute('title', '2 overrides');

  await page.reload();
  await openEditor(page);
  await press(page.getByRole('button', { name: 'Reset all' }));
  await leaveEditor(page);
  await press(presetChip(page, NAME));
  await openEditor(page);
  await expect(targetNote(page, 'Kick')).toHaveText('E2');
  await expect(targetNote(page, 'Snare')).toHaveText('F2');
});
