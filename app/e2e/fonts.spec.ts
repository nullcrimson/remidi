import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DESKTOP, lateShift, PHONE } from './shift';

const ENGLISH_PAGE = '/engines/ggd-invasion/';
const ITALIAN_PAGE = '/it/engines/ggd-invasion/';
const WEB_FONTS = '**/*.woff2';

test.describe('an English reader', () => {
  test.use({ locale: 'en-US' });

  test('late web fonts do not move a page on a phone where the nav sits at its wrap edge', async ({ page }) => {
    await page.setViewportSize(PHONE);
    expect(await lateShift(page, ENGLISH_PAGE, WEB_FONTS)).toBeLessThan(0.01);
  });

  test('late web fonts do not move a page on a desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    expect(await lateShift(page, ENGLISH_PAGE, WEB_FONTS)).toBeLessThan(0.01);
  });
});

test.describe('an Italian reader', () => {
  test.use({ locale: 'it-IT' });

  test('late web fonts do not move a page on a phone where the nav sits at its wrap edge', async ({ page }) => {
    await page.setViewportSize({ ...PHONE, width: 414 });
    expect(await lateShift(page, ITALIAN_PAGE, WEB_FONTS)).toBeLessThan(0.01);
  });
});

const textWidth = (page: Page) => page.evaluate(() => {
  const naturalWidth = (text: HTMLElement) => {
    Object.assign(text.style, { display: 'inline-block', width: 'max-content', whiteSpace: 'nowrap' });
    return text.getBoundingClientRect().width;
  };
  return [...document.querySelectorAll<HTMLElement>('main p, main li, main h1, main h2')]
    .filter((text) => text.getClientRects().length > 0)
    .map(naturalWidth)
    .reduce((sum, width) => sum + width, 0);
});

test('a page without its web fonts keeps their proportions', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(ENGLISH_PAGE);
  await page.evaluate(() => document.fonts.ready);
  await page.reload();
  expect(await page.evaluate(() => document.fonts.check('16px "IBM Plex Sans Variable"'))).toBe(true);
  const withWebFonts = await textWidth(page);
  const bare = await page.context().newPage();
  await bare.route(WEB_FONTS, (route) => route.abort());
  await bare.setViewportSize(DESKTOP);
  await bare.goto(ENGLISH_PAGE);
  expect(Math.abs(await textWidth(bare) / withWebFonts - 1)).toBeLessThan(0.03);
});
