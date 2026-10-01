import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { press } from './steps';

const chosen = (page: Page, side: 'FROM' | 'TO') =>
  page.getByRole('group', { name: `${side} engine` }).getByTestId('chosen-engine');

test('an engine page converts to that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert to EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/?to=ezdrummer');
  await expect(chosen(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(chosen(page, 'FROM')).toHaveCount(0);
});

test('an engine page converts from that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert from EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/?from=ezdrummer');
  await expect(chosen(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosen(page, 'TO')).toHaveCount(0);
});

test('a conversion table opens the converter with both of its engines', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert GetGood Drums Invasion → EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/?from=ggd_invasion&to=ezdrummer');
  await expect(chosen(page, 'FROM')).toHaveText('GetGood Drums Invasion');
  await expect(chosen(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(page.getByRole('button', { name: /^\d+ of \d+ drums remapped$/ })).toBeVisible();
});
