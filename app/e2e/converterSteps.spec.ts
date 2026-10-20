import type { Page } from '@playwright/test';
import { addFiles, expect, kickAndChina, openPair, test } from './fixtures';
import { convert, pickEngine, press } from './steps';

const TITLES = ['Your drum file', 'From one drum layout to another', 'Convert'];

type State = 'done' | 'current' | 'later';

/** Each step's badge, number or check, and its heading, which says "done" to a screen reader. */
async function expectSteps(page: Page, states: State[]) {
  for (const [i, state] of states.entries()) {
    const badge = page.locator('.step-badge').nth(i);
    await expect(badge).toHaveAttribute('data-state', state);
    if (state === 'done') {
      await expect(badge).toHaveText('');
      await expect(badge.locator('svg')).toBeVisible();
    } else {
      await expect(badge).toHaveText(String(i + 1));
    }
    const title = state === 'done' ? `${TITLES[i]} · done` : TITLES[i];
    await expect(page.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
  }
}

test('each step’s badge turns into a check once the step is done', async ({ page }) => {
  await page.goto('/');
  await expectSteps(page, ['current', 'later', 'later']);

  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3');
  await expectSteps(page, ['current', 'done', 'later']);

  await addFiles(page, kickAndChina());
  await expectSteps(page, ['done', 'done', 'current']);

  await convert(page);
  await expectSteps(page, ['done', 'done', 'done']);
});

test('Convert more takes the file step back to its number', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kickAndChina());
  await convert(page);

  await press(page.getByRole('button', { name: 'Convert more' }));
  await expectSteps(page, ['current', 'done', 'later']);
});
