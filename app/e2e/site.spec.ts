import { expect, test } from './fixtures';

test('the engine list filters as you type and Escape clears it', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });
  const list = page.locator('#engines');
  const ezdrummer = list.getByRole('link', { name: 'EZdrummer 3' });
  const bfd = list.getByRole('link', { name: /BFD3/ });

  await filter.fill('ezdrummer');
  await expect(ezdrummer).toBeVisible();
  await expect(bfd).toBeHidden();

  await filter.fill('no such kit');
  await expect(page.getByText('No engines match')).toBeVisible();

  await filter.press('Escape');
  await expect(filter).toHaveValue('');
  await expect(bfd).toBeVisible();
  await expect(page.getByText('No engines match')).toBeHidden();
});

test('a conversion table shows only changes and names notes either way', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const rows = page.locator('tbody tr');
  const exact = page.locator('tbody tr[data-outcome=exact]');
  const firstNote = rows.first().locator('td').first();

  await expect(exact.first()).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes').click();
  await expect(exact.first()).toBeHidden();
  await expect(rows.and(page.locator('[data-outcome=approximated]')).first()).toBeVisible();
  await page.getByRole('radiogroup', { name: 'Rows' }).getByText('All').click();
  await expect(exact.first()).toBeVisible();

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
