import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const side = (page: Page, name: 'FROM' | 'TO') => page.getByRole('group', { name: `${name} engine` });

test('picks FROM and TO engines by filtering the lists, then swaps them', async ({ page }) => {
  await page.goto('/');
  const from = side(page, 'FROM');
  const to = side(page, 'TO');
  const swap = page.getByRole('button', { name: 'Swap FROM and TO' });
  await expect(swap).toBeDisabled();

  const fromFilter = from.getByRole('combobox', { name: 'Filter FROM engines' });
  await fromFilter.fill('invasion');
  await expect(from.getByRole('option', { name: 'EZdrummer 3', exact: true })).toHaveCount(0);
  await from.getByRole('option', { name: 'GetGood Drums Invasion', exact: true }).click();
  await expect(from.getByTestId('chosen-engine')).toHaveText('GetGood Drums Invasion');
  await expect(fromFilter).toHaveValue('');

  await to.getByRole('combobox', { name: 'Filter TO engines' }).fill('ezdrummer');
  await expect(to.getByRole('option', { name: 'GetGood Drums Invasion', exact: true })).toHaveCount(0);
  await to.getByRole('option', { name: 'EZdrummer 3', exact: true }).click();
  await expect(to.getByTestId('chosen-engine')).toHaveText('EZdrummer 3');
  await expect(from.getByRole('option', { name: 'EZdrummer 3', exact: true }))
    .toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: /of \d+ drums remapped/ })).toBeVisible();

  await swap.click();
  await expect(from.getByTestId('chosen-engine')).toHaveText('EZdrummer 3');
  await expect(to.getByTestId('chosen-engine')).toHaveText('GetGood Drums Invasion');
  await expect(from.getByRole('option', { name: 'EZdrummer 3', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
});

test('a starred engine is listed under Favourites and stays there after a reload', async ({ page }) => {
  await page.goto('/');
  const to = side(page, 'TO');
  await to.getByTestId('star-ezdrummer').click();

  const favourites = to.getByRole('group', { name: 'Favourites' });
  await expect(favourites.getByRole('option')).toHaveCount(1);
  await expect(favourites.getByRole('option', { name: 'EZdrummer 3', exact: true })).toBeVisible();
  await expect(side(page, 'FROM').getByRole('group', { name: 'Favourites' })).toHaveCount(0);

  await page.reload();
  await expect(favourites.getByRole('option', { name: 'EZdrummer 3', exact: true })).toBeVisible();
  await expect(side(page, 'FROM').getByRole('group', { name: 'Favourites' })).toHaveCount(0);

  await to.getByTestId('star-ezdrummer').click();
  await expect(favourites).toHaveCount(0);
});
