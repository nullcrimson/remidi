import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, drumRow, leaveEditor, noteButtons, openEditor, openSettings, press, retarget, seen, targetNote } from './steps';

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
});

test('an editor row gives the drum name and the Plays text the same width, with the note chips between', async ({ page, isMobile }) => {
  test.skip(isMobile, 'on a narrow screen the Plays text has a line of its own');
  await openPair(page);
  await openEditor(page);
  const row = drumRow(page, 'Kick');
  const name = await row.getByTestId('drum-label').boundingBox();
  const plays = await row.getByTestId('result').boundingBox();
  if (name === null || plays === null) throw new Error('the row has no drum name or Plays text');
  expect(Math.abs(name.width - plays.width)).toBeLessThanOrEqual(1);
});

const chinaLine = (page: Parameters<typeof convert>[0]) => drumRow(page, 'China 1').getByTestId('result');

async function moveChinaStandIn(page: Parameters<typeof convert>[0]) {
  await openPair(page);
  await openEditor(page);
  const standIn = (await chinaLine(page).innerText()).replace(/^≈\s*/, '');
  await press(targetNote(page, standIn));
  const picker = page.getByRole('dialog', { name: `Target note for ${standIn}` });
  await press(picker.getByTestId('picker-layout').getByRole('button', { pressed: false }).first());
  await expect(picker).toBeHidden();
  return standIn;
}

test('the line of a moved stand-in jumps to the row that moved it', async ({ page }) => {
  const standIn = await moveChinaStandIn(page);

  await press(chinaLine(page).getByRole('button'));
  await expect(targetNote(page, standIn)).toBeFocused();
  await expect(targetNote(page, standIn)).toBeInViewport();
});

test('the row a moved stand-in\'s line jumps to is highlighted', async ({ page }) => {
  const standIn = await moveChinaStandIn(page);

  await press(chinaLine(page).getByRole('button'));
  await expect(drumRow(page, standIn)).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('the highlight of the row a moved stand-in\'s line jumps to fades away', async ({ page }) => {
  const standIn = await moveChinaStandIn(page);
  await press(chinaLine(page).getByRole('button'));
  const row = drumRow(page, standIn);
  await expect(row).toHaveAttribute('data-flash', '');

  await expect(row).not.toHaveAttribute('data-flash', '', { timeout: 5000 });
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('with reduced motion the row highlight holds its shade instead of fading', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const standIn = await moveChinaStandIn(page);
  await press(chinaLine(page).getByRole('button'));
  const row = drumRow(page, standIn);
  await expect(row).toHaveAttribute('data-flash', '');

  const [atStart, nearEnd] = await row.evaluate((el) => {
    const [flash] = el.getAnimations();
    flash.pause();
    return [0, 2300].map((ms) => {
      flash.currentTime = ms;
      return getComputedStyle(el).backgroundColor;
    });
  });
  expect(nearEnd).toBe(atStart);
});

test('the done heading counts the drums edited in the editor', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await page.getByRole('button', { name: '← Back' }).click();

  await convert(page);
  await expect(page.getByRole('heading', { name: /1 drum edited/ })).toBeVisible();
});

test('the Changed filter shows only the edited drum', async ({ page }) => {
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
});

test('the Issues filter leaves the edited drum out', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  const rows = page.locator('[data-row]');
  const show = page.getByRole('radiogroup', { name: 'Show' });

  const issues = show.getByText(/^Issues \d+$/);
  const count = Number((await issues.textContent())!.replace(/\D/g, ''));
  await issues.click();
  await expect(rows).toHaveCount(count);
  await expect(drumRow(page, 'Kick')).toHaveCount(0);
});

test('the All filter brings every drum back', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  const rows = page.locator('[data-row]');
  const total = await rows.count();
  const show = page.getByRole('radiogroup', { name: 'Show' });
  await show.getByText('Changed 1', { exact: true }).click();
  await expect.poll(() => rows.count()).toBe(1);

  await show.getByText(`All ${total}`, { exact: true }).click();
  await expect(rows).toHaveCount(total);
});

