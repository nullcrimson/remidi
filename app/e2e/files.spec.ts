import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import type { Page } from '@playwright/test';
import { addFiles, cut, DRUMS, expect, hitKeys, kick, midFile, openPair, test } from './fixtures';
import { chosenEngine, convert, convertButton, doneBadge, doneCard, download, engineCard, pickEngine, press, seen } from './steps';

async function choose(page: Page, ...files: ReturnType<typeof midFile>[]) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Choose files/ }).click();
  await (await chooser).setFiles(files);
}

test('Choose files lists the picked files and enables Convert', async ({ page }) => {
  await openPair(page);
  const convert = convertButton(page);
  await expect(convert).toBeDisabled();

  await choose(page, kick('one.mid'), kick('two.mid'));
  await expect(page.getByText('one.mid', { exact: true })).toBeVisible();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();
});

test('a file set on the input found before the first file arrived is listed', async ({ page }) => {
  await openPair(page);
  const found = await page.getByTestId('file-input').elementHandle();
  await addFiles(page, kick('one.mid'));
  await expect(page.getByText('one.mid', { exact: true })).toBeVisible();

  await found.setInputFiles(kick('two.mid'));
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(page.getByText('one.mid', { exact: true })).toBeVisible();
});

test('a picked file is removed on its own', async ({ page }) => {
  await openPair(page);
  const convert = convertButton(page);
  await choose(page, kick('one.mid'), kick('two.mid'));
  await page.getByText('two.mid', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Remove one.mid' }).click();
  await expect(page.getByText('one.mid', { exact: true })).toBeHidden();
  await expect(page.getByText('two.mid', { exact: true })).toBeVisible();
  await expect(convert).toBeEnabled();
});

test('clear all empties the file list and disables Convert', async ({ page }) => {
  await openPair(page);
  const convert = convertButton(page);
  await choose(page, kick('one.mid'), kick('two.mid'));
  await page.getByText('two.mid', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'clear all' }).click();
  await expect(page.getByText('two.mid', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: /Choose files/ })).toBeVisible();
  await expect(convert).toBeDisabled();
});

test('Convert more leaves the done panel for an empty converter with the same engines', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await convertButton(page).click();
  const done = page.getByRole('heading', { name: /1 file converted/ });
  await expect(done).toBeVisible();

  await page.getByRole('button', { name: 'Convert more' }).click();
  await expect(done).toBeHidden();
  await expect(page.getByText('kick.mid', { exact: true })).toBeHidden();
  await expect(convertButton(page)).toBeDisabled();
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
});

test('a file added after Convert more converts again', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await convertButton(page).click();
  const done = page.getByRole('heading', { name: /1 file converted/ });
  await done.waitFor();
  await page.getByRole('button', { name: 'Convert more' }).click();
  await done.waitFor({ state: 'hidden' });

  await choose(page, kick('again.mid'));
  await convertButton(page).click();
  await expect(done).toBeVisible();
});

const sample = (page: Page) => page.getByRole('button', { name: 'Try it with a sample groove' });

test('the sample groove waits for a FROM engine and says so', async ({ page }) => {
  await page.goto('/');
  await expect(sample(page)).toBeDisabled();
  await expect(sample(page)).toHaveAccessibleDescription('Pick a FROM engine first');
  await expect(page.getByText('Pick a FROM engine first', { exact: true })).toBeVisible();

  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await expect(sample(page)).toBeEnabled();
});

test('the sample groove adds its file and moves on to the TO engine', async ({ page }) => {
  await page.goto('/');
  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await press(sample(page));
  await expect(page.getByText('sample-GGD.mid', { exact: true })).toBeVisible();
  await expect(engineCard(page, 'TO')).toBeFocused();
});

test('the sample groove converts at once when both engines are chosen', async ({ page }) => {
  await openPair(page);
  await press(sample(page));
  await expect(page.getByRole('heading', { name: '1 file converted → EZdrummer 3' })).toBeVisible();
  expect(hitKeys(await download(page)).length).toBeGreaterThan(0);
});

const garbage = (name: string) => ({ name, mimeType: 'audio/midi', buffer: Buffer.from('not a midi file') });

const chip = (page: Page, name: string) => page.locator('[data-state]').filter({ hasText: name });

