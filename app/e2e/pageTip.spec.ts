import type { Download, Locator, Page } from '@playwright/test';
import { addFiles, expect, kick, openPair, test } from './fixtures';
import { convert, press } from './steps';

const ENGINE_PAGE = '/engines/ggd-invasion/';
const START = new Date('2026-10-01T12:00:00Z');
const NEXT_TASK = 60_000;
const DAY = 24 * 60 * 60 * 1000;

const tip = (page: Page) => page.getByRole('group', { name: 'Leave a tip' });

/** Downloads a drum map a minute after the page's clock, so each download is its own task. */
async function downloadMap(page: Page, daw: string): Promise<Download> {
  await page.clock.setSystemTime((await page.evaluate(() => Date.now())) + NEXT_TASK);
  const download = page.waitForEvent('download');
  await press(page.getByRole('link', { name: `GetGood Drums Invasion drum map for ${daw}`, exact: true }).first());
  return download;
}

/** The tip ask's build without its words: each element's tag, role, classes and link attributes. */
const skeleton = (toast: Locator) =>
  toast.evaluate((root) => {
    const kept = ['role', 'class', 'href', 'target', 'rel', 'data-euros', 'aria-hidden', 'type'];
    const walk = (el: Element): unknown => ({
      tag: el.tagName,
      attrs: kept.filter((a) => el.hasAttribute(a)).map((a) => [a, el.getAttribute(a)]),
      labelled: el.hasAttribute('aria-label'),
      children: [...el.children].map(walk),
    });
    return walk(root);
  });

test.describe('the tip ask of the static pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(START);
  });

  test('a second drum map download asks for a tip, and the file still lands', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone counts no download');
    await page.goto(ENGINE_PAGE);
    expect((await downloadMap(page, 'Reaper')).suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).txt');
    await expect(tip(page)).toBeHidden();
    expect((await downloadMap(page, 'Studio One')).suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).pitchlist');
    await expect(tip(page)).toBeVisible();
    await expect(tip(page).getByRole('link', { name: '€5' })).toBeVisible();
  });

  test('closed, it stays away for the day, also after a reload', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone counts no download');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    await press(tip(page).getByRole('button', { name: 'Close' }));
    await expect(tip(page)).toBeHidden();
    await page.reload();
    await downloadMap(page, 'Reaper');
    await expect(tip(page)).toBeHidden();
  });

  test('a phone asks nothing after its downloads @phone', async ({ page }) => {
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    await expect(tip(page)).toBeHidden();
  });

  test('is built like the converter\'s', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the same build at any width');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    const onPage = await skeleton(tip(page));

    await openPair(page);
    await addFiles(page, kick('kick.mid'));
    await convert(page);
    await page.clock.setSystemTime(START.getTime() + DAY + 10 * NEXT_TASK);
    await press(page.getByRole('link', { name: /Download \.mid/ }));
    expect(await skeleton(tip(page))).toEqual(onPage);
  });
});
