import { expect, test as base, type Page } from '@playwright/test';
import { parseMidi, writeMidi, type MidiEvent } from 'midi-file';

export { expect };

/** Cloudflare Web Analytics, the one third party the pages may reach. */
export const BEACON = /^https:\/\/(static\.)?cloudflareinsights\.com\//;

/**
 * Playwright's `test`, failing any test whose page logs an error (CSP violations
 * included), throws, or requests another origin than the beacon's. Beacon requests are
 * aborted so test runs never count as visits; the aborted load's console error is
 * expected.
 */
export const test = base.extend<{ pageErrors: string[]; foreignRequests: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        const text = `${m.text()} ${m.location().url}`;
        if (m.type() === 'error' && !BEACON.test(m.location().url)) errors.push(text);
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
  foreignRequests: [
    async ({ page, baseURL }, use) => {
      const foreign: string[] = [];
      await page.route(BEACON, (route) => route.abort());
      page.on('request', (r) => {
        const url = new URL(r.url());
        const web = url.protocol === 'http:' || url.protocol === 'https:';
        if (web && url.origin !== new URL(baseURL!).origin && !BEACON.test(r.url())) {
          foreign.push(r.url());
        }
      });
      await use(foreign);
      expect(foreign).toEqual([]);
    },
    { auto: true },
  ],
});

/** A note: channel counted 1..=16, key, ticks it lasts, ticks after the previous note. */
export interface Hit {
  channel: number;
  key: number;
  length?: number;
  gap?: number;
}

function trackOf(hits: Hit[]): MidiEvent[] {
  const events: MidiEvent[] = hits.flatMap(({ channel, key, length = 48, gap = 0 }) => [
    { deltaTime: gap, type: 'noteOn', channel: channel - 1, noteNumber: key, velocity: 100 },
    { deltaTime: length, type: 'noteOff', channel: channel - 1, noteNumber: key, velocity: 0 },
  ]);
  return [...events, { deltaTime: 0, meta: true, type: 'endOfTrack' }];
}

/** A Standard MIDI File with one track per list of hits. */
export function midi(...tracks: Hit[][]): Buffer {
  return Buffer.from(
    writeMidi({
      header: { format: tracks.length > 1 ? 1 : 0, numTracks: tracks.length, ticksPerBeat: 480 },
      tracks: tracks.map(trackOf),
    }),
  );
}

/** A `.mid` file for `setInputFiles`. */
export function midFile(name: string, ...tracks: Hit[][]) {
  return { name, mimeType: 'audio/midi', buffer: midi(...tracks) };
}

/** Keys of every note-on with a velocity, across tracks, in order. */
export function hitKeys(bytes: Uint8Array): number[] {
  return parseMidi(bytes).tracks.flatMap((track) =>
    track.flatMap((e) => (e.type === 'noteOn' && e.velocity > 0 ? [e.noteNumber] : [])),
  );
}

export const DRUMS = 10;

/** GetGood Drums Invasion's kick and China, on the drum channel. */
export const kickAndChina = () => midFile('groove.mid', [
  { channel: DRUMS, key: 24 },
  { channel: DRUMS, key: 65, gap: 48 },
]);

/** Opens the converter with GetGood Drums Invasion → EZdrummer chosen. */
export async function openPair(page: Page) {
  await page.goto('/?from=ggd_invasion&to=ezdrummer');
}

export async function addFiles(page: Page, ...files: ReturnType<typeof midFile>[]) {
  await page.getByTestId('file-input').setInputFiles(files);
}
