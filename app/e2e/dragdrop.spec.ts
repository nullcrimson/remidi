import type { Page } from '@playwright/test';
import { DRUMS, expect, midi, openPair, test } from './fixtures';
import { chipMenu, exportedPreset, leaveEditor, openEditor, presetChip, saveKickPreset } from './steps';

async function drop(page: Page, name: string, bytes: Buffer, ...more: { name: string; bytes: Buffer }[]) {
  const files = [{ name, bytes }, ...more].map((f) => ({ name: f.name, data: [...f.bytes] }));
  const dataTransfer = await page.evaluateHandle(
    (dropped) => {
      const dt = new DataTransfer();
      for (const f of dropped) dt.items.add(new File([new Uint8Array(f.data)], f.name));
      return dt;
    },
    files,
  );
  await page.dispatchEvent('main', 'dragenter', { dataTransfer });
  await expect(page.getByText('DROP .MID', { exact: true })).toBeVisible();
  await page.dispatchEvent('main', 'drop', { dataTransfer });
  await expect(page.getByText('DROP .MID', { exact: true })).toBeHidden();
}

test('a dropped MIDI file joins the list', async ({ page }) => {
  await openPair(page);
  await drop(page, 'dropped.mid', midi([{ channel: DRUMS, key: 24 }]));
  await expect(page.getByText('dropped.mid')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Convert/ })).toBeEnabled();
});

test('a dropped file of another type is refused with a reason', async ({ page }) => {
  await openPair(page);
  await drop(page, 'notes.txt', Buffer.from('not midi'));
  await expect(page.getByText(/Skipped notes\.txt — only \.mid files/)).toBeVisible();
});

test('a .mid and a .txt dropped together: the first joins, the second is named as skipped', async ({ page }) => {
  await openPair(page);
  await drop(page, 'groove.mid', midi([{ channel: DRUMS, key: 24 }]), { name: 'notes.txt', bytes: Buffer.from('not midi') });
  await expect(page.locator('[data-state]').filter({ hasText: 'groove.mid' })).toBeVisible();
  await expect(page.getByText(/Skipped notes\.txt — only \.mid files/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' })).toBeEnabled();
});

test('a dropped preset file is imported', async ({ page }) => {
  await saveKickPreset(page, 'Dropped kit');
  const file = await exportedPreset(page, 'Dropped kit');
  await chipMenu(page, 'Dropped kit', 'Delete');
  await expect(presetChip(page, 'Dropped kit')).toHaveCount(0);
  await drop(page, 'Dropped kit.json', file);
  await expect(page.getByText("Imported 'Dropped kit'.")).toBeVisible();
  await expect(presetChip(page, 'Dropped kit')).toBeVisible();
});

test('a file dropped while the note editor is open joins the list', async ({ page }) => {
  await openPair(page);
  await openEditor(page);
  await drop(page, 'late.mid', midi([{ channel: DRUMS, key: 24 }]));
  await expect(page.getByRole('heading', { name: 'Edit notes' })).toBeVisible();
  await leaveEditor(page);
  await expect(page.locator('[data-state]').filter({ hasText: 'late.mid' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert 1 file to EZdrummer 3' })).toBeEnabled();
});
