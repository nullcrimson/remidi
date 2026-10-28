import { expect, test } from './fixtures';

test('a dialog’s scroll lock does not pad the page beside the reserved scrollbar gutter', async ({ page }) => {
  await page.goto('/');
  const column = page.getByTestId('page-column');
  const before = (await column.boundingBox())!.x;
  await page.evaluate(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.setProperty('--floating-ui-scrollbar-width', '15px');
    document.body.style.paddingRight = '15px';
  });
  expect((await column.boundingBox())!.x).toBeCloseTo(before, 0);
});
