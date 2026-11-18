import type { Page } from '@playwright/test';
import { addFiles, expect, kick, openPair, test } from './fixtures';
import { chosenEngine, engineCard, enginePicker, engineSide, pickEngine, REMAPPED, seen } from './steps';

test('Swap is disabled before any engine is chosen', async ({ page }) => {
  await page.goto('/');
  const swap = page.getByRole('button', { name: 'Swap FROM and TO' });
  await expect(swap).toBeDisabled();
});

test('picks a FROM engine by filtering the list in its picker', async ({ page }) => {
  await page.goto('/');
  await expect(engineCard(page, 'FROM')).toHaveText(/Choose a drum plugin/);
  await engineCard(page, 'FROM').click();
  const picker = enginePicker(page, 'FROM');
  const filter = picker.getByRole('combobox', { name: 'Filter FROM engines' });
  await expect(filter).toBeFocused();
  await filter.fill('invasion');
  await expect(picker.getByRole('option', { name: 'EZdrummer 3', exact: true })).toHaveCount(0);
  await picker.getByRole('option', { name: 'GetGood Drums Invasion', exact: true }).click();
  await expect(picker).toBeHidden();
  await expect(chosenEngine(page, 'FROM')).toHaveText('GetGood Drums Invasion');
  await expect(engineCard(page, 'FROM')).toBeFocused();
});

test('closes the picker on Escape without changing the choice', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  await expect(enginePicker(page, 'TO')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(enginePicker(page, 'TO')).toBeHidden();
  await expect(engineCard(page, 'TO')).toHaveText(/Choose a drum plugin/);
});

