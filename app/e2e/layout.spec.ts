import { LOCALE_CODES } from '../src/generated/localeCodes';
import { addFiles, expect, kickAndChina, test } from './fixtures';
import { clipped, EVERY_VIEWPORT_PAGE, fits, LOCALES, PHONE_PAGES } from './layout';
import { messages, PSEUDO, pseudoFtl } from './messages';

const prefix = (code: string) => (code === PSEUDO ? 'pl' : code);

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
      if (code === PSEUDO) {
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
      await page.getByRole('group', { name: m('library-group', { side: m('engine-to') }) }).getByRole('button').first().click();
      await fits(page, 'engine picker');
      await page.keyboard.press('Escape');
      await page.getByTestId('settings-fold').locator('summary').click();
      await fits(page, 'settings open');
      await page.getByRole('button', { name: m('summary-edit') }).click();
      await fits(page, 'edit view');
      await page.getByRole('button', { name: m('edit-back') }).click();
      await page.getByRole('button', { name: m('convert-button-ready', { count: 1, target: 'EZdrummer 3' }), exact: true }).click();
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
  });
}

for (const code of LOCALE_CODES) {
  const root = code === 'en' ? '/' : `/${code}/`;
  test.describe(`${code} static pages`, () => {
    test(`${root}${EVERY_VIEWPORT_PAGE} fits`, async ({ page }) => {
      await page.goto(`${root}${EVERY_VIEWPORT_PAGE}`);
      await fits(page, EVERY_VIEWPORT_PAGE);
    });
    for (const path of PHONE_PAGES) {
      test(`${root}${path} fits a phone`, { tag: '@phone' }, async ({ page }) => {
        await page.goto(`${root}${path}`);
        await fits(page, path);
      });
    }
  });
}
