import { fileURLToPath } from 'node:url';
import { storedName, type StorageKey } from '../src/core/storage';
import { addFiles, DRUMS, expect, midFile, openPair, test } from './fixtures';
import { engineSide, openSettings, saved } from './steps';

const SCREENSHOT = fileURLToPath(new URL('../../docs/screenshot.png', import.meta.url));

const PRESETS = [
  {
    id: 'kick-e2',
    name: 'Kick on E2',
    src: 'ggd_invasion',
    tgt: 'ezdrummer',
    edits: { 'kick.main': 40 },
    srcEdits: {},
    updatedAt: 2,
  },
  {
    id: 'live-set',
    name: 'Live set',
    src: 'ggd_architects',
    tgt: 'superior_drummer3',
    edits: { 'snare1.hit': 38 },
    srcEdits: {},
    updatedAt: 1,
  },
];

const STORED: [StorageKey, unknown][] = [
  ['favorites:from', ['ggd_invasion', 'ggd_architects', 'superior_drummer3']],
  ['favorites:to', ['ezdrummer', 'superior_drummer3', 'addictive_drums2']],
  ['mappings', { version: 1, items: PRESETS }],
  ['tip', { downloads: 0, shownAt: null, tippedAt: Date.now() }],
];

const groove = (name: string, keys: number[]) =>
  midFile(name, keys.map((key, i) => ({ channel: DRUMS, key, gap: i === 0 ? 0 : 48 })));

test('the README screenshot shows the converter with every step in use', async ({ page }) => {
  await page.addInitScript((entries) => {
    for (const [name, value] of entries) localStorage.setItem(name, value);
  }, STORED.map(([key, value]) => [storedName(key), JSON.stringify(value)] as const));
  await openPair(page);
  await addFiles(page, groove('verse.mid', [24, 26, 30, 24, 26, 30]), groove('chorus.mid', [24, 49, 26, 57, 24, 26]));

  await openSettings(page);
  await page.getByRole('radiogroup', { name: 'Missing drums' }).getByText('Drop', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Drop' })).toBeChecked();
  const fold = page.getByTestId('settings-fold');
  await fold.locator('summary').click();
  await expect(fold).not.toHaveAttribute('open');

  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.getByText('verse.mid', { exact: true }).scrollIntoViewIfNeeded();

  const shown = [
    engineSide(page, 'FROM').getByRole('list', { name: 'Favourites' }),
    engineSide(page, 'TO').getByRole('list', { name: 'Favourites' }),
    saved(page).getByRole('button', { name: /^Kick on E2/ }),
    saved(page).getByRole('button', { name: /^Live set/ }),
    page.getByText('verse.mid', { exact: true }),
    page.getByText('chorus.mid', { exact: true }),
    page.getByRole('button', { name: /Edit individual notes/ }),
    page.getByRole('button', { name: /^Download an Ableton rack for / }),
    fold.locator('summary').getByText('Drop', { exact: true }),
  ];
  for (const element of shown) {
    await expect(element).toBeVisible();
    await expect(element).toBeInViewport();
  }
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await page.screenshot({ path: SCREENSHOT });
});