test('picks a TO engine and disables it in the FROM picker', async ({ page }) => {
  await page.goto('/');
  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3');
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(page.getByRole('button', { name: REMAPPED })).toBeVisible();

  await engineCard(page, 'FROM').click();
  const taken = enginePicker(page, 'FROM').getByRole('option', { name: 'EZdrummer 3', exact: true });
  await expect(taken).toHaveAttribute('aria-disabled', 'true');
  await taken.click({ force: true });
  await expect(enginePicker(page, 'FROM')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(chosenEngine(page, 'FROM')).toHaveText('GetGood Drums Invasion');
});

test('Swap exchanges the FROM and TO engines', async ({ page }) => {
  await page.goto('/');
  await pickEngine(page, 'FROM', 'invasion', 'GetGood Drums Invasion');
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3');

  await page.getByRole('button', { name: 'Swap FROM and TO' }).click();
  await expect(chosenEngine(page, 'FROM')).toHaveText('EZdrummer 3');
  await expect(chosenEngine(page, 'TO')).toHaveText('GetGood Drums Invasion');
  await engineCard(page, 'FROM').click();
  await expect(enginePicker(page, 'FROM').getByRole('option', { name: 'EZdrummer 3', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
});

test('a starred engine is listed under Favourites on its own side', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  const picker = enginePicker(page, 'TO');
  await picker.getByTestId('star-ezdrummer').click();

  const favourites = picker.getByRole('group', { name: 'Favourites' });
  await expect(favourites.getByRole('option')).toHaveCount(1);
  await expect(favourites.getByRole('option', { name: 'EZdrummer 3', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(engineSide(page, 'TO').getByRole('list', { name: 'Favourites' })).toHaveText(/EZdrummer 3/);
  await expect(engineSide(page, 'FROM').getByRole('list', { name: 'Favourites' })).toHaveCount(0);
});

test('a starred engine is one press away after a reload', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  await enginePicker(page, 'TO').getByTestId('star-ezdrummer').click();
  await page.keyboard.press('Escape');

  await page.reload();
  const quick = engineSide(page, 'TO').getByRole('list', { name: 'Favourites' });
  await quick.getByRole('button', { name: 'EZdrummer 3' }).click();
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(engineSide(page, 'FROM').getByRole('list', { name: 'Favourites' })).toHaveCount(0);
});

test('a favourite restored after a reload can be unstarred', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  await enginePicker(page, 'TO').getByTestId('star-ezdrummer').click();
  await page.keyboard.press('Escape');

  await page.reload();
  await engineCard(page, 'TO').click();
  const picker = enginePicker(page, 'TO');
  await picker.getByRole('group', { name: 'Favourites' }).waitFor();
  await picker.getByTestId('star-ezdrummer').click();
  await expect(picker.getByRole('group', { name: 'Favourites' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(engineSide(page, 'TO').getByRole('list', { name: 'Favourites' })).toHaveCount(0);
});

async function starFourTargets(page: Page) {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  const picker = enginePicker(page, 'TO');
  await picker.getByTestId('star-ezdrummer').click();
  await picker.getByTestId('star-superior_drummer3').click();
  await picker.getByTestId('star-addictive_drums2').click();
  await picker.getByTestId('star-general_midi').click();
  await page.keyboard.press('Escape');
  return engineSide(page, 'TO').getByRole('list', { name: 'Favourites' }).getByRole('button');
}

test('every starred engine waits under its card', async ({ page }) => {
  const quick = await starFourTargets(page);
  await expect(quick).toHaveCount(4);
  await expect(quick.filter({ hasText: 'EZdrummer 3' })).toBeVisible();
  await expect(quick.filter({ hasText: 'Superior Drummer 3' })).toBeVisible();
  await expect(quick.filter({ hasText: 'Addictive Drums 2' })).toBeVisible();
  await expect(quick.filter({ hasText: 'General MIDI' })).toBeVisible();
});

test('a starred engine under its card is chosen in one press and stays there, marked as chosen', async ({ page }) => {
  const quick = await starFourTargets(page);
  await quick.filter({ hasText: 'Superior Drummer 3' }).click();
  await expect(chosenEngine(page, 'TO')).toHaveText('Superior Drummer 3');
  await expect(quick).toHaveCount(4);
  await expect(quick.filter({ hasText: 'Superior Drummer 3' })).toHaveAttribute('aria-pressed', 'true');
  await expect(quick.filter({ hasText: 'EZdrummer 3' })).toHaveAttribute('aria-pressed', 'false');
});

test('choosing another starred engine moves the chosen mark to it', async ({ page }) => {
  const quick = await starFourTargets(page);
  await quick.filter({ hasText: 'Superior Drummer 3' }).click();
  await quick.filter({ hasText: 'EZdrummer 3' }).click();
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(quick.filter({ hasText: 'EZdrummer 3' })).toHaveAttribute('aria-pressed', 'true');
  await expect(quick.filter({ hasText: 'Superior Drummer 3' })).toHaveAttribute('aria-pressed', 'false');
});

const toFilter = (page: Page) => enginePicker(page, 'TO').getByRole('combobox', { name: 'Filter TO engines' });

test('Escape clears a typed filter first, then closes the picker', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  const options = enginePicker(page, 'TO').getByRole('option');
  const all = await options.count();
  await toFilter(page).fill('ezdrummer');
  await expect.poll(() => options.count()).toBeLessThan(all);
  await page.keyboard.press('Escape');
  await expect(toFilter(page)).toHaveValue('');
  await expect(options).toHaveCount(all);
  await page.keyboard.press('Escape');
  await expect(enginePicker(page, 'TO')).toBeHidden();
});

test('arrow keys move the highlight and Enter picks it', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  await toFilter(page).fill('GGD One Kit Wonder');
  const options = enginePicker(page, 'TO').getByRole('option');
  await expect(options.nth(1)).toBeVisible();
  const activeId = () => toFilter(page).getAttribute('aria-activedescendant');
  const before = await activeId();
  await page.keyboard.press('ArrowDown');
  await expect.poll(activeId).not.toBe(before);
  const highlighted = enginePicker(page, 'TO').locator(`[id="${await activeId()}"]`);
  await expect(highlighted).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const name = (await highlighted.getAttribute('aria-label'))!;
  await page.keyboard.press('Enter');
  await expect(enginePicker(page, 'TO')).toBeHidden();
  await expect(chosenEngine(page, 'TO')).toHaveText(name);
});

test('Ctrl+Enter stars the highlighted engine and keeps the picker open', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'TO').click();
  await toFilter(page).fill('EZdrummer 3');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Control+Enter');
  const picker = enginePicker(page, 'TO');
  await expect(picker).toBeVisible();
  await expect(picker.getByTestId('star-ezdrummer')).toHaveText('★');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(engineSide(page, 'TO').getByRole('list', { name: 'Favourites' }).getByRole('button', { name: 'EZdrummer 3' })).toBeVisible();
  await expect(chosenEngine(page, 'TO')).toHaveCount(0);
});

test('a change of the pair after converting takes the result away', async ({ page }) => {
  await openPair(page);
  await addFiles(page, kick('kick.mid'));
  await page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' }).click();
  await expect(page.getByRole('heading', { name: /^1 file converted/ })).toBeVisible();
  await pickEngine(page, 'TO', 'Superior', 'Superior Drummer 3');
  await expect(page.getByRole('heading', { name: /files? converted/ })).toHaveCount(0);
  await seen(page.getByRole('button', { name: 'Convert 1 file to Superior Drummer 3' }));
});

test('the ★ chip of the engine chosen on the other side says why it is not picked', async ({ page }) => {
  await page.goto('/');
  await engineCard(page, 'FROM').click();
  await enginePicker(page, 'FROM').getByTestId('star-ezdrummer').click();
  await page.keyboard.press('Escape');
  await pickEngine(page, 'TO', 'ezdrummer', 'EZdrummer 3');
  const chip = engineSide(page, 'FROM').getByRole('list', { name: 'Favourites' }).getByRole('button', { name: 'EZdrummer 3' });
  await expect(chip).toBeVisible();
  await chip.click({ force: true });
  await expect(page.getByRole('status').filter({ hasText: 'EZdrummer 3 is already the TO engine.' })).toBeVisible();
  await expect(chosenEngine(page, 'FROM')).toHaveCount(0);
  await expect(chosenEngine(page, 'TO')).toHaveText('EZdrummer 3');
  await expect(chip).toBeVisible();
});
