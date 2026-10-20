import { expect, test } from './fixtures';
import { chosenEngine, engineCard, enginePicker, engineSide, pickEngine } from './steps';

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
  await expect(page.getByRole('button', { name: /of \d+ drums remapped/ })).toBeVisible();

  await engineCard(page, 'FROM').click();
  await expect(enginePicker(page, 'FROM').getByRole('option', { name: 'EZdrummer 3', exact: true }))
    .toHaveAttribute('aria-disabled', 'true');
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
});

test('every starred engine waits under its card and is chosen in one press', async ({ page }) => {
  const starred = ['EZdrummer 3', 'Superior Drummer 3', 'Addictive Drums 2', 'General MIDI'];
  await page.goto('/');
  await engineCard(page, 'TO').click();
  const picker = enginePicker(page, 'TO');
  for (const id of ['ezdrummer', 'superior_drummer3', 'addictive_drums2', 'general_midi']) {
    await picker.getByTestId(`star-${id}`).click();
  }
  await page.keyboard.press('Escape');

  const quick = engineSide(page, 'TO').getByRole('list', { name: 'Favourites' }).getByRole('button');
  await expect(quick).toHaveCount(starred.length);
  for (const name of starred) await expect(quick.filter({ hasText: name })).toBeVisible();

  await quick.filter({ hasText: 'Superior Drummer 3' }).click();
  await expect(chosenEngine(page, 'TO')).toHaveText('Superior Drummer 3');
  await expect(quick).toHaveCount(starred.length - 1);
  await expect(quick.filter({ hasText: 'Superior Drummer 3' })).toHaveCount(0);
});
