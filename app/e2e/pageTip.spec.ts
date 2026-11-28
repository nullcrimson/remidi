import { addFiles, expect, kick, openPair, test } from './fixtures';
import { convert, downloadMap, ENGINE_PAGE, press, skeleton, TIP_START as START, tipAsk as tip } from './steps';

const DAY = 24 * 60 * 60 * 1000;
const TOAST_ATTRS = ['role', 'class', 'href', 'target', 'rel', 'data-euros', 'aria-hidden', 'type'];

test.describe('the tip ask of the static pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(START);
  });

  test('a third drum map download asks for a tip', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone counts no download');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    await expect(tip(page)).toBeHidden();
    await downloadMap(page, 'Cubase');
    await expect(tip(page)).toBeVisible();
    await expect(tip(page).getByRole('link', { name: '€5' })).toBeVisible();
  });

  test('the download that raises the ask still lands', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone counts no download');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    expect((await downloadMap(page, 'Cubase')).suggestedFilename()).toBe('GetGood Drums Invasion (Drumverter).drm');
  });

  test('closed, it stays away for the day, also after a reload', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a phone counts no download');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    await downloadMap(page, 'Cubase');
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
    await downloadMap(page, 'Cubase');
    await expect(tip(page)).toBeHidden();
  });

  test('is built like the converter\'s', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the same build at any width');
    await page.goto(ENGINE_PAGE);
    await downloadMap(page, 'Reaper');
    await downloadMap(page, 'Studio One');
    await downloadMap(page, 'Cubase');
    const onPage = await skeleton(tip(page), TOAST_ATTRS);

    await openPair(page);
    await addFiles(page, kick('kick.mid'));
    await convert(page);
    await page.clock.setSystemTime(START.getTime() + DAY + 60_000);
    await press(page.getByRole('link', { name: /Download \.mid/ }));
    expect(await skeleton(tip(page), TOAST_ATTRS)).toEqual(onPage);
  });
});
