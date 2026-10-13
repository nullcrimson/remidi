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
  await press(variant.getByText('played on a close variant'));
  await expect(variant.getByText('Kick (Alt) → Kick', { exact: true })).toBeVisible();
});

test('the summary keeps the drums of a group folded until the group is opened', async ({ page }) => {
  await page.goto('/?from=ggd_invasion&to=ezdrummer');
  await press(page.getByRole('button', { name: remapped }));
  const detail = page.getByRole('dialog');
  await expect(detail.getByText(/^\d+ drums in this mapping$/)).toBeVisible();
  await expect(detail.getByText('Kick (Alt) → Kick', { exact: true })).toBeHidden();
});

test('opening a group keeps the detail open below the summary and inside the window', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hover on touch');
  await page.goto('/?from=ggd_invasion&to=ezdrummer');
  const summary = page.getByRole('button', { name: remapped });
  const detail = page.getByRole('dialog');
  await summary.hover();
  await detail.waitFor();
  const folded = await detail.boundingBox();
  const anchor = await summary.boundingBox();
  if (folded === null || anchor === null) throw new Error('the summary and its detail have no box');
  await page.mouse.move(0, 0);
  await detail.waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1280, height: Math.ceil(folded.y + folded.height + 12) });

  await summary.hover();
  await detail.waitFor();
  await detail.locator('summary').filter({ hasText: 'played on another drum' }).click();
  await expect(detail.getByText(/^China.* → /).first()).toBeVisible();
  await page.waitForTimeout(600);

  const opened = await detail.boundingBox();
  const window = page.viewportSize();
  if (opened === null || window === null) throw new Error('the detail closed');
  expect(opened.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
  expect(opened.y + opened.height).toBeLessThanOrEqual(window.height);
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
