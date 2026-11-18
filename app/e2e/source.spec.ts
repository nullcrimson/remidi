import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, HALPERN, hitKeys, midFile, openPair, SUGGESTED, test, TOONTRACK_NOTES, toontrackGroove } from './fixtures';
import {
  chosenEngine,
  convert,
  convertButton,
  doneCard,
  download,
  enginePicker,
  leaveEditor,
  openEditor,
  openHalpernTo,
  openSettings,
  pickEngine,
  press,
  retarget,
  seen,
  sourceQuestion,
} from './steps';

const STRAY = 49;

const kickAndStray = () => midFile('stray.mid', [
  { channel: DRUMS, key: 24 },
  { channel: DRUMS, key: STRAY, gap: 48 },
]);

/** Adds the file, too short for the advice to name an engine, so nothing moves the controls below the engines. */
async function addStray(page: Page) {
  await addFiles(page, kickAndStray());
  await expect(page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' })).toBeEnabled();
}

const advanced = (page: Page) => page.getByRole('button', { name: 'Advanced — reassign source notes' });

async function strayPlaysKick(page: Page) {
  const picker = page.getByRole('dialog', { name: 'Canon for C#3' });
  await seen(picker);
  await press(picker.getByRole('button', { name: /^Kick\s*kick\.main$/ }));
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: 'Clear source note C#3' })).toBeVisible();
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();
  await leaveEditor(page);
  await convert(page);
  expect(hitKeys(await download(page))).toEqual([36, 36]);
}

test('a source note the FROM engine lacks plays a drum once assigned in Advanced', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await openEditor(page);
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'false');
  await press(advanced(page));
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('textbox', { name: 'Add source note' }).fill(String(STRAY));
  await press(page.getByRole('button', { name: 'add', exact: true }));
  await strayPlaysKick(page);
});

test('a note the FROM engine lacks is counted as unrecognized and left out of the file', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await convert(page);
  await expect(page.getByRole('listitem').filter({ hasText: /^1 unrecognized$/ })).toBeVisible();
  expect(hitKeys(await download(page))).toEqual([36]);
});

test('assigning the unrecognized note from the report fixes the file', async ({ page }) => {
  await openPair(page);
  await addStray(page);
  await convert(page);
  await press(page.getByRole('button', { name: /View report/ }));
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await expect(report.getByText('C#3', { exact: true })).toBeVisible();
  await press(report.getByRole('button', { name: 'Assign →' }));
  await expect(report).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');

  await strayPlaysKick(page);
});

const KICK = 36;

const doneButton = (page: Page, name: string) => doneCard(page).getByRole('button', { name });

/** Presses Convert, answers the question with Convert anyway and waits for the done card. */
async function convertAnyway(page: Page) {
  await press(convertButton(page));
  await press(sourceQuestion(page).getByRole('button', { name: 'Convert anyway' }));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
}

test('the notice for a file the target knows names the target and offers nothing to click', async ({ page }) => {
  await openHalpernTo(page, 'superior_drummer3', toontrackGroove(2));
  await expect(page.getByText('Superior Drummer 3 knows every note: your file may already be in its layout.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Use / })).toHaveCount(0);
});

test('the done card converts again from the suggested source in one click', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await expect(page.getByRole('button', { name: `Use ${SUGGESTED}` })).toBeVisible();
  await convertAnyway(page);
  await press(doneButton(page, `Convert again from ${SUGGESTED}`));
  await expect(page.getByText(`Read as ${SUGGESTED}.`)).toBeVisible();
  await expect(chosenEngine(page, 'FROM')).toHaveText(SUGGESTED);
  await expect(chosenEngine(page, 'TO')).toHaveText('General MIDI');
  expect(hitKeys(await download(page))).toContain(KICK);
});

test('Back to returns to the first pair and its edits', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await openEditor(page);
  await retarget(page, 'Kick', 'C#2', 'Side Stick C#2');
  await leaveEditor(page);
  await convertAnyway(page);
  await press(doneButton(page, `Convert again from ${SUGGESTED}`));
  await press(page.getByRole('button', { name: `Back to ${HALPERN}` }));
  await expect(chosenEngine(page, 'FROM')).toHaveText(HALPERN);
  await expect(page.getByRole('heading', { name: /^1 file converted → General MIDI/ })).toBeVisible();
  await expect(page.getByText(/^Read as /)).toBeHidden();
  await expect(doneCard(page).getByText(/so they were removed/)).toBeVisible();
  await expect(doneCard(page).getByRole('listitem').filter({ hasText: /^18 unrecognized$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^1 drum edited — review changes/ })).toBeVisible();
});

const TARGET_SENTENCE = /doesn't know any of the 18 notes in your file\. Superior Drummer 3 knows every note: your file may already be in its layout\./;

async function askFirst(page: Page) {
  await openHalpernTo(page, 'superior_drummer3', toontrackGroove(2));
  await press(convertButton(page));
  return sourceQuestion(page, TARGET_SENTENCE);
}

