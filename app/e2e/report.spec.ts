import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, hitKeys, kickAndChina, midFile, openPair, test } from './fixtures';
import { convert, convertBand, download, leaveEditor, openSettings, press, seen, targetNote } from './steps';

const inside = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));

async function tab(page: Page) {
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() =>
    document.activeElement?.hasAttribute('data-floating-ui-focus-guard'),
  )).toBe(false);
}

test('the open report traps focus', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  await expect.poll(() => inside(page)).toBe(true);
  for (let i = 0; i < 8; i += 1) {
    await tab(page);
    expect(await inside(page)).toBe(true);
  }
});

test('the open report locks the page scroll', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  expect(await page.evaluate(() =>
    [document.body, document.documentElement].some((el) => getComputedStyle(el).overflow === 'hidden'),
  )).toBe(true);
});

test('Escape closes the report and gives focus back to its button', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');
  await open.click();
  await report.waitFor();

  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();
});

test('a click outside closes the report and gives focus back to its button', async ({ page }) => {
  await convertBand(page);
  const open = page.getByRole('button', { name: /View report/ });
  const report = page.getByRole('dialog');

  await open.click();
  await expect(report).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();

  await open.click();
  await expect(report).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();
});

test('the report sends untouched notes to the drum channel setting', async ({ page }) => {
  await convertBand(page);
  await page.getByRole('button', { name: /View report/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Drum channel/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('settings-fold')).toHaveAttribute('open', '');
  const channel = page.getByRole('combobox', { name: 'Drum channel' });
  await seen(channel);
  await expect(channel).toBeFocused();
});

test('Pick a target opens that drum\'s note picker in view', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await openSettings(page);
  await press(page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }));
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await convert(page);
  await press(page.getByRole('button', { name: /View report/ }));
  const report = page.getByRole('dialog', { name: 'Conversion report' });
  await expect(report.getByText('China 1', { exact: true })).toBeVisible();
  await press(report.getByRole('button', { name: 'Pick a target →' }));
  const picker = page.getByRole('dialog', { name: 'Target note for China 1' });
  await seen(picker);
  await press(picker.getByRole('button', { name: 'Crash 2 C#3', exact: true }));
  await expect(targetNote(page, 'China 1')).toHaveText('C#3');
  await leaveEditor(page);
  await convert(page);
  expect(hitKeys(await download(page))).toEqual([36, 49]);
});

/** Converts two files with a China each and opens the report: its button, and the report. */
async function reportOfTwoFiles(page: Page) {
  await openPair(page);
  await addFiles(
    page,
    midFile('a.mid', [{ channel: DRUMS, key: 24 }, { channel: DRUMS, key: 65, gap: 48 }]),
    midFile('b.mid', [{ channel: DRUMS, key: 65 }]),
  );
  await convert(page, 2);
  const open = page.getByRole('button', { name: /View report/ });
  await press(open);
  return { open, report: page.getByRole('dialog', { name: 'Conversion report' }) };
}

test('several files are summed and listed one by one in the report', async ({ page }) => {
  const { report } = await reportOfTwoFiles(page);
  await expect(report.getByText('2 approximated across 2 files', { exact: true })).toBeVisible();
  await expect(report.getByText('a-ezdrummer.mid', { exact: true })).toBeVisible();
  await expect(report.getByText('b-ezdrummer.mid', { exact: true })).toBeVisible();
});

test('× closes the report and hands focus back to its button', async ({ page }) => {
  const { open, report } = await reportOfTwoFiles(page);
  await press(report.getByRole('button', { name: 'Close' }));
  await expect(report).toBeHidden();
  await expect(open).toBeFocused();
});