test('one bad file in a batch is named and the good one downloads', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'), garbage('bad.mid'));
  await expect(chip(page, 'bad.mid')).toContainText('unreadable');
  await press(convertButton(page));
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  const card = doneCard(page);
  await expect(card.getByRole('listitem').filter({ hasText: /^1 note converted$/ })).toBeVisible();
  await expect(card.getByRole('listitem').filter({ hasText: /^1 failed$/ })).toBeVisible();
  const files = page.getByRole('list', { name: 'Converted files' });
  await expect(files.getByRole('listitem').filter({ hasText: 'bad.mid' })).toContainText('Not a MIDI file this converter can read');
  await expect(chip(page, 'bad.mid')).toContainText('unreadable');
  expect(hitKeys(await download(page, files.getByRole('link', { name: '↓ .mid' })))).toEqual([36]);
});

test('an empty file is refused with its reason', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about files, not the layout');
  await openPair(page);
  await addFiles(page, { name: 'empty.mid', mimeType: 'audio/midi', buffer: Buffer.alloc(0) });
  await press(page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' }));
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Not a MIDI file this converter can read');
  await expect(page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' })).toBeVisible();
  await press(page.getByRole('button', { name: 'Remove empty.mid' }));
  await expect(alert).toHaveCount(0);
});

test('a .midi file converts like a .mid', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('one.midi'));
  await expect(chip(page, 'one.midi')).toBeVisible();
  await convert(page);
  expect(hitKeys(await download(page))).toEqual([36]);
});

test('add more appends to the files', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('one.mid'));
  const chooser = page.waitForEvent('filechooser');
  await press(page.getByText('+ add more', { exact: true }));
  await (await chooser).setFiles([kick('two.mid')]);
  await expect(chip(page, 'one.mid')).toBeVisible();
  await expect(chip(page, 'two.mid')).toBeVisible();
  await press(page.getByRole('button', { name: 'Convert 2 files to EZdrummer 3', exact: true }));
  const zipped = page.waitForEvent('download');
  await press(page.getByRole('button', { name: /Download 2 files \(\.zip\)/ }));
  const zip = unzipSync(await readFile(await (await zipped).path()));
  expect(Object.keys(zip).sort()).toEqual(['one-ezdrummer.mid', 'two-ezdrummer.mid']);
});

test('a file added again under a listed name replaces it and says so', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about files, not the layout');
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await convert(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 26, gap: 48 }]));
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(1);
  await expect(page.getByText('Replaced kick.mid with the file you just added.')).toBeVisible();
  await convert(page);
  expect(hitKeys(await download(page))).toEqual([36, 38]);
});

test('a file with no drum notes says so on a warning card', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('silent.mid', []));
  await convert(page);
  await expect(doneBadge(page, 'Warning')).toBeVisible();
  await expect(doneCard(page).getByRole('listitem').filter({ hasText: /^nothing converted$/ })).toBeVisible();
  await press(page.getByRole('button', { name: /View report/ }));
  await expect(page.getByRole('dialog', { name: 'Conversion report' })).toContainText('Nothing was converted — no drum notes found in this file.');
});

test('a damaged file converts as far as it goes and says what was missing', async ({ page }) => {
  await openPair(page);
  await addFiles(page, cut(midFile('cut.mid', [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 26, gap: 48 }]), 6));
  await convert(page);
  const card = doneCard(page);
  await expect(card.getByText('cut.mid was damaged: part of it was missing, and everything it still held was converted.', { exact: true })).toBeVisible();
  await expect(card.getByText(/^Track 1 stops at bar 1/)).toBeVisible();
  expect(hitKeys(await download(page))).toEqual([36, 38]);
});

test('a file added while the result shows takes the result away', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about files, not the layout');
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await convert(page);
  await addFiles(page, kick('other.mid'));
  await expect(doneCard(page)).toHaveCount(0);
  await seen(page.getByRole('button', { name: 'Convert 2 files to EZdrummer 3', exact: true }));
});

test('a reload empties the file list and keeps the engines', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a rule about what is kept, not the layout');
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await expect(chip(page, 'kick.mid')).toBeVisible();
  await page.goto('/');
  await seen(page.getByRole('button', { name: /Choose files/ }));
  await expect(chosenEngine(page, 'FROM')).toHaveText('GetGood Drums Invasion');
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
});
