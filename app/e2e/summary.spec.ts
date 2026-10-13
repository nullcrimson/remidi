import { expect, test } from './fixtures';
import { press } from './steps';

const remapped = /^\d+ of \d+ drums remapped$/;

test('the summary names the drums played on a close variant', async ({ page }) => {
  await page.goto('/?from=ggd_invasion&to=ezdrummer');
  await press(page.getByRole('button', { name: remapped }));
  const detail = page.getByRole('dialog');
  const variant = detail.getByRole('listitem').filter({ hasText: 'played on a close variant' });
  await expect(variant).toBeVisible();
  await expect(variant).toContainText('no exact match in EZdrummer 3 — a variant of the same drum plays');
  await expect(variant.getByText('Kick (Alt) → Kick', { exact: true })).toBeVisible();
});

test('a pair that plays every drum as written lists no changed drums', async ({ page }) => {
  await page.goto('/?from=ggd_metal&to=ggd_invasion');
  await press(page.getByRole('button', { name: remapped }));
  const detail = page.getByRole('dialog');
  await expect(detail.getByText(/^\d+ drums in this mapping$/)).toBeVisible();
  await expect(detail.getByText('played on a close variant', { exact: true })).toHaveCount(0);
  await expect(detail.getByText('played on another drum', { exact: true })).toHaveCount(0);
  await expect(detail.getByText('left out', { exact: true })).toHaveCount(0);
});

test('a pair that plays every drum as written opens the editor on all drums', async ({ page }) => {
  await page.goto('/?from=ggd_metal&to=ggd_invasion');
  await press(page.getByRole('button', { name: remapped }));
  const detail = page.getByRole('dialog');
  await detail.waitFor();

  await press(detail.getByRole('button', { name: 'Change in note editor →' }));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^All \d+$/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Issues 0' })).toBeVisible();
});
