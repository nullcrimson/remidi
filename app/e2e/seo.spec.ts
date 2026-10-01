import { expect, test } from './fixtures';

test('the converter ships a heading for crawlers and keeps one after the app loads', async ({ page, request }) => {
  for (const path of ['/', '/pl/']) {
    const html = await (await request.get(path)).text();
    expect(html).toMatch(/<div id="root"><!--app-title--><h1 class="sr-only">[^<]+<\/h1><!--\/app-title--><\/div>/);
    await page.goto(path);
    await expect(page.getByRole('button', { name: /Choose files|Wybierz pliki/ })).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1.sr-only')).toHaveCount(0);
  }
});
