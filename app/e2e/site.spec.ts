import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { press } from './steps';

test('the engine list filters as you type', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });
  const list = page.locator('#engines');
  const ezdrummer = list.getByRole('link', { name: 'EZdrummer 3' });
  const bfd = list.getByRole('link', { name: /BFD3/ });

  await filter.fill('ezdrummer');
  await expect(ezdrummer).toBeVisible();
  await expect(bfd).toBeHidden();
});

test('a pair page downloads its Ableton rack', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const download = page.waitForEvent('download');
  await press(page.getByRole('link', { name: 'Download an Ableton rack for GetGood Drums Invasion → EZdrummer 3 (.adg)' }));
  const file = await download;
  expect(file.suggestedFilename()).toBe('GetGood Drums Invasion to EZdrummer 3.adg');
  const bytes = await readFile(await file.path());
  expect([...bytes.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
});

test('the engine list says so when no engine matches', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });

  await filter.fill('no such kit');
  await expect(page.getByText('No engines match')).toBeVisible();
});

test('Escape clears the engine filter and brings the list back', async ({ page }) => {
  await page.goto('/engines/');
  const filter = page.getByRole('searchbox', { name: 'Filter engines' });
  const list = page.locator('#engines');
  const bfd = list.getByRole('link', { name: /BFD3/ });
  await filter.fill('no such kit');
  await page.getByText('No engines match').waitFor();

  await filter.press('Escape');
  await expect(filter).toHaveValue('');
  await expect(bfd).toBeVisible();
  await expect(page.getByText('No engines match')).toBeHidden();
});

test('a conversion table can show only the changes', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const rows = page.locator('tbody tr[data-outcome]');
  const exact = page.locator('tbody tr[data-outcome=exact]');

  await expect(exact.first()).toBeVisible();
  await press(page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes'));
  await expect(exact.first()).toBeHidden();
  await expect(rows.and(page.locator('[data-outcome=approximated]')).first()).toBeVisible();
});

test('a conversion table shows every row again on All', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const exact = page.locator('tbody tr[data-outcome=exact]');
  await press(page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes'));
  await exact.first().waitFor({ state: 'hidden' });

  await press(page.getByRole('radiogroup', { name: 'Rows' }).getByText('All'));
  await expect(exact.first()).toBeVisible();
});

test('Changes hides a group with no change', async ({ page }) => {
  await page.goto('/convert/addictive-drums2-to-ezdrummer/');
  const kick = page.getByRole('rowheader', { name: 'Kick', exact: true });
  const cymbals = page.getByRole('rowheader', { name: 'Cymbals', exact: true });

  await expect(kick).toBeVisible();
  await press(page.getByRole('radiogroup', { name: 'Rows' }).getByText('Changes'));
  await expect(kick).toBeHidden();
  await expect(cymbals).toBeVisible();
});

test('a conversion table names notes in either octave naming', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const rows = page.locator('tbody tr[data-outcome]');
  const firstNote = rows.first().locator('td').first();

  const c1 = firstNote.locator('[data-oct=c1]');
  const c2 = firstNote.locator('[data-oct=c2]');
  await expect(c1).toBeVisible();
  await expect(c2).toBeHidden();
  await press(page.getByRole('radiogroup', { name: 'Octave naming' }).getByText('C-2'));
  await expect(c1).toBeHidden();
  await expect(c2).toBeVisible();
  const lower = (name: string) => name.replace(/-?\d+$/, (n) => String(Number(n) - 1));
  expect(await c2.textContent()).toBe(lower((await c1.textContent())!));
});

test('a popular card opens its table', async ({ page }) => {
  await page.goto('/engines/');
  const card = page.getByRole('link', { name: /^GetGood Drums Invasion → EZdrummer 3 \d+ exact/ });
  await press(card);
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
});

test('filtering the engines puts the list right under the filter', async ({ page }) => {
  await page.goto('/engines/');
  const popular = page.getByRole('heading', { name: 'Popular conversions' });
  const quick = page.getByRole('list', { name: 'Most used engines' });
  await expect(popular).toBeVisible();
  await expect(quick).toBeVisible();

  await page.getByRole('searchbox', { name: 'Filter engines' }).fill('ezdrummer');
  await expect(popular).toBeHidden();
  await expect(quick).toBeHidden();
  await expect(page.locator('#engines').getByRole('link', { name: 'EZdrummer 3' })).toBeVisible();
});

test('the engine list shows an engine’s other mappings beside it', async ({ page }) => {
  await page.goto('/engines/');
  const invasion = page.locator('#engines li').filter({ has: page.getByRole('link', { name: 'GetGood Drums Invasion', exact: true }) });
  await press(invasion.getByRole('link', { name: "Mapping 'GGD'", exact: true }));
  await expect(page).toHaveURL('/engines/ggd-invasion-ggd/');
});

