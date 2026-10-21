import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { leaveEditor, openEditor, presetChip, press, retarget, saved, saveKickPreset, targetNote } from './steps';

const NAME = 'Heavy Kick';

async function menu(page: Page, name: string, action: 'Rename' | 'Duplicate' | 'Ableton rack' | 'Delete') {
  await press(page.getByRole('button', { name: `More actions for ${name}`, exact: true }));
  await press(page.getByRole('menuitem', { name: action }));
}

const chips = (page: Page) => saved(page).getByRole('listitem');

async function editSnare(page: Page) {
  await openEditor(page);
  await retarget(page, 'Snare', 'F2');
  await leaveEditor(page);
}

async function updatePreset(page: Page) {
  await openEditor(page);
  await press(page.getByRole('button', { name: 'Update preset' }));
  await press(page.getByRole('button', { name: 'Update', exact: true }));
  await leaveEditor(page);
}

test('a preset is renamed from its chip menu', async ({ page }) => {
  await saveKickPreset(page, NAME);

  await menu(page, NAME, 'Rename');
  const field = page.getByRole('textbox', { name: `Rename ${NAME}` });
  await expect(field).toHaveValue(NAME);
  await field.fill('Big Kick');
  await press(page.getByRole('button', { name: 'Save name' }));
  await expect(presetChip(page, 'Big Kick')).toBeFocused();
  await expect(presetChip(page, NAME)).toHaveCount(0);
});

test('a preset is duplicated from its chip menu', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');

  await menu(page, 'Big Kick', 'Duplicate');
  await expect(presetChip(page, 'Big Kick copy')).toBeVisible();
  await expect(chips(page)).toHaveCount(2);
});

test('a duplicated preset is still there after a reload', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');
  await menu(page, 'Big Kick', 'Duplicate');
  await presetChip(page, 'Big Kick copy').waitFor();

  await page.reload();
  await expect(chips(page)).toHaveCount(2);
});

test('a preset is deleted from its chip menu and focus moves to the next chip', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');
  await menu(page, 'Big Kick', 'Duplicate');
  await presetChip(page, 'Big Kick copy').waitFor();

  await menu(page, 'Big Kick', 'Delete');
  await expect(chips(page)).toHaveCount(1);
  await expect(presetChip(page, 'Big Kick')).toHaveCount(0);
  await expect(presetChip(page, 'Big Kick copy')).toBeFocused();
});

test('a duplicated preset carries the edit of its original', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick');
  await menu(page, 'Big Kick', 'Duplicate');
  await presetChip(page, 'Big Kick copy').waitFor();

  await openEditor(page);
  await press(page.getByRole('button', { name: 'Reset all' }));
  await leaveEditor(page);
  await press(presetChip(page, 'Big Kick copy'));
  await expect(page.getByRole('button', { name: '1 drum edited — review changes, from preset Big Kick copy' }))
    .toBeVisible();
});

test('deleting the last preset removes the saved mappings group', async ({ page }) => {
  await saveKickPreset(page, 'Big Kick copy');

  await page.reload();
  await expect(chips(page)).toHaveCount(1);
  await menu(page, 'Big Kick copy', 'Delete');
  await expect(saved(page)).toHaveCount(0);
});

test('a saved preset chip counts the overrides it holds', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await expect(presetChip(page, NAME)).toHaveAttribute('title', '1 override');
});

test('an edit made after saving is marked as not saved to the preset', async ({ page }) => {
  await saveKickPreset(page, NAME);

  await editSnare(page);
  await expect(page.getByRole('button', { name: `2 drums edited — review changes, not saved to ${NAME}` }))
    .toBeVisible();
});

test('Update preset opens the save dialog on the preset that is open', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await editSnare(page);

  await openEditor(page);
  await press(page.getByRole('button', { name: 'Update preset' }));
  await expect(page.getByRole('textbox', { name: 'Preset name' })).toHaveValue(NAME);
  await expect(page.getByText('A preset for GGD→EZD already exists.')).toBeVisible();
});

test('confirming Update saves the further edit into the same preset', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await editSnare(page);

  await openEditor(page);
  await press(page.getByRole('button', { name: 'Update preset' }));
  await press(page.getByRole('button', { name: 'Update', exact: true }));
  await expect(page.getByRole('button', { name: 'Update preset' })).toBeVisible();
  await leaveEditor(page);
  await expect(page.getByRole('button', { name: `2 drums edited — review changes, from preset ${NAME}` }))
    .toBeVisible();
  await expect(chips(page)).toHaveCount(1);
  await expect(presetChip(page, NAME)).toHaveAttribute('title', '2 overrides');
});

test('an updated preset brings both edits back after a reload', async ({ page }) => {
  await saveKickPreset(page, NAME);
  await editSnare(page);
  await updatePreset(page);

  await page.reload();
  await openEditor(page);
  await press(page.getByRole('button', { name: 'Reset all' }));
  await leaveEditor(page);
  await press(presetChip(page, NAME));
  await openEditor(page);
  await expect(targetNote(page, 'Kick')).toHaveText('E2');
  await expect(targetNote(page, 'Snare')).toHaveText('F2');
});

test("a saved preset's menu downloads its rack", async ({ page }) => {
  await saveKickPreset(page, 'My kick');
  await page.goto('/?from=superior_drummer3&to=general_midi');
  await expect(presetChip(page, 'My kick')).toBeVisible();

  const file = page.waitForEvent('download');
  await menu(page, 'My kick', 'Ableton rack');
  const download = await file;
  expect(download.suggestedFilename()).toBe('My kick.adg');
  const xml = gunzipSync(await readFile(await download.path())).toString('utf8');
  expect(xml).toContain('<Name Value="Kick → 40"/>');
  expect(xml).toContain('<UserName Value="GetGood Drums Invasion → EZdrummer 3"/>');
  await expect(page.getByRole('status')).toContainText('Rack saved: My kick.adg.');
});