test('Convert asks before converting a file whose source reads no kick and no snare', async ({ page }) => {
  const question = await askFirst(page);
  await expect(question).toBeVisible();
  await expect(question.getByText(TARGET_SENTENCE)).toBeFocused();
  await expect(page.getByRole('heading', { name: /files? converted/ })).toBeHidden();
});

test('the question for a file the target knows offers to pick another source', async ({ page }) => {
  const question = await askFirst(page);
  await expect(question.getByRole('button')).toHaveText(['Pick another source', 'Convert anyway']);
  await press(question.getByRole('button', { name: 'Pick another source' }));
  await expect(question).toBeHidden();
  await expect(page.getByRole('heading', { name: /files? converted/ })).toBeHidden();
  await expect(enginePicker(page, 'FROM')).toBeVisible();
  await seen(enginePicker(page, 'FROM').getByRole('combobox', { name: 'Filter FROM engines' }));
});

test('Convert anyway converts from the chosen source', async ({ page }) => {
  const question = await askFirst(page);
  await press(question.getByRole('button', { name: 'Convert anyway' }));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  await expect(chosenEngine(page, 'FROM')).toHaveText(HALPERN);
});

test('only one of the notice, the question and the done card\'s block is on screen', async ({ page }) => {
  const question = await askFirst(page);
  await expect(question).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toHaveCount(0);
  await press(question.getByRole('button', { name: 'Convert anyway' }));
  await expect(page.getByText(/so they were removed/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toHaveCount(0);
  await expect(sourceQuestion(page, TARGET_SENTENCE)).toHaveCount(0);
});

test('a file its source reads with a stray part converts without a question', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('stray-part.mid', [
    ...Array.from({ length: 6 }, () => ({ channel: DRUMS, key: 24, gap: 48 })),
    ...Array.from({ length: 4 }, () => ({ channel: DRUMS, key: 26, gap: 48 })),
    ...Array.from({ length: 8 }, () => ({ channel: DRUMS, key: STRAY, gap: 48 })),
  ]));
  await expect(page.getByRole('status').filter({ hasText: /doesn't know 8 of the 18 notes in your file/ })).toBeVisible();
  await convert(page);
  await expect(sourceQuestion(page)).toHaveCount(0);
});

test('the target line swaps the pair from the done card', async ({ page }) => {
  await openHalpernTo(page, 'superior_drummer3', toontrackGroove(2));
  await convertAnyway(page);
  await press(doneButton(page, `Convert the other way: Superior Drummer 3 → ${HALPERN}`));
  await expect(chosenEngine(page, 'FROM')).toHaveText('Superior Drummer 3');
  await expect(chosenEngine(page, 'TO')).toHaveText(HALPERN);
  await expect(page.getByRole('heading', { name: `1 file converted → ${HALPERN}` })).toBeVisible();
  await expect(page.getByText('Read as Superior Drummer 3.')).toBeVisible();
  await expect(page.getByRole('button', { name: `Back to ${HALPERN} → Superior Drummer 3` })).toBeVisible();
  expect(hitKeys(await download(page))).toHaveLength(18);
});

test('a file too short for the advice to name an engine is told only what its source misses', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the advice, not the layout');
  await page.goto('/?from=ggd_invasion_halpern&to=general_midi');
  await addFiles(page, toontrackGroove(1));
  await convert(page);
  await expect(doneCard(page).getByText(`9 notes in your file aren't in the ${HALPERN} layout, so they were removed. Wrong source?`)).toBeVisible();
  await expect(doneCard(page).getByRole('button', { name: 'Pick another source' })).toBeVisible();
  await expect(doneCard(page).getByRole('button', { name: /^Convert again from / })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toHaveCount(0);
});

const GM_SENTENCE = new RegExp(`doesn't know any of the 18 notes in your file\\. ${SUGGESTED} knows every note\\.`);

/** Opens GGD Invasion (Halpern) to General MIDI with the 18-hit Toontrack groove and presses Convert. */
async function askForSuggested(page: Page) {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await press(page.getByRole('button', { name: 'Convert 1 file to General MIDI' }));
  return sourceQuestion(page, GM_SENTENCE);
}

test('Use E makes E the source and converts nothing', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await expect(page.getByText(`${SUGGESTED} knows every note.`)).toBeVisible();
  await press(page.getByRole('button', { name: `Use ${SUGGESTED}` }));
  await expect(chosenEngine(page, 'FROM')).toHaveText(SUGGESTED);
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /files? converted/ })).toHaveCount(0);
  await seen(page.getByRole('button', { name: 'Convert 1 file to General MIDI' }));
});

