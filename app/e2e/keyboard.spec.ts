import type { Locator, Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, SUGGESTED, test, toontrackGroove } from './fixtures';
import {
  chosenEngine,
  engineCard,
  focusHeld,
  openEditor,
  openHalpernTo,
  presetChip,
  retarget,
  saveKickPreset,
  targetNote,
} from './steps';

const groove = () => midFile('groove.mid', [{ channel: DRUMS, key: 24 }]);

async function tabTo(page: Page, target: Locator, most = 10) {
  for (let i = 0; i < most; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test('walks from page load to a converted file by keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await addFiles(page, groove());
  await expect(engineCard(page, 'FROM')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Filter FROM engines' })).toBeFocused();
  await page.keyboard.type('Invasion');
  await page.keyboard.press('Enter');
  await expect(chosenEngine(page, 'FROM')).toHaveText(/Invasion/);
  await expect(engineCard(page, 'FROM')).toBeFocused();

  await tabTo(page, engineCard(page, 'TO'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Filter TO engines' })).toBeFocused();
  await page.keyboard.type('General MIDI');
  await page.keyboard.press('Enter');
  await expect(chosenEngine(page, 'TO')).toHaveText(/General MIDI/);

  const convert = page.getByRole('button', { name: /^Convert/ });
  await tabTo(page, convert);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeFocused();

  await tabTo(page, page.getByRole('button', { name: 'Convert more' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('button:has(+ [data-testid=file-input])')).toBeFocused();
});

test('focus moves to the TO engine card when files arrive and TO is missing', async ({ page }) => {
  await page.goto('/?from=ggd_invasion');
  await addFiles(page, groove());
  await expect(engineCard(page, 'TO')).toBeFocused();
});

test('focus moves to Convert when files arrive and both engines are chosen', async ({ page }) => {
  await openPair(page);
  await addFiles(page, groove());
  await expect(page.getByRole('button', { name: /^Convert/ })).toBeFocused();
});

test('opening the note editor focuses its heading', async ({ page }) => {
  await openPair(page);
  const editLink = page.getByRole('button', { name: /Edit individual notes/ });
  await editLink.click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeFocused();
});

test('a note picker opened with Enter takes focus', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();

  const note = page.getByRole('button', { name: 'C2', exact: true }).first();
  await note.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await expect(picker).toBeVisible();
  await expect.poll(() => picker.evaluate((d) => d.contains(document.activeElement))).toBe(true);
});

test('Escape in the note picker gives focus back to the note', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();
  const note = page.getByRole('button', { name: 'C2', exact: true }).first();
  await note.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await picker.waitFor();

  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(note).toBeFocused();
});

test('Back from the note editor gives focus back to the Edit link', async ({ page }) => {
  await openPair(page);
  const editLink = page.getByRole('button', { name: /Edit individual notes/ });
  await editLink.click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();

  await page.getByRole('button', { name: /Back/ }).click();
  await expect(editLink).toBeFocused();
});

/** Saves the preset Keys, opens its menu by keyboard and moves the highlight down one: its menu's items, and its menu button. */
async function chipMenuOnSecondItem(page: Page) {
  await saveKickPreset(page, 'Keys');
  const more = page.getByRole('button', { name: 'More actions for Keys', exact: true });
  await more.focus();
  await page.keyboard.press('Enter');
  const items = page.getByRole('menuitem');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  return { items, more };
}

test('the chip menu by keyboard: the arrows move the highlight', async ({ page }) => {
  const { items } = await chipMenuOnSecondItem(page);
  await expect(items.nth(1)).toBeFocused();
  await expect(items.nth(1)).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(items.nth(1)).toHaveText(/^Duplicate/);
});

test('the chip menu by keyboard: Escape closes it', async ({ page }) => {
  const { items, more } = await chipMenuOnSecondItem(page);
  await page.keyboard.press('Escape');
  await expect(items).toHaveCount(0);
  await expect(more).toBeFocused();
});

test('the chip menu by keyboard: Enter runs the item', async ({ page }) => {
  await chipMenuOnSecondItem(page);
  await page.keyboard.press('Enter');
  await expect(presetChip(page, 'Keys copy')).toBeVisible();
});

test('focus goes to the FROM card after Use E', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await page.getByRole('button', { name: `Use ${SUGGESTED}` }).click();
  await expect(chosenEngine(page, 'FROM')).toHaveText(SUGGESTED);
  await focusHeld(page);
  await expect(engineCard(page, 'FROM')).toBeFocused();
});

test('focus goes to the card after Dismiss', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /^Download an Ableton rack/ }).click();
  const notice = page.getByRole('status').filter({ hasText: /^Rack saved/ });
  await notice.getByRole('button', { name: 'Dismiss' }).click();
  await expect(notice).toHaveCount(0);
  await focusHeld(page);
  await expect(page.getByRole('main')).toBeFocused();
});

test('focus goes to the row\'s target note after Reset {drum}', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await page.getByRole('button', { name: 'Reset Kick' }).click();
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await focusHeld(page);
  await expect(targetNote(page, 'Kick')).toBeFocused();
});

test('focus goes to the heading after Reset all', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await page.getByRole('button', { name: 'Reset all' }).click();
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await focusHeld(page);
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeFocused();
});

test('focus goes to the row after Clear source note', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await page.getByRole('button', { name: 'Advanced — reassign source notes' }).click();
  await page.getByRole('textbox', { name: 'Add source note' }).fill('49');
  await page.getByRole('button', { name: 'add', exact: true }).click();
  await page.getByRole('dialog', { name: 'Canon for C#3' }).getByRole('button', { name: /^Kick\s*kick\.main$/ }).click();
  await page.getByRole('button', { name: 'Clear source note C#3' }).click();
  const row = page.locator('[data-source-note="49"]').getByRole('button').first();
  await expect(row).toContainText('unmapped');
  await focusHeld(page);
  await expect(row).toBeFocused();
});

const outline = (target: Locator) => target.evaluate((el) => {
  const style = getComputedStyle(el);
  return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
});

test('a control reached with Tab shows a focus ring, one focused after a mouse press does not', async ({ page }) => {
  await openPair(page);
  await addFiles(page, groove());
  const convertButton = page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' });
  await expect(convertButton).toBeEnabled();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const unfocused = await outline(convertButton);
  await page.getByRole('button', { name: /Edit individual notes/ }).focus();
  await tabTo(page, convertButton);
  expect(await outline(convertButton)).not.toBe(unfocused);

  await convertButton.click();
  await page.getByRole('button', { name: 'Convert more' }).click();
  const filePicker = page.locator('button:has(+ [data-testid=file-input])');
  await expect(filePicker).toBeFocused();
  expect(await outline(filePicker)).toMatch(/^none /);
});
