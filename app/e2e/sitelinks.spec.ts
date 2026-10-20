import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { press } from './steps';

const chosen = (page: Page, side: 'FROM' | 'TO') =>
  page.getByRole('group', { name: `${side} engine` }).getByTestId('chosen-engine');

test('an engine page converts to that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert to EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#to=ezdrummer');
  await expect(chosen(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(chosen(page, 'FROM')).toHaveCount(0);
});

test('an engine page converts from that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert from EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#from=ezdrummer');
  await expect(chosen(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosen(page, 'TO')).toHaveCount(0);
});

test('a conversion table opens the converter with both of its engines', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert GetGood Drums Invasion → EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#from=ggd_invasion&to=ezdrummer');
  await expect(chosen(page, 'FROM')).toHaveText('GetGood Drums Invasion');
  await expect(chosen(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(page.getByRole('button', { name: /^\d+ of \d+ drums remapped$/ })).toBeVisible();
});

test('the converter links a popular conversion table behind a fold', async ({ page }) => {
  await page.goto('/');
  const popular = page.getByRole('navigation', { name: 'Popular conversions' });
  await press(popular.locator('summary'));
  await press(popular.getByRole('link', { name: 'GetGood Drums Invasion to EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Convert GetGood Drums Invasion MIDI to EZdrummer 3');
});

test('an engine without hub pairs links its conversion table to EZdrummer', async ({ page }) => {
  await page.goto('/engines/hertz/');
  await press(page.getByRole('link', { name: '→ EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/convert/hertz-to-ezdrummer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Convert Hertz Drums MIDI to EZdrummer 3');
});

test('a conversion table without a page the other way reverses in the converter', async ({ page }) => {
  await page.goto('/convert/hertz-to-ezdrummer/');
  await press(page.getByRole('link', { name: '⇄ Reverse direction', exact: true }));
  await expect(page).toHaveURL('/#from=ezdrummer&to=hertz');
  await expect(chosen(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosen(page, 'TO')).toHaveText('Hertz Drums');
});
