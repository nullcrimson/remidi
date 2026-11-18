import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test, toontrackGroove } from './fixtures';
import { fits } from './layout';
import {
  chosenEngine,
  engineCard,
  enginePicker,
  engineSide,
  openHalpernTo,
  openSettings,
  saveKickPreset,
  seen,
  sourceQuestion,
} from './steps';

const MIN = 44;
const BLACK_KEY_MIN = 24;

/** The controls on screen smaller than a fingertip; a control inside a label is measured by its label, which is what a tap lands on. */
function smallTargets(page: Page) {
  return page.evaluate(([min, blackKeyMin]) => {
    const controls = document.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type=file]):not(.sr-only), select, [role=option], label:has(input[type=radio]), [data-testid^=star-], [tabindex="0"]',
    );
    const small: string[] = [];
    for (const el of controls) {
      const box = (el.closest('label') ?? el).getBoundingClientRect();
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

  await engineCard(page, 'TO').tap();
  await expect(enginePicker(page, 'TO')).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(enginePicker(page, 'TO')).toBeHidden();

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

test('the note picker opens as a sheet at the bottom of the screen', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).tap();
  await page.getByRole('button', { name: 'C2', exact: true }).first().tap();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(Math.round(page.viewportSize()!.height - box!.y - box!.height)).toBe(0);
});

test('a tap on the backdrop closes the note picker sheet', async ({ page }) => {
  await openPair(page);
  await page.getByRole('button', { name: /Edit individual notes/ }).tap();
  await page.getByRole('button', { name: 'C2', exact: true }).first().tap();
  const sheet = page.getByRole('dialog');
  await sheet.waitFor();

  await page.touchscreen.tap(20, 60);
  await expect(sheet).toBeHidden();
});

test('every control is big enough to tap: the question, the done card, the report', async ({ page }) => {
  await openHalpernTo(page, 'general_midi', toontrackGroove(2));
  await page.getByRole('button', { name: 'Convert 1 file to General MIDI' }).tap();
  const anyway = sourceQuestion(page).getByRole('button', { name: 'Convert anyway' });
  await expect(anyway).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await anyway.tap();
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await page.getByRole('button', { name: /View report/ }).tap();
  await expect(page.getByRole('dialog', { name: 'Conversion report' })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
});

test('every control is big enough to tap: the drum-part question, open settings, a preset\'s menu, Advanced', async ({ page }) => {
  await saveKickPreset(page, 'Tap kit');
  await addFiles(page, midFile('split.mid', [{ channel: 1, key: 24 }], [{ channel: 2, key: 24 }]));
  await expect(page.getByRole('group', { name: 'Which parts of split.mid are the drums?' })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await openSettings(page);
  expect(await smallTargets(page)).toEqual([]);
  await page.getByRole('button', { name: 'More actions for Tap kit', exact: true }).tap();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Edit individual notes/ }).tap();
  await page.getByRole('button', { name: 'Advanced — reassign source notes' }).tap();
  await expect(page.getByRole('textbox', { name: 'Add source note' })).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
});

const LONG_NAMED = ['ggd_aggressiverock', 'ggd_dryfunky', 'ggd_modernfusion', 'ni_abbeyroad_modern_sparkle', 'superior_drummer3', 'ezdrummer'];

const favourites = (page: Page, side: 'FROM' | 'TO') => engineSide(page, side).getByRole('list', { name: 'Favourites' });

test('six starred engines all show under the card at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await engineCard(page, 'TO').tap();
  const picker = enginePicker(page, 'TO');
  for (const id of LONG_NAMED) await picker.getByTestId(`star-${id}`).tap();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  const chips = favourites(page, 'TO').getByRole('button');
  await expect(chips).toHaveCount(6);
  await chips.first().scrollIntoViewIfNeeded();
  for (const chip of await chips.all()) await expect(chip).toBeInViewport({ ratio: 1 });
  await fits(page, 'six favourites');
  await chips.filter({ hasText: 'Superior Drummer 3' }).tap();
  await expect(chosenEngine(page, 'TO')).toHaveText('Superior Drummer 3');
  await expect(chips).toHaveCount(6);
  await fits(page, 'six favourites, one chosen');
});

test('a tapped ☆ puts its chip under the card', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').evaluate((card) => card.scrollIntoView({ block: 'center' }));
  await engineCard(page, 'TO').tap();
  const picker = enginePicker(page, 'TO');
  await picker.getByTestId('star-ezdrummer').tap();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await seen(favourites(page, 'TO').getByRole('button', { name: 'EZdrummer 3' }));
  await expect(favourites(page, 'FROM')).toHaveCount(0);
});

test('an engine picker opens as a sheet across the bottom of the screen', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').tap();
  const sheet = enginePicker(page, 'TO');
  await expect(sheet).toBeVisible();
  const { width, height } = page.viewportSize()!;
  await expect.poll(async () => {
    const box = (await sheet.boundingBox())!;
    return [Math.round(box.x), Math.round(box.width), Math.round(height - box.y - box.height)];
  }).toEqual([0, width, 0]);
});
