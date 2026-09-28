import type { Page } from '@playwright/test';
import { DRUMS, expect, midi, openPair, test } from './fixtures';

async function drop(page: Page, name: string, bytes: Buffer) {
  const dataTransfer = await page.evaluateHandle(
    ({ name, data }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data)], name));
      return dt;
    },
    { name, data: [...bytes] },
  );
  await page.dispatchEvent('main', 'dragenter', { dataTransfer });
  await expect(page.getByText('DROP .MID')).toBeVisible();
  await page.dispatchEvent('main', 'drop', { dataTransfer });
  await expect(page.getByText('DROP .MID')).toBeHidden();
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
