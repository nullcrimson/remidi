import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { pickEngine, press } from './steps';

const LEAD = 'Working on a computer? Send yourself this page.';
const PAIR_PAGE = '/convert/ggd-invasion-to-ezdrummer/';

const lead = (page: Page) => page.getByText(LEAD, { exact: true });
const sendButton = (page: Page) => page.getByRole('button', { name: 'Send this page' });

/** Replaces the share sheet with one that records the address it is given. */
async function recordShares(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { shared: string[] };
    w.shared = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async ({ url }: ShareData) => {
        w.shared.push(url ?? '');
      },
    });
  });
}

/** Takes the share sheet away and replaces the clipboard with one that records what it is given, or refuses it. */
async function noShareSheet(page: Page, copy: 'records' | 'refuses') {
  await page.addInitScript((copy) => {
    const w = window as unknown as { copied: string[] };
    w.copied = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (copy === 'refuses') throw new DOMException('denied', 'NotAllowedError');
          w.copied.push(text);
        },
      },
    });
  }, copy);
}

async function pickThePair(page: Page) {
  await page.goto('/');
  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3');
}

const ADDRESS = (page: Page) => new URL('/#from=ggd_invasion&to=ezdrummer', page.url()).href;

/** Opens `path` and expects its line that sends the page on to show. */
async function offered(page: Page, path: string) {
  await page.goto(path);
  await expect(lead(page)).toBeVisible();
  await expect(sendButton(page)).toBeVisible();
}

/** Opens `path` and expects its line that sends the page on to be on the page but hidden. */
async function notOffered(page: Page, path: string) {
  await page.goto(path);
  await expect(lead(page)).toHaveCount(1);
  await expect(lead(page)).toBeHidden();
  await expect(sendButton(page)).toBeHidden();
}

test.describe('on a phone', { tag: '@phone' }, () => {
  test('the converter offers to send the page on to a computer', async ({ page }) => {
    await offered(page, '/');
  });

  test('an engine page offers to send the page on to a computer', async ({ page }) => {
    await offered(page, '/engines/ggd-invasion/');
  });

  test('the drum maps page offers to send the page on to a computer', async ({ page }) => {
    await offered(page, '/drum-maps/');
  });

  test('a pair page offers to send the page on to a computer', async ({ page }) => {
    await offered(page, PAIR_PAGE);
  });

  test('the converter sends the address of the engines picked in it', async ({ page }) => {
    await recordShares(page);
    await pickThePair(page);
    await press(sendButton(page));
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared: string[] }).shared)).toEqual([ADDRESS(page)]);
    await expect(page.getByText('Link copied', { exact: true })).toHaveCount(0);
  });

  test('without a share sheet the converter copies the address and says so', async ({ page }) => {
    await noShareSheet(page, 'records');
    await pickThePair(page);
    await press(sendButton(page));
    await expect(page.getByText('Link copied', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual([ADDRESS(page)]);
  });

  test('when neither a share sheet nor the copy works, the converter shows the address', async ({ page }) => {
    await noShareSheet(page, 'refuses');
    await pickThePair(page);
    await press(sendButton(page));
    await expect(page.getByText('Copy this address:', { exact: true })).toBeVisible();
    await expect(page.getByText(ADDRESS(page), { exact: true })).toBeVisible();
  });

  test('a pair page sends its own address', async ({ page }) => {
    await recordShares(page);
    await page.goto(PAIR_PAGE);
    await press(sendButton(page));
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared: string[] }).shared)).toEqual([new URL(PAIR_PAGE, page.url()).href]);
  });

  test('when neither a share sheet nor the copy works, an engine page shows its address', async ({ page }) => {
    await noShareSheet(page, 'refuses');
    await page.goto('/engines/ggd-invasion/');
    await press(sendButton(page));
    await expect(page.getByText('Copy this address:', { exact: true })).toBeVisible();
    await expect(page.getByText(new URL('/engines/ggd-invasion/', page.url()).href, { exact: true })).toBeVisible();
  });
});

test.describe('with a mouse in a narrow window', () => {
  test.skip(({ isMobile }) => isMobile, 'a fine pointer');
  test.use({ viewport: { width: 412, height: 823 } });

  test('the converter offers nothing to send on', async ({ page }) => {
    await notOffered(page, '/');
  });

  test('an engine page offers nothing to send on', async ({ page }) => {
    await notOffered(page, '/engines/ggd-invasion/');
  });

  test('the drum maps page offers nothing to send on', async ({ page }) => {
    await notOffered(page, '/drum-maps/');
  });

  test('a pair page offers nothing to send on', async ({ page }) => {
    await notOffered(page, PAIR_PAGE);
  });
});
