import { readFile } from 'node:fs/promises';
import type { Download, Locator, Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { englishPattern, messages } from './messages';

type Messages = ReturnType<typeof messages>;

const english = messages('en');

/** The plan summary's count of the source's drums the target has, for any pair and counts. */
export const REMAPPED = englishPattern('summary-remapped', { remapped: 'number', total: 'number', source: 'text', target: 'text' });

const sideName = (side: 'FROM' | 'TO', m: Messages) => m(side === 'FROM' ? 'engine-from' : 'engine-to');

/**
 * Whether the user sees `target`: shown, and inside the window but for a fraction of a pixel,
 * which Chromium's intersection rounding can leave at an edge. For things smaller than the window.
 */
export async function seen(target: Locator) {
  await expect(target).toBeVisible();
  await expect(target).toBeInViewport({ ratio: 0.99 });
}

/** Whether focus stayed on the page's content: inside `main`, and not thrown to the body. */
export async function focusHeld(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const active = document.activeElement;
    return active !== null && active !== document.body && active.closest('main') !== null;
  })).toBe(true);
}

/** The done card, by its heading. */
export const doneCard = (page: Page) =>
  page.locator('[data-tone]').filter({ has: page.getByRole('heading', { name: /converted/ }) });

/** The badge atop the done card, named for its tone. */
export const doneBadge = (page: Page, name: 'Warning' | 'Done') => doneCard(page).getByRole('img', { name, exact: true });

/** The question Convert asks about the source, named by its sentence. */
export const sourceQuestion = (page: Page, sentence: RegExp = /in your file\./) => page.getByRole('group', { name: sentence });

/** Opens GGD Invasion (Halpern) to `to` with `file`, and waits for the notice. */
export async function openHalpernTo(page: Page, to: string, file: ReturnType<typeof midFile>) {
  await page.goto(`/?from=ggd_invasion_halpern&to=${to}`);
  await addFiles(page, file);
  await expect(page.getByRole('status').filter({ hasText: /doesn't know any of the \d+ notes in your file\./ })).toBeVisible();
}

/** Presses Tab, at most `most` times, until `target` has focus. */
export async function tabTo(page: Page, target: Locator, most = 10) {
  for (let i = 0; i < most; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

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

/** One side of the conversion, labelled in the language of `m`: its card, its favourites and, once open, its picker. */
export const engineSide = (page: Page, side: 'FROM' | 'TO', m = english) =>
  page.getByRole('group', { name: m('library-group', { side: sideName(side, m) }) });

export const engineCard = (page: Page, side: 'FROM' | 'TO', m = english) =>
  engineSide(page, side, m).getByRole('button', { name: new RegExp(`^${sideName(side, m)}`) });

/** The name of the engine chosen on a side, shown on its card. */
export const chosenEngine = (page: Page, side: 'FROM' | 'TO') => engineSide(page, side).getByTestId('chosen-engine');

export const enginePicker = (page: Page, side: 'FROM' | 'TO', m = english) =>
  page.getByRole('dialog', { name: m('engine-picker-heading', { side: sideName(side, m) }) });

/** Opens a side's picker from its card, filters it and picks `engine`, in the language of `m`. */
export async function pickEngine(page: Page, side: 'FROM' | 'TO', filter: string, engine: string, m = english) {
  await press(engineCard(page, side, m));
  const picker = enginePicker(page, side, m);
  await picker.getByRole('combobox', { name: m('library-filter', { side: sideName(side, m) }) }).fill(filter);
  await press(picker.getByRole('option', { name: engine, exact: true }));
  await expect(picker).toBeHidden();
}

/** Unfolds the conversion settings, in any language. */
export async function openSettings(page: Page) {
  const fold = page.getByTestId('settings-fold');
  await expect(async () => {
    if (await fold.getAttribute('open') === null) await press(fold.locator('summary'));
    await expect(fold).toHaveAttribute('open', '', { timeout: 1000 });
  }).toPass();
}

/** Opens the language menu, in any language. */
export async function openLanguageMenu(page: Page) {
  await press(page.locator('#language-trigger'));
}

/** Switches to the language called `name` in its own language. */
export async function pickLanguage(page: Page, name: string) {
  await openLanguageMenu(page);
  await press(page.locator('#language-menu').getByRole('link', { name }));
}

/** Picks `action` from the menu of the saved preset called `name`. */
export async function chipMenu(page: Page, name: string, action: 'Rename' | 'Duplicate' | 'Export' | 'Ableton rack' | 'Delete') {
  await press(page.getByRole('button', { name: `More actions for ${name}`, exact: true }));
  await press(page.getByRole('menuitem', { name: action }));
}

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

/** Picks `note` as the drum's target in the note picker, by its button there: the note, or the drum the target plays on it and the note. */
export async function retarget(page: Page, drum: string, note: string, button = note) {
  await press(targetNote(page, drum));
  const picker = page.getByRole('dialog', { name: `Target note for ${drum}` });
  await press(picker.getByRole('button', { name: button, exact: true }));
  await expect(picker).toBeHidden();
  await expect(targetNote(page, drum)).toHaveText(note);
}

/** The Convert button, by any of the names it takes. */
export const convertButton = (page: Page) => page.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });

export async function convert(page: Page, files = 1) {
  await press(convertButton(page));
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

/** Exports the saved preset called `name` through its menu: the download it starts. */
export async function exportPreset(page: Page, name: string): Promise<Download> {
  const download = page.waitForEvent('download');
  await chipMenu(page, name, 'Export');
  return download;
}

/** The file the export of the saved preset called `name` saves. */
export async function exportedPreset(page: Page, name: string): Promise<Buffer> {
  return readFile(await (await exportPreset(page, name)).path());
}

/** Chooses `files` as preset files, all in one choice of files. */
export async function importPresets(page: Page, ...files: { name: string; text: string | Buffer }[]) {
  await page.getByTestId('file-input').setInputFiles(
    files.map(({ name, text }) => ({ name, mimeType: 'application/json', buffer: Buffer.from(text) })),
  );
}

/**
 * Fills the saved presets up to `count`: saves the Kick → E2 preset `name` through the screen,
 * exports it and imports the exported file `count - 1` times in one choice of files, so the
 * imports land as "`name` copy", "`name` copy 2" and on.
 */
export async function fillPresets(page: Page, name: string, count: number) {
  await saveKickPreset(page, name);
  const text = await exportedPreset(page, name);
  await importPresets(page, ...Array.from({ length: count - 1 }, () => ({ name: `${name}.json`, text })));
}

const drumsAndBass = () => midFile(
  'band.mid',
  [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 65 }],
  [{ channel: 1, key: 40 }],
);

/** Converts a file with a drum track and a bass track for GetGood Drums Invasion → EZdrummer. */
export async function convertBand(page: Page) {
  await openPair(page);
  await addFiles(page, drumsAndBass());
  await convert(page);
}
