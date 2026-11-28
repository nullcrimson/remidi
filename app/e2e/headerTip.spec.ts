import type { Page } from '@playwright/test';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { ENGINE_PAGE, openEditor, skeleton } from './steps';

const CONVERTER = '/?from=ggd_invasion&to=ezdrummer';
const CUP_ATTRS = ['class', 'href', 'target', 'rel', 'title', 'aria-label'];

const cup = (page: Page) => page.locator('header .tip-head');

/** Fails unless the cup shows inside the window, right of the language button and centred on its line. */
async function besideLanguage(page: Page, path: string) {
  await page.goto(path);
  await expect(cup(page)).toBeVisible();
  const box = (await cup(page).boundingBox())!;
  const language = (await page.locator('#language-trigger').boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(box.x + box.width, path).toBeLessThanOrEqual(width);
  expect(box.x, path).toBeGreaterThan(language.x + language.width);
  expect(Math.abs(box.y + box.height / 2 - (language.y + language.height / 2)), path).toBeLessThanOrEqual(1.5);
}

test.describe('the tip cup in the top bar', () => {
  test('sits beside the language button on a static page, en', async ({ page }) => {
    await besideLanguage(page, ENGINE_PAGE);
  });

  test('sits beside the language button on a static page, ja', async ({ page }) => {
    await besideLanguage(page, `/ja${ENGINE_PAGE}`);
  });

  test('sits beside the language button in the converter, en', async ({ page }) => {
    await besideLanguage(page, CONVERTER);
  });

  test('sits beside the language button in the converter, ja', async ({ page }) => {
    await besideLanguage(page, `/ja${CONVERTER}`);
  });

  test('is built like the converter\'s', async ({ page }) => {
    await page.goto(ENGINE_PAGE);
    const onPage = await skeleton(cup(page), CUP_ATTRS);
    await page.goto(CONVERTER);
    expect(await skeleton(cup(page), CUP_ATTRS)).toEqual(onPage);
  });

  test('never shows beside the note editor', async ({ page }) => {
    await openPair(page);
    await addFiles(page, midFile('groove.mid', [{ channel: DRUMS, key: 24 }]));
    await openEditor(page);
    await expect(cup(page)).toHaveCount(0);
  });
});
