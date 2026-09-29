import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';

test('/pl/ renders Polish with lang="pl"', async ({ page }) => {
  await page.goto('/pl/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.locator('header').getByRole('link', { name: 'Konwerter' })).toBeVisible();
});

test('the language menu lists every language in its own name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Language' }).click();
  await expect(page.locator('#language-menu').getByRole('link')).toHaveText(
    ['English', 'Español', 'Português', 'Deutsch', '日本語', 'Français', 'Русский', 'Polski', 'Italiano', '中文', '한국어'],
  );
});

test.describe('a short screen', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('reaches the last language in the menu', async ({ page }) => {
    await page.goto('/faq/');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.locator('#language-menu').getByRole('link', { name: '한국어' }).click();
    await expect(page).toHaveURL(/\/ko\/faq\/$/);
  });
});

test('the language menu keeps the page', async ({ page }) => {
  await page.goto('/faq/');
  await page.getByRole('button', { name: 'Language' }).click();
  await page.locator('#language-menu').getByRole('link', { name: 'Polski' }).click();
  await expect(page).toHaveURL(/\/pl\/faq\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
});

test.describe('a German browser', () => {
  test.use({ locale: 'de-DE' });

  test('opening / shows German at /de/ with one document load', async ({ page }) => {
    const documents: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'document') documents.push(new URL(r.url()).pathname);
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page).toHaveURL(/\/de\/$/);
    expect(documents).toEqual(['/']);
  });

  test('an English guide page offers the German one', async ({ page }) => {
    await page.goto('/how-it-works/');
    await expect(page.locator('#lang-offer a[data-offer="de"]')).toBeVisible();
  });
});

test.describe('a Traditional Chinese browser', () => {
  test.use({ locale: 'zh-TW' });

  test('stays on English at / and is offered nothing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto('/faq/');
    await expect(page.locator('#lang-offer')).toBeHidden();
  });
});

test.describe('a Polish browser', () => {
  test.use({ locale: 'pl-PL' });

  test('opening / shows Polish at /pl/ with one document load', async ({ page }) => {
    const documents: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'document') documents.push(new URL(r.url()).pathname);
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page).toHaveURL(/\/pl\/$/);
    expect(documents).toEqual(['/']);
  });

  test('after choosing English, / stays English', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/pl\/$/);
    await page.getByRole('button', { name: 'Język' }).click();
    await page.locator('#language-menu').getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test('/faq/ never redirects and offers Polish', async ({ page }) => {
    await page.goto('/faq/');
    await expect(page).toHaveURL(/\/faq\/$/);
    await expect(page.locator('[data-offer="pl"]')).toBeVisible();
  });

  test('Back after switching returns to the previous language in place', async ({ page }) => {
    await page.goto('/pl/');
    await page.getByRole('button', { name: 'Język' }).click();
    await page.locator('#language-menu').getByRole('link', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goBack();
    await expect(page).toHaveURL(/\/pl\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });
});

test('switching language on the converter keeps a loaded file and its settings', async ({ page }) => {
  await openPair(page);
  await addFiles(page, midFile('kick.mid', [{ channel: DRUMS, key: 24 }]));
  await page.getByText('C-2', { exact: true }).click();
  await page.getByRole('button', { name: 'Language' }).click();
  await page.locator('#language-menu').getByRole('link', { name: 'Polski' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByText('kick.mid')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
});

test('the Terms link on /pl/ opens the Polish terms', async ({ page }) => {
  await page.goto('/pl/');
  await expect(page.locator('footer a[href="/pl/terms/"]')).toHaveCount(1);
});

test('/pl/ marks the converter current and links the Polish FAQ', async ({ page }) => {
  await page.goto('/pl/');
  const nav = page.locator('header nav');
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('href', '/pl/');
  await expect(page.locator('a[href="/pl/faq/"]')).not.toHaveCount(0);
});

test('a blocked language file on /pl/ shows the Polish load-failure notice and no app', async ({ page, pageErrors }) => {
  await page.route(/locale-[\w-]+\.js$/, (r) => r.abort());
  await page.goto('/pl/');
  await expect(page.locator('#load-failed')).toBeVisible();
  await expect(page.locator('#load-failed')).toContainText('Nie udało się wczytać aplikacji Drumverter.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.locator('#root')).toBeEmpty();
  expect(pageErrors.every((e) => /locale-[\w-]+\.js|Failed to load resource/.test(e))).toBe(true);
  pageErrors.length = 0;
});

test.describe('after choosing Polski', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faq/');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.locator('#language-menu').getByRole('link', { name: 'Polski' }).click();
    await expect(page).toHaveURL(/\/pl\/faq\/$/);
  });

  test('an English page that has a Polish version opens in Polish', async ({ page }) => {
    await page.goto('/how-it-works/');
    await expect(page).toHaveURL(/\/pl\/how-it-works\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('an English engine page opens in Polish', async ({ page }) => {
    await page.goto('/engines/ezdrummer/');
    await expect(page).toHaveURL(/\/pl\/engines\/ezdrummer\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('the note maps link opens the Polish note maps', async ({ page }) => {
    await page.goto('/pl/');
    await page.locator('header nav a[href="/pl/engines/"]').click();
    await expect(page).toHaveURL(/\/pl\/engines\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('a Polish engine page converts in the Polish converter', async ({ page }) => {
    await page.goto('/pl/engines/ezdrummer/');
    await page.locator('main a[href="/pl/?to=ezdrummer"]').click();
    await expect(page).toHaveURL(/\/pl\/\?to=ezdrummer$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('a converter link with engines keeps them in Polish', async ({ page }) => {
    await page.goto('/?from=ggd_invasion&to=ezdrummer');
    await expect(page).toHaveURL(/\/pl\/\?from=ggd_invasion&to=ezdrummer$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });
});
