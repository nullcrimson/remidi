import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chosenEngine, press } from './steps';

test('an engine page converts to that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert to EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#to=ezdrummer');
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(chosenEngine(page, 'FROM')).toHaveCount(0);
});

test('an engine page converts from that engine', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert from EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#from=ezdrummer');
  await expect(chosenEngine(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosenEngine(page, 'TO')).toHaveCount(0);
});

test('a conversion table opens the converter with both of its engines', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  await press(page.getByRole('link', { name: 'Convert GetGood Drums Invasion → EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/#from=ggd_invasion&to=ezdrummer');
  await expect(chosenEngine(page, 'FROM')).toHaveText('GetGood Drums Invasion');
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(page.getByRole('button', { name: /^\d+ of \d+ drums remapped$/ })).toBeVisible();
});

test('the converter links a popular conversion table behind a fold', async ({ page }) => {
  await page.goto('/');
  const popular = page.getByRole('navigation', { name: 'Popular conversions' });
  await press(popular.locator('summary'));
  await press(popular.getByRole('link', { name: 'GetGood Drums Invasion to EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Convert GetGood Drums Invasion MIDI to EZdrummer 3');
});

test('an engine without hub pairs links its conversion table to EZdrummer', async ({ page }) => {
  await page.goto('/engines/hertz/');
  await press(page.getByRole('list', { name: 'From Hertz Drums to' }).getByRole('link', { name: 'EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/convert/hertz-to-ezdrummer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Convert Hertz Drums MIDI to EZdrummer 3');
});

test('a conversion table without a page the other way reverses in the converter', async ({ page }) => {
  await page.goto('/convert/hertz-to-ezdrummer/');
  await press(page.getByRole('link', { name: '⇄ Reverse direction', exact: true }));
  await expect(page).toHaveURL('/#from=ezdrummer&to=hertz');
  await expect(chosenEngine(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosenEngine(page, 'TO')).toHaveText('Hertz Drums');
});

test('a conversion table shows the converter steps with the engines already picked', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const steps = page.getByRole('list', { name: 'Convert in three steps' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(1)).toContainText('From one drum layout to another · done');
  await expect(steps.nth(1)).toContainText('GetGood Drums Invasion → EZdrummer 3');
});

test('a conversion table keeps its convert button in reach on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'on a wide screen the button stays at the top of the page');
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  await page.getByRole('heading', { name: 'More from GetGood Drums Invasion' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: 'Convert GetGood Drums Invasion → EZdrummer 3', exact: true })).toBeInViewport();
});

test('an FAQ answer links the conversion table it talks about', async ({ page }) => {
  await page.goto('/faq/');
  await press(page.getByRole('main').getByRole('link', { name: 'See where each GetGood Drums Invasion note lands in EZdrummer 3', exact: true }));
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
});

async function opensTheConverterFromItsEnd(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Ready to convert?' })).toBeVisible();
  await press(page.getByRole('main').getByRole('link', { name: 'Open the converter', exact: true }));
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeVisible();
}

test('the guide ends on a button that opens the converter', async ({ page }) => {
  await opensTheConverterFromItsEnd(page, '/how-it-works/');
});

test('the FAQ ends on a button that opens the converter', async ({ page }) => {
  await opensTheConverterFromItsEnd(page, '/faq/');
});

test('the header button opens the converter from a note map', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('banner').getByRole('link', { name: 'Open the converter', exact: true }));
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Choose files' })).toBeVisible();
});

const mainNavLink = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true });

test('the main nav links the drum maps from the converter', async ({ page }) => {
  await page.goto('/');
  await press(mainNavLink(page, 'Drum maps'));
  await expect(page).toHaveURL('/drum-maps/');
});

test('the main nav marks the page that is open', async ({ page }) => {
  await page.goto('/drum-maps/');
  await expect(mainNavLink(page, 'Drum maps')).toHaveAttribute('aria-current', 'page');
});

test('an engine page links the conversion tables into it', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('list', { name: 'To EZdrummer 3 from' }).getByRole('link', { name: 'GetGood Drums Invasion', exact: true }));
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
});