const drumGroups = (page: Page) => page.getByRole('navigation', { name: 'Drum groups' });

test('a drum group link jumps to its table below the jump links', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  const groups = drumGroups(page);
  const bar = groups.locator('..');
  const cymbals = page.getByRole('table', { name: /^Cymbals/ });

  await press(groups.getByRole('link', { name: /^Cymbals/ }));
  await expect(page).toHaveURL(/#g-cymbals$/);
  await expect(cymbals.locator('caption')).toBeInViewport();
  await expect.poll(async () => {
    const barBox = (await bar.boundingBox())!;
    const caption = (await cymbals.locator('caption').boundingBox())!;
    return caption.y >= barBox.y + barBox.height - 1;
  }, { message: 'the caption sits below the jump links' }).toBe(true);
});

test('the drum group links stay in reach while the page scrolls', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  const groups = drumGroups(page);
  await groups.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, innerHeight));
  await expect(groups).toBeInViewport();
  expect(Math.round((await groups.locator('..').boundingBox())!.y)).toBe(0);
});

const coreNotes = (page: Page) => page.locator('section')
  .filter({ has: page.getByRole('heading', { name: 'The notes you will use most' }) })
  .getByRole('listitem');

test('an engine page opens on the main note of each most used drum', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  const notes = coreNotes(page);
  await expect(notes).toHaveCount(16);
  await expect(notes.first()).toHaveText('Kick 36 · C2', { useInnerText: true });
  await expect(notes.nth(1)).toHaveText('Snare 38 · D2', { useInnerText: true });
});

test('the octave naming renames the notes of the most used drums', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await press(page.getByRole('radiogroup', { name: 'Octave naming' }).getByText('C-2'));
  await expect(coreNotes(page).first()).toHaveText('Kick 36 · C1', { useInnerText: true });
});

const brightness = (row: Locator) => row.locator('td').first().evaluate((td) =>
  getComputedStyle(td).color.match(/[\d.]+/g)!.slice(0, 3).reduce((sum, c) => sum + Number(c), 0));

test('an engine page dims a drum’s extra notes beside its main note', async ({ page }) => {
  await page.goto('/engines/ezdrummer/');
  await expect(page.getByText('Dimmed rows are extra notes for a drum that already has a main note.')).toBeVisible();
  const kick = page.getByRole('table', { name: /^Kick/ }).getByRole('row');
  const main = kick.filter({ hasText: /^36 ·/ });
  const extra = kick.filter({ hasText: /^35 ·/ });
  await expect(coreNotes(page).first()).toContainText('36');

  expect(await brightness(extra)).toBeLessThan(await brightness(main));
});

const changes = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'What changes' }) });

test('a conversion table says up front which drums stand in for the ones the target lacks', async ({ page }) => {
  await page.goto('/convert/ggd-invasion-to-ezdrummer/');
  const crash = changes(page).getByRole('listitem').filter({ hasText: /^Crash 1 86/ });
  await expect(crash).toContainText('plays China 1, China 2, Splash 1, Splash 2, Stack 1');
});

test('a conversion table says up front which drums the target has none for', async ({ page }) => {
  await page.goto('/convert/addictive-drums2-to-ezdrummer/');
  await expect(changes(page)).toContainText('EZdrummer 3 has no drum for Cowbell, Sticks.');
});

test('a conversion table that changes nothing says every note keeps its drum', async ({ page }) => {
  await page.goto('/convert/ggd-aggressiverock-to-ggd-invasion/');
  await expect(changes(page).getByText(/^Every .+ note lands on its own drum in GetGood Drums Invasion\.$/)).toBeVisible();
  await expect(changes(page).getByRole('listitem')).toHaveCount(0);
});

test('a matrix cell shows the share of exact notes in the table it opens', async ({ page }) => {
  await page.goto('/engines/');
  const cell = page.getByRole('link', { name: /^GetGood Drums Invasion to EZdrummer 3: \d+% of notes map exactly$/ });
  const share = (await cell.textContent())!.trim();
  await expect(cell).toHaveAccessibleName(`GetGood Drums Invasion to EZdrummer 3: ${share} of notes map exactly`);

  await press(cell);
  await expect(page).toHaveURL('/convert/ggd-invasion-to-ezdrummer/');
  const exact = await page.locator('tr[data-outcome=exact]').count();
  const all = await page.locator('tr[data-outcome]').count();
  expect(share).toBe(`${Math.round((100 * exact) / all)}%`);
});

test('the guide walks through the converter’s own three steps', async ({ page }) => {
  await page.goto('/how-it-works/');
  const steps = page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2 }) });
  await expect(steps.getByRole('heading')).toHaveText(['Your drum file', 'From one drum layout to another', 'Convert']);
});
