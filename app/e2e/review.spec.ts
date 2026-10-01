import type { Page } from '@playwright/test';
import { expect, openPair, test } from './fixtures';
import { drumRow, leaveEditor, openEditor, press, retarget, targetNote } from './steps';

const labels = (page: Page) => page.locator('[data-row]').getByTestId('drum-label');

async function editKickAndSnare(page: Page) {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await retarget(page, 'Snare', 'F2');
  await leaveEditor(page);
  return page.getByRole('button', { name: '2 drums edited — review changes', exact: true });
}

test('the edited chip previews every edit beside the mouse', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the preview is a hover tooltip; a tap opens the review');
  const chip = await editKickAndSnare(page);
  await chip.hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toContainText('2 drums differ from the default mapping');
  await expect(tip).toContainText('Kick: C1 → E2 (default C1 → C2)');
  await expect(tip).toContainText('Snare: D1 → F2 (default D1 → D2)');
});

test('the edited chip opens the editor on just the edited drums', async ({ page }) => {
  const chip = await editKickAndSnare(page);
  await expect(chip).toHaveText(/2 edited/);
  await press(chip);
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Changed 2' })).toBeChecked();
  await expect(labels(page)).toHaveText(['Kick', 'Snare']);
  await expect(page.getByText('2 changes', { exact: true })).toBeVisible();
});

test('the drum filter narrows the rows and Escape brings them all back', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  const total = await labels(page).count();
  const filter = page.getByRole('textbox', { name: 'Filter drums' });

  await filter.fill('KICK');
  await expect(drumRow(page, 'Kick')).toBeVisible();
  await expect(drumRow(page, 'Snare')).toHaveCount(0);
  const kicks = await labels(page).allTextContents();
  expect(kicks.length).toBeLessThan(total);
  for (const label of kicks) expect(label).toMatch(/kick/i);

  await filter.fill('no such drum');
  await expect(labels(page)).toHaveCount(0);
  await expect(page.getByText('No drums match')).toBeVisible();

  await filter.press('Escape');
  await expect(filter).toHaveValue('');
  await expect(labels(page)).toHaveCount(total);
});

test('resetting one edited drum restores its default note and keeps the other edit', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await retarget(page, 'Kick', 'E2');
  await retarget(page, 'Snare', 'F2');
  await expect(page.getByText('2 changes', { exact: true })).toBeVisible();
  await expect(page.locator('[data-row]').getByRole('button', { name: /^Reset / })).toHaveCount(2);

  await press(page.getByRole('button', { name: 'Reset Kick' }));
  await expect(targetNote(page, 'Kick')).toHaveText('C2');
  await expect(targetNote(page, 'Snare')).toHaveText('F2');
  await expect(page.getByRole('button', { name: 'Reset Kick' })).toHaveCount(0);
  await expect(page.getByText('1 change', { exact: true })).toBeVisible();

  await leaveEditor(page);
  await expect(page.getByRole('button', { name: '1 drum edited — review changes', exact: true })).toBeVisible();
});
