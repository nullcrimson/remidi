import type { Page } from '@playwright/test';
import { addFiles, expect, kickAndChina, test } from './fixtures';
import { clipped, overflowing } from './layout';
import { messages, pseudoFtl } from './messages';

const LOCALES = ['en-XA', 'es', 'pt', 'de', 'ja', 'fr', 'ru', 'pl', 'it', 'zh', 'ko'];
const STATIC = ['engines/', 'engines/ezdrummer/', 'convert/ggd-invasion-to-ezdrummer/', 'how-it-works/', 'faq/', 'terms/'];

const prefix = (code: string) => (code === 'en-XA' ? 'pl' : code);

async function fits(page: Page, state: string) {
  expect(await overflowing(page), `${state}: page scrolls sideways`).toBe(false);
  expect(await clipped(page), `${state}: clipped text`).toEqual([]);
}

test('the probe flags text cut off by its box', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const squeezed = document.createElement('button');
    squeezed.textContent = 'A label too long for its box';
    squeezed.style.cssText = 'width: 40px; white-space: nowrap; display: inline-block';
    const clipping = document.createElement('p');
    clipping.textContent = 'A line hidden past its edge';
    clipping.style.cssText = 'width: 40px; white-space: nowrap; overflow: hidden';
    document.body.prepend(squeezed, clipping);
  });
  expect(await clipped(page)).toEqual(expect.arrayContaining(['A label too long for its box', 'A line hidden past its edge']));
});

for (const code of LOCALES) {
  test.describe(code, () => {
    test.beforeEach(async ({ page }) => {
      if (code === 'en-XA') {
        await page.route('**/assets/locale-pl-messages-*.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `export default ${JSON.stringify(pseudoFtl())};` }));
      }
    });

    test('the converter fits in every state', async ({ page }) => {
      const m = messages(code);
      await page.goto(`/${prefix(code)}/?from=ggd_invasion&to=ezdrummer`);
      await expect(page.getByRole('link', { name: m('nav-converter') }).first()).toBeVisible();
      await fits(page, 'empty');
      await page.getByRole('button', { name: m('lang-menu-label') }).click();
      await fits(page, 'language menu');
      await page.keyboard.press('Escape');
      await addFiles(page, kickAndChina());
      await fits(page, 'file loaded');
      await page.getByRole('button', { name: m('summary-edit') }).click();
      await fits(page, 'edit view');
      await page.getByRole('button', { name: m('edit-back') }).click();
      await page.getByRole('button', { name: m('convert-button') }).click();
      await fits(page, 'done');
      await page.getByRole('button', { name: m('done-view-report') }).click();
      await fits(page, 'report');
      await page.keyboard.press('Escape');
      for (const id of ['section-issue-label', 'section-contact-label', 'section-terms-label']) {
        await page.getByRole('navigation', { name: m('nav-site') }).getByRole('link', { name: m(id) }).click();
        await fits(page, id);
        await page.keyboard.press('Escape');
      }
    });

    if (code !== 'en-XA') {
      for (const path of STATIC) {
        test(`/${code}/${path} fits`, async ({ page }) => {
          await page.goto(`/${code}/${path}`);
          await fits(page, path);
        });
      }
    }
  });
}
