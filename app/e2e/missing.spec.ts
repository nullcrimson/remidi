import type { Page } from '@playwright/test';
import { addFiles, expect, hitKeys, kickAndChina, openPair, test } from './fixtures';
import { convert, download as downloadFile, openSettings, press, REMAPPED, seen } from './steps';

const moved = /^\d+ drums? played on another drum$/;

const download = async (page: Page) => hitKeys(await downloadFile(page));

test('leaving missing drums out changes the hint', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await openSettings(page);
  await expect(page.getByRole('button', { name: moved })).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('button', { name: /^\d+ drums? dropped$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: moved })).toHaveCount(0);
});

test('leaving missing drums out changes the converted file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await openSettings(page);
  await page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }).click();
  await page.getByRole('radio', { name: 'Drop' }).waitFor();

  await convert(page);
  expect(await download(page)).toEqual([36]);
});

test('the report drops missing drums and converts again', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await convert(page);
  const nearest = await download(page);
  expect(nearest).toHaveLength(2);
  expect(nearest[0]).toBe(36);

  await page.getByRole('button', { name: /View report/ }).click();
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await expect(report.getByText('Approximated', { exact: true })).toBeVisible();
  await expect(report.getByText('· played on the nearest drum', { exact: true })).toBeVisible();
  await expect(report.getByText(/^China 1 → /)).toBeVisible();
  await expect(report.getByRole('button', { name: 'Pick a target →' })).toHaveCount(0);
  await report.getByRole('button', { name: 'Drop missing drums & convert again' }).click();
  await expect(report).toBeHidden();
  await openSettings(page);
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Drop missing drums & convert again' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeVisible();
  expect(await download(page)).toEqual([36]);
});

const remapped = (page: Page) => page.getByRole('button', { name: REMAPPED });
const movedHint = (page: Page) => page.getByRole('button', { name: moved });

test('the remapped count explains each drum', async ({ page }) => {
  await openPair(page);
  const detail = page.getByRole('dialog');
  await remapped(page).click();
  await expect(detail.getByText(/^\d+ drums in this mapping$/)).toBeVisible();
  await detail.locator('summary').filter({ hasText: 'played on another drum' }).click();
  await expect(detail.getByText(/China/).first()).toBeVisible();
});

test('Escape closes the remapped count detail', async ({ page }) => {
  await openPair(page);
  const detail = page.getByRole('dialog');
  await remapped(page).click();
  await detail.waitFor();

  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await expect(remapped(page)).toBeFocused();
});

/** Opens the settings and presses the Missing drums label: its tip. */
async function missingDrumsTip(page: Page) {
  await openPair(page);
  await openSettings(page);
  await press(page.getByTestId('settings-fold').locator('.cursor-help').filter({ hasText: /^Missing drums$/ }));
  return page.getByRole('tooltip');
}

test('a setting\'s tip opens on a press', async ({ page }) => {
  const tip = await missingDrumsTip(page);
  await seen(tip);
  await expect(tip).toContainText('When the target lacks a drum');
  await expect(tip).toContainText('Nearest plays it on the closest drum the target has');
});

test('a setting\'s tip closes on Escape', async ({ page }) => {
  const tip = await missingDrumsTip(page);
  await seen(tip);
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
});

test('the remapped count opens the editor on the issues', async ({ page }) => {
  await openPair(page);
  const detail = page.getByRole('dialog');
  await remapped(page).click();
  await detail.waitFor();
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await remapped(page).click();
  await detail.getByRole('button', { name: 'Change in note editor →' }).click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Issues [1-9]/ })).toBeChecked();
});

test('the missing drums hint lists the drums played elsewhere', async ({ page }) => {
  await openPair(page);
  await openSettings(page);
  const detail = page.getByRole('dialog');
  await movedHint(page).click();
  await expect(detail.getByText('Played on another drum')).toBeVisible();
  await expect(detail.getByText(/China/).first()).toBeVisible();
});

test('the missing drums hint opens the editor on the issues', async ({ page }) => {
  await openPair(page);
  await openSettings(page);
  const detail = page.getByRole('dialog');
  await movedHint(page).click();
  await detail.waitFor();
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await movedHint(page).click();
  await detail.getByRole('button', { name: 'Change in note editor →' }).click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Issues [1-9]/ })).toBeChecked();
});

test('the folded settings name a changed value on their line', async ({ page }) => {
  await openPair(page);
  const fold = page.getByTestId('settings-fold');
  const missing = page.getByRole('radiogroup', { name: 'Missing drums' });
  await expect(missing).toBeHidden();
  await expect(fold.locator('summary')).toContainText('Missing drums Nearest');

  await openSettings(page);
  await press(missing.getByText('Drop', { exact: true }));
  await press(fold.locator('summary'));
  await expect(missing).toBeHidden();
  await expect(fold.locator('summary')).toContainText('Missing drums Drop');
});
