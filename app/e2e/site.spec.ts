import { expect, test } from './fixtures';

test('the engine list filters as you type', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });
  const list = page.locator('#engines');
  const ezdrummer = list.getByRole('link', { name: 'EZdrummer 3' });
  const bfd = list.getByRole('link', { name: /BFD3/ });

  await filter.fill('ezdrummer');
  await expect(ezdrummer).toBeVisible();
  await expect(bfd).toBeHidden();
});

test('the engine list says so when no engine matches', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });

  await filter.fill('no such kit');
  await expect(page.getByText('No engines match')).toBeVisible();
});

test('Escape clears the engine filter and brings the list back', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });
  const list = page.locator('#engines');
  const bfd = list.getByRole('link', { name: /BFD3/ });
  await filter.fill('no such kit');
  await page.getByText('No engines match').waitFor();

  await filter.press('Escape');
  await expect(filter).toHaveValue('');
  await expect(bfd).toBeVisible();
  await expect(page.getByText('No engines match')).toBeHidden();
});

test('a conversion table can show only the changes', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const rows = page.locator('tbody tr[data-outcome]');
  const exact = page.locator('tbody tr[data-outcome=exact]');

  await expect(exact.first()).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes').click();
  await expect(exact.first()).toBeHidden();
  await expect(rows.and(page.locator('[data-outcome=approximated]')).first()).toBeVisible();
});

test('a conversion table shows every row again on All', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const exact = page.locator('tbody tr[data-outcome=exact]');
  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes').click();
  await exact.first().waitFor({ state: 'hidden' });

  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('All').click();
  await expect(exact.first()).toBeVisible();
});

test('Changes hides a group with no change', async ({ page }) => {
  await page.goto('/convert/addictive-drums2-to-ezdrummer/');
  const kick = page.getByRole('rowheader', { name: 'Kick', exact: true });
  const cymbals = page.getByRole('rowheader', { name: 'Cymbals', exact: true });

  await expect(kick).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes').click();
  await expect(kick).toBeHidden();
  await expect(cymbals).toBeVisible();
});

test('a conversion table names notes in either octave naming', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const rows = page.locator('tbody tr[data-outcome]');
  const firstNote = rows.first().locator('td').first();

  const c1 = firstNote.locator('[data-oct=c1]');
  const c2 = firstNote.locator('[data-oct=c2]');
  await expect(c1).toBeVisible();
  await expect(c2).toBeHidden();
  await page.getByRole('radiogroup', { name: 'Octave naming' }).getByText('C-2').click();
  await expect(c1).toBeHidden();
  await expect(c2).toBeVisible();
  const lower = (name: string) => name.replace(/-?\d+$/, (n) => String(Number(n) - 1));
  expect(await c2.textContent()).toBe(lower((await c1.textContent())!));
});

test('a popular card opens its table', async ({ page }) => {
  await page.goto('/engines/');
  const card = page.getByRole('link', { name: /^GetGood Drums Invasion → EZdrummer 3 \d+ exact/ });
  await card.click();
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
});

test('filtering the engines puts the list right under the filter', async ({ page }) => {
  await page.goto('/engines/');
  const popular = page.getByRole('heading', { name: 'Popular conversions' });
  const quick = page.getByRole('list', { name: 'Most used engines' });
  await expect(popular).toBeVisible();
  await expect(quick).toBeVisible();

  await page.getByRole('searchbox', { name: 'Filter engines' }).fill('ezdrummer');
  await expect(popular).toBeHidden();
  await expect(quick).toBeHidden();
  await expect(page.locator('#engines').getByRole('link', { name: 'EZdrummer 3' })).toBeVisible();
});

test('the engine list shows an engine’s other mappings beside it', async ({ page }) => {
  await page.goto('/engines/');
  const invasion = page.locator('#engines li').filter({ has: page.getByRole('link', { name: 'GetGood Drums Invasion', exact: true }) });
  await invasion.getByRole('link', { name: "Mapping 'GGD'", exact: true }).click();
  await expect(page).toHaveURL('/engines/ggd-invasion-ggd/');
});
