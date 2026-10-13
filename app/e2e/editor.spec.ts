import { addFiles, DRUMS, expect, hitKeys, midFile, openPair, test } from './fixtures';
import { convert, download, drumRow, noteButtons, openEditor, press, retarget, targetNote } from './steps';

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

test('the row a moved stand-in\'s line jumps to is highlighted and the highlight fades away', async ({ page }) => {
  const standIn = await moveChinaStandIn(page);

  await press(chinaLine(page).getByRole('button'));
  const row = drumRow(page, standIn);
  await expect(row).toHaveAttribute('data-flash', '');
  await expect(row).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(row).not.toHaveAttribute('data-flash', '', { timeout: 5000 });
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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

  await page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2').click();
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
  await expect(page.getByText('Studio One · Cubase · FL Studio')).toBeVisible();
  await openEditor(page);
  await expect(noteButtons(page, 'Kick')).toHaveText(['C0', 'C1']);
});

test('octave naming does not change the notes in the file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickFile());
  await page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2').click();
  await page.getByText('Studio One · Cubase · FL Studio').waitFor();

  expect(await convertAndDownload(page)).toEqual([36]);
});