test('octave naming renames the notes in the editor', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openEditor(page);
  await expect(noteButtons(page, 'Kick')).toHaveText(['C1', 'C2']);
  await page.getByRole('button', { name: '← Back' }).click();

  await openSettings(page);
  await page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2').click();
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
  await expect(page.getByText('Ableton Live · Logic Pro · Cubase · Studio One')).toBeVisible();
  await openEditor(page);
  await expect(noteButtons(page, 'Kick')).toHaveText(['C0', 'C1']);
});

test('octave naming does not change the notes in the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openSettings(page);
  await page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2').click();
  await page.getByText('Ableton Live · Logic Pro · Cubase · Studio One').waitFor();

  expect(await convertAndDownload(page)).toEqual([36]);
});

const kickPicker = (page: Page) => page.getByRole('dialog', { name: 'Target note for Kick' });

test('a target note picked from the drum list is written to the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await openEditor(page);
  await press(targetNote(page, 'Kick'));
  await press(kickPicker(page).getByRole('button', { name: 'Crash 2 C#3', exact: true }));
  await expect(kickPicker(page)).toBeHidden();
  await expect(targetNote(page, 'Kick')).toHaveText('C#3');
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();
  await leaveEditor(page);
  expect(await convertAndDownload(page)).toEqual([49]);
});

test('an octave tab shows that octave\'s keys', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await press(targetNote(page, 'Kick'));
  await expect(kickPicker(page).getByRole('button', { name: 'D3', exact: true })).toHaveCount(0);
  await press(kickPicker(page).getByRole('button', { name: '3', exact: true }));
  await press(kickPicker(page).getByRole('button', { name: 'D3', exact: true }));
  await expect(kickPicker(page)).toBeHidden();
  await expect(targetNote(page, 'Kick')).toHaveText('D3');
  await press(targetNote(page, 'Kick'));
  await expect(kickPicker(page).getByRole('button', { name: 'D3', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('a source note picked for a drum says which drum it came from', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await press(noteButtons(page, 'Kick').first());
  const picker = page.getByRole('dialog', { name: 'Source note for Kick' });
  await press(picker.getByRole('button', { name: 'D1', exact: true }));
  await expect(picker).toBeHidden();
  await expect(noteButtons(page, 'Kick').first()).toHaveText('D1');
  await expect(page.getByRole('status').filter({ hasText: /^D1 was Snare — now plays Kick$/ })).toBeVisible();
});

test('Done leaves the editor as Back does', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await press(page.getByRole('button', { name: 'Done', exact: true }));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeHidden();
  const editLink = page.getByRole('button', { name: /Edit individual notes/ });
  await seen(editLink);
  await expect(editLink).toBeFocused();
  await expect(page.getByRole('button', { name: /^1 drum edited/ })).toBeVisible();
});

test('Reset all brings every default back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the edits, not the layout');
  await openPair(page);
  await openEditor(page);
  const snare = await targetNote(page, 'Snare').innerText();
  await retarget(page, 'Kick', 'F2');
  await retarget(page, 'Snare', 'F2');
  await expect(page.getByText('2 changes', { exact: true })).toBeVisible();
  const reset = page.getByRole('button', { name: 'Reset all' });
  await press(reset);
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await expect(targetNote(page, 'Snare')).toHaveText(snare);
  await expect(page.getByText('No changes', { exact: true })).toBeVisible();
  await expect(reset).toBeDisabled();
});

test('clearing an assigned source note takes the edit back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the edits, not the layout');
  await openPair(page);
  await openEditor(page);
  await press(page.getByRole('button', { name: 'Advanced — reassign source notes' }));
  await page.getByRole('textbox', { name: 'Add source note' }).fill('49');
  await press(page.getByRole('button', { name: 'add', exact: true }));
  const picker = page.getByRole('dialog', { name: 'Canon for C#3' });
  await press(picker.getByRole('button', { name: /^Kick\s*kick\.main$/ }));
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();
  await press(page.getByRole('button', { name: 'Clear source note C#3' }));
  await expect(page.locator('[data-source-note="49"]')).toContainText('unmapped');
  await expect(page.getByText('No changes', { exact: true })).toBeVisible();
});
