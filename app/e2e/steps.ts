import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { expect, openPair, test } from './fixtures';

/** Taps on a touch screen and clicks elsewhere, as a person on that device would. */
export async function press(target: Locator) {
  await (test.info().project.use.hasTouch ? target.tap() : target.click());
}

/** The editor row of a drum, by its exact name. */
export const drumRow = (page: Page, drum: string) => page.locator('[data-row]').filter({
  has: page.getByTestId('drum-label').getByText(drum, { exact: true }),
});

/** A drum row's source and target note buttons, in that order. */
export const noteButtons = (page: Page, drum: string) => drumRow(page, drum).locator('button[aria-expanded]');

export const targetNote = (page: Page, drum: string) => noteButtons(page, drum).nth(1);

export const saved = (page: Page) => page.getByRole('group', { name: 'Saved mappings' });

/** The main button of the saved GGD Invasion → EZdrummer preset called `name`. */
export const presetChip = (page: Page, name: string) =>
  saved(page).getByRole('button', { name: new RegExp(`^${name}\\s*GGD→EZD$`) });

export async function openEditor(page: Page) {
  await press(page.getByRole('button', { name: /Edit individual notes/ }));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
}

export async function leaveEditor(page: Page) {
  await press(page.getByRole('button', { name: '← Back' }));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeHidden();
}

/** Picks `note` as the drum's target in the note picker. */
export async function retarget(page: Page, drum: string, note: string) {
  await press(targetNote(page, drum));
  const picker = page.getByRole('dialog', { name: `Target note for ${drum}` });
  await press(picker.getByRole('button', { name: note, exact: true }));
  await expect(picker).toBeHidden();
  await expect(targetNote(page, drum)).toHaveText(note);
}

export async function convert(page: Page, files = 1) {
  await press(page.getByRole('button', { name: 'Convert', exact: true }));
  await expect(page.getByRole('heading', { name: new RegExp(`^${files} files? converted`) })).toBeVisible();
}

/** Clicks a download link (the single file's by default) and reads the file it saves. */
export async function download(page: Page, link?: Locator) {
  const file = page.waitForEvent('download');
  await press((link ?? page.getByRole('link', { name: /Download \.mid/ })));
  return new Uint8Array(await readFile(await (await file).path()));
}

/** Saves Kick → E2 for GetGood Drums Invasion → EZdrummer as the preset `name`. */
export async function saveKickPreset(page: Page, name: string) {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await press(page.getByRole('button', { name: 'Save as preset' }));
  await page.getByRole('textbox', { name: 'Preset name' }).fill(name);
  await press(page.getByRole('button', { name: 'Save', exact: true }));
  await expect(page.getByRole('button', { name: 'Update preset' })).toBeVisible();
  await leaveEditor(page);
  await expect(presetChip(page, name)).toBeVisible();
}
