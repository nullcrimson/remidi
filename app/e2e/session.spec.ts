import { expect, openPair, test } from './fixtures';
import { leaveEditor, openEditor, press, retarget, targetNote } from './steps';

test('the last engines, settings and unsaved edits come back on a fresh visit', async ({ page }) => {
  await openPair(page);
  await press(page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2'));
  await page.getByRole('combobox', { name: 'Drum channel' }).selectOption('All channels');
  await press(page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }));
  await openEditor(page);
  await retarget(page, 'Kick', 'F1');
  await leaveEditor(page);

  await page.goto('/');
  await expect(page.getByRole('group', { name: 'FROM engine' }).getByTestId('chosen-engine'))
    .toHaveText('GetGood Drums Invasion');
  await expect(page.getByRole('group', { name: 'TO engine' }).getByTestId('chosen-engine'))
    .toHaveText('EZdrummer 3');
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Drum channel' })).toHaveValue('all');
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  await expect(page.getByRole('button', { name: '1 drum edited — review changes', exact: true })).toBeVisible();

  await openEditor(page);
  await expect(targetNote(page, 'Kick')).toHaveText('F1');
});

test('a link with engines wins over the remembered ones and keeps the settings', async ({ page }) => {
  await openPair(page);
  await press(page.getByRole('radiogroup', { name: 'Octaves start at' }).getByText('C-2'));
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();

  await page.goto('/?from=ezdrummer&to=general_midi');
  await expect(page.getByRole('group', { name: 'FROM engine' }).getByTestId('chosen-engine'))
    .toHaveText('EZdrummer 3');
  await expect(page.getByRole('group', { name: 'TO engine' }).getByTestId('chosen-engine'))
    .toHaveText(/General MIDI/);
  await expect(page.getByRole('radio', { name: 'C-2' })).toBeChecked();
});
