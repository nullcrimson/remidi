import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { press } from './steps';

const footerLink = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name, exact: true });

test('How to use opens as a dialog over the converter', async ({ page }) => {
  await page.goto('/');
  const link = footerLink(page, 'How to use');
  await press(link);
  const guide = page.getByRole('dialog', { name: 'How to convert drum MIDI' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'How to convert drum MIDI' })).toBeVisible();
  await expect(page).toHaveURL('/');

  await press(guide.getByRole('button', { name: 'Close' }));
  await expect(guide).toBeHidden();
  await expect(link).toBeFocused();
});

test('FAQ opens as a dialog that says where presets are saved', async ({ page }) => {
  await page.goto('/');
  await press(footerLink(page, 'FAQ'));
  const faq = page.getByRole('dialog', { name: 'Frequently asked questions' });
  await expect(faq).toBeVisible();
  await expect(faq.getByText('Where are my presets saved?')).toBeVisible();
  await expect(page).toHaveURL('/');

  await page.keyboard.press('Escape');
  await expect(faq).toBeHidden();
});
