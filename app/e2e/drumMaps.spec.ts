import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Download, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const golden = (extension: string) =>
  readFile(fileURLToPath(new URL(`../../midiremap-core/tests/golden/ggd_invasion.${extension}`, import.meta.url)), 'utf8');

async function downloadOf(page: Page, name: string): Promise<Download> {
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name, exact: true }).first().click();
  return download;
}

const pickDaw = (page: Page, daw: string) => page.getByRole('radiogroup', { name: 'Your DAW' }).getByText(daw, { exact: true }).click();

const textOf = async (download: Download) => readFile((await download.path()), 'utf8');

test('an engine page downloads its Reaper note names under a readable name', async ({ page }) => {
  await page.goto('/engines/ggd-invasion/');
  const download = await downloadOf(page, 'GetGood Drums Invasion drum map for Reaper');
  expect(download.suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).txt');
  expect(await textOf(download)).toBe(await golden('txt'));
});

test('an engine page downloads its Studio One pitch list', async ({ page }) => {
  await page.goto('/engines/ggd-invasion/');
  const download = await downloadOf(page, 'GetGood Drums Invasion drum map for Studio One');
  expect(download.suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).pitchlist');
  expect(await textOf(download)).toBe(await golden('pitchlist'));
});

test('the drum maps page downloads a Cubase drum map', async ({ page }) => {
  await page.goto('/drum-maps/');
  await pickDaw(page, 'Cubase');
  const download = await downloadOf(page, 'GetGood Drums Invasion drum map for Cubase');
  expect(download.suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).drm');
  expect(await textOf(download)).toBe(await golden('drm'));
});

test('an engine page links the guide to loading drum maps', async ({ page }) => {
  await page.goto('/engines/ggd-invasion/');
  await page.getByRole('link', { name: 'How to load a drum map in Reaper, Cubase or Studio One' }).click();
  await expect(page).toHaveURL('/drum-maps/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('DAW drum maps');
});

test('the drum maps page filters its engines', async ({ page }) => {
  await page.goto('/drum-maps/');
  await page.getByRole('searchbox', { name: 'Filter engines' }).fill('invasion');
  await expect(page.getByRole('link', { name: 'GetGood Drums Invasion drum map for Reaper' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Superior Drummer 3 drum map for Reaper' })).toHaveCount(0);
});

test('the drum maps page shows only the picked DAW’s files and how to load them', async ({ page }) => {
  await page.goto('/drum-maps/');
  const reaper = page.getByRole('link', { name: 'EZdrummer 3 drum map for Reaper' }).first();
  const studioOne = page.getByRole('link', { name: 'EZdrummer 3 drum map for Studio One' }).first();
  await expect(reaper).toBeVisible();
  await expect(studioOne).toBeHidden();

  await pickDaw(page, 'Studio One');
  await expect(studioOne).toBeVisible();
  await expect(reaper).toBeHidden();
  await expect(page.getByText('Pitch Names', { exact: false })).toBeVisible();
  await expect(page.getByText('Load note/CC names from file', { exact: false })).toBeHidden();
});

test('the footer links the drum maps page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Drum maps' }).click();
  await expect(page).toHaveURL('/drum-maps/');
});
