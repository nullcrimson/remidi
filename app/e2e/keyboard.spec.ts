import type { Locator, Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const groove = () => midFile('groove.mid', [{ channel: DRUMS, key: 24 }]);

async function tabTo(page: Page, target: Locator, most = 10) {
  for (let i = 0; i < most; i += 1) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test('walks from page load to a converted file by keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await addFiles(page, groove());
  const from = page.getByRole('combobox', { name: 'Filter FROM engines' });
  await expect(from).toBeFocused();
  await page.keyboard.type('Invasion');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'FROM engine' }).getByTestId('chosen-engine'))
    .toHaveText(/Invasion/);

  const to = page.getByRole('combobox', { name: 'Filter TO engines' });
  await tabTo(page, to);
  await page.keyboard.type('General MIDI');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'TO engine' }).getByTestId('chosen-engine'))
    .toHaveText(/General MIDI/);

  const convert = page.getByRole('button', { name: /^Convert/ });
  await tabTo(page, convert);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /1 file converted/ })).toBeFocused();

  await tabTo(page, page.getByRole('button', { name: 'Convert more' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('button:has(+ [data-testid=file-input])')).toBeFocused();
});

test('focus moves to the TO engine filter when files arrive and TO is missing', async ({ page }) => {
  await page.goto('/?from=ggd_invasion');
  await addFiles(page, groove());
  await expect(page.getByRole('combobox', { name: 'Filter TO engines' })).toBeFocused();
});

test('focus moves to Convert when files arrive and both engines are chosen', async ({ page }) => {
  await openPair(page);
  await addFiles(page, groove());
  await expect(page.getByRole('button', { name: /^Convert/ })).toBeFocused();
});

test('opening the note editor focuses its heading', async ({ page }) => {
  await openPair(page);
  const editLink = page.getByRole('button', { name: /Edit individual notes/ });
  await editLink.click();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeFocused();
});

test('a note picker opened with Enter takes focus', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();

  const note = page.getByRole('button', { name: 'C2', exact: true }).first();
  await note.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await expect(picker).toBeVisible();
  await expect.poll(() => picker.evaluate((d) => d.contains(document.activeElement))).toBe(true);
});

test('Escape in the note picker gives focus back to the note', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();
  const note = page.getByRole('button', { name: 'C2', exact: true }).first();
  await note.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await picker.waitFor();

  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(note).toBeFocused();
});

test('Back from the note editor gives focus back to the Edit link', async ({ page }) => {
  await openPair(page);
  const editLink = page.getByRole('button', { name: /Edit individual notes/ });
  await editLink.click();
  await page.getByRole('heading', { name: 'Edit notes' }).waitFor();

  await page.getByRole('button', { name: /Back/ }).click();
  await expect(editLink).toBeFocused();
});
