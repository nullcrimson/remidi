import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

const MIN = 44;
const BLACK_KEY_MIN = 24;

/**
 * Visible controls smaller than a fingertip, counting a `tap` ::after hit area. Black piano
 * keys only need the WCAG AA 24 px: they cannot grow without covering the white keys.
 */
function smallTargets(page: Page) {
  return page.evaluate(([min, blackKeyMin]) => {
    const controls = document.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type=file]):not(.sr-only), select, [role=option], label:has(input[type=radio]), [data-testid^=star-], [tabindex="0"]',
    );
    const small: string[] = [];
    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || el.closest('[hidden]')) continue;
      const after = getComputedStyle(el, '::after');
      const grown = after.content !== 'none' && after.position === 'absolute';
      const w = Math.max(box.width, grown ? parseFloat(after.width) : 0);
      const h = Math.max(box.height, grown ? parseFloat(after.height) : 0);
      const text = el.matches('input[type=text], input:not([type])');
      const need = el.matches('[data-testid^=black-]') ? blackKeyMin : min;
      if ((text ? h : Math.min(w, h)) < need - 0.5) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim();
        small.push(`${name.slice(0, 24)} ${Math.round(w)}x${Math.round(h)}`);
      }
    }
    return [...new Set(small)];
  }, [MIN, BLACK_KEY_MIN]);
}

test('every control is big enough to tap', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('groove.mid', [{ channel: DRUMS, key: 24 }]));
  expect(await smallTargets(page)).toEqual([]);

  await page.getByRole('button', { name: /Edit individual notes/ }).tap();
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);

  const kick = page.locator('[data-row]').filter({
    has: page.getByTestId('drum-label').getByText('Kick', { exact: true }),
  });
  await kick.locator('button[aria-expanded]').nth(1).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
});

test('the note picker opens as a sheet that its backdrop closes', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).tap();
  await page.getByRole('button', { name: 'C2', exact: true }).first().tap();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(Math.round(page.viewportSize()!.height - box!.y - box!.height)).toBe(0);

  await page.touchscreen.tap(20, 60);
  await expect(sheet).toBeHidden();
});