test('the question for a suggested engine converts as it', async ({ page }) => {
  const question = await askForSuggested(page);
  await expect(question.getByRole('button')).toHaveText([`Convert as ${SUGGESTED}`, 'Convert anyway']);
  await press(question.getByRole('button', { name: `Convert as ${SUGGESTED}` }));
  await expect(page.getByRole('heading', { name: /^1 file converted → General MIDI/ })).toBeVisible();
  await expect(page.getByText(`Read as ${SUGGESTED}.`)).toBeVisible();
  await expect(chosenEngine(page, 'FROM')).toHaveText(SUGGESTED);
  expect(hitKeys(await download(page))).toContain(KICK);
});

test('Escape takes the question away and Convert asks again', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a keyboard rule');
  const question = await askForSuggested(page);
  await expect(question).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(question).toHaveCount(0);
  const convertToGm = page.getByRole('button', { name: 'Convert 1 file to General MIDI' });
  await seen(convertToGm);
  await expect(convertToGm).toBeFocused();
  await press(convertToGm);
  await expect(question).toBeVisible();
});

test('an answered question is not asked again', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the question, not the layout');
  const question = await askForSuggested(page);
  await press(question.getByRole('button', { name: 'Convert anyway' }));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  await openSettings(page);
  await press(page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }));
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('heading', { name: /files? converted/ })).toHaveCount(0);
  await press(page.getByRole('button', { name: 'Convert 1 file to General MIDI' }));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  await expect(sourceQuestion(page)).toHaveCount(0);
});

test('a change of the pair closes the question', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the question, not the layout');
  const question = await askForSuggested(page);
  await expect(question).toBeVisible();
  await pickEngine(page, 'TO', 'Superior', 'Superior Drummer 3');
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toBeVisible();
  await expect(sourceQuestion(page)).toHaveCount(0);
  await seen(page.getByRole('button', { name: 'Convert 1 file to Superior Drummer 3' }));
});

test('the done card\'s Pick another source opens the FROM picker', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await convertAnyway(page);
  await press(doneButton(page, 'Pick another source'));
  const picker = enginePicker(page, 'FROM');
  const filter = picker.getByRole('combobox', { name: 'Filter FROM engines' });
  await seen(filter);
  await expect(filter).toBeFocused();
  await filter.fill('EZdrummer 3');
  await press(picker.getByRole('option', { name: SUGGESTED, exact: true }));
  await expect(picker).toBeHidden();
  await expect(chosenEngine(page, 'FROM')).toHaveText(SUGGESTED);
  await expect(doneCard(page)).toHaveCount(0);
  await seen(page.getByRole('button', { name: 'Convert 1 file to General MIDI' }));
});

test('the done card\'s Assign the notes opens Advanced on the unknown notes', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await convertAnyway(page);
  await press(doneButton(page, 'Assign the notes'));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(advanced(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const first = page.locator(`[data-source-note="${TOONTRACK_NOTES[0]}"]`);
  await seen(first);
  await expect(first.getByRole('button').first()).toBeFocused();
  await expect(page.locator('[data-source-note]').filter({ hasText: 'unmapped' })).toHaveCount(TOONTRACK_NOTES.length);
});

async function convertKeepingTheStray(page: Page) {
  await openPair(page);
  await addStray(page);
  await openSettings(page);
  await press(page.getByRole('radiogroup', { name: 'Unknown notes' }).getByText('Keep as they are', { exact: true }));
  await convert(page);
}

test('a kept note is in the file', async ({ page }) => {
  await convertKeepingTheStray(page);
  expect(hitKeys(await download(page))).toEqual([36, STRAY]);
});

test('a kept note is named with the drum it plays', async ({ page }) => {
  await convertKeepingTheStray(page);
  const card = doneCard(page);
  await expect(card.getByText(/so it stayed on its note number/)).toBeVisible();
  await expect(card.getByText('1 of them now plays this EZdrummer 3 drum: C#3 Crash 2.')).toBeVisible();
  await press(page.getByRole('button', { name: /View report/ }));
  await expect(page.getByRole('dialog', { name: 'Conversion report' }).getByText('plays Crash 2 on EZdrummer 3')).toBeVisible();
});

test('the advice goes while source notes are edited', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about the advice, not the layout');
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await openEditor(page);
  await press(advanced(page));
  await page.getByRole('textbox', { name: 'Add source note' }).fill(String(KICK));
  await press(page.getByRole('button', { name: 'add', exact: true }));
  const picker = page.getByRole('dialog', { name: /^Canon for / });
  await press(picker.getByRole('button', { name: /^Kick\s*kick\.main$/ }));
  await expect(picker).toBeHidden();
  await leaveEditor(page);
  await expect(page.getByRole('status').filter({ hasText: /in your file\./ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Use ${SUGGESTED}` })).toHaveCount(0);
});

test('the question\'s buttons stack across the card on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'a phone layout');
  const question = await askForSuggested(page);
  await seen(question);
  await expect(question.getByRole('button')).toHaveCount(2);
  const [first, second] = await Promise.all((await question.getByRole('button').all()).map(async (b) => (await b.boundingBox())!));
  expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(1);
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
});
