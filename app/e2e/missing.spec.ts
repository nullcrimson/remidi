import type { Locator, Page } from '@playwright/test';
import { addFiles, expect, hitKeys, kickAndChina, openPair, test } from './fixtures';
import { convert, download as downloadFile } from './steps';

const moved = /^\d+ drums? played on another drum$/;

const download = async (page: Page) => hitKeys(await downloadFile(page));

async function detailLeadsToIssues(page: Page, opener: Locator, heading: string | RegExp) {
  const detail = page.getByRole('dialog');
  await opener.click();
  await expect(detail.getByText(heading)).toBeVisible();
  await expect(detail.getByText(/China/).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();

  await opener.click();
  await detail.getByRole('button', { name: 'Change in note editor →' }).click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Issues [1-9]/ })).toBeChecked();
}

test('leaving missing drums out changes the hint and the converted file', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await expect(page.getByRole('button', { name: moved })).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('button', { name: /^\d+ drums? dropped$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: moved })).toHaveCount(0);

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
  await report.getByRole('button', { name: 'Drop missing drums & convert again' }).click();
  await expect(report).toBeHidden();
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Drop missing drums & convert again' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeVisible();
  expect(await download(page)).toEqual([36]);
});

test('the remapped count explains each drum and opens the editor on the issues', async ({ page }) => {
  await openPair(page);
  await detailLeadsToIssues(
    page,
    page.getByRole('button', { name: /^\d+ of \d+ drums remapped$/ }),
    /^\d+ drums in this mapping$/,
  );
});

test('the missing drums hint lists the drums played elsewhere and opens the editor on them', async ({ page }) => {
  await openPair(page);
  await detailLeadsToIssues(page, page.getByRole('button', { name: moved }), 'Played on another drum');
});
