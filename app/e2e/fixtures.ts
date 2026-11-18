import { expect, test as base, type Page } from '@playwright/test';
import { parseMidi, writeMidi, type MidiEvent } from 'midi-file';

export { expect };

/** Cloudflare Web Analytics and Umami, the only third parties the pages may reach. */
export const ANALYTICS = /^https:\/\/((static\.)?cloudflareinsights\.com|(cloud|gateway)\.umami\.is)\//;

/**
 * Playwright's `test`, failing any test whose page logs an error (CSP violations
 * included), throws, or requests another origin than the analytics ones. Analytics
 * requests are aborted so test runs never count as visits; the aborted loads' console
 * errors are expected.
 */
export const test = base.extend<{ pageErrors: string[]; foreignRequests: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        const text = `${m.text()} ${m.location().url}`;
        if (m.type() === 'error' && !ANALYTICS.test(m.location().url)) errors.push(text);
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
  foreignRequests: [
    async ({ page, baseURL }, use) => {
      const foreign: string[] = [];
      await page.route(ANALYTICS, (route) => route.abort());
      page.on('request', (r) => {
        const url = new URL(r.url());
        const web = url.protocol === 'http:' || url.protocol === 'https:';
        if (web && url.origin !== new URL(baseURL!).origin && !ANALYTICS.test(r.url())) {
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

/** A track's hits, or its hits under a track name. */
type Track = Hit[] | { name: string; hits: Hit[] };

function trackOf(track: Track): MidiEvent[] {
  const { name, hits } = Array.isArray(track) ? { name: null, hits: track } : track;
  const named: MidiEvent[] = name === null ? [] : [{ deltaTime: 0, meta: true, type: 'trackName', text: name }];
  const events: MidiEvent[] = hits.flatMap(({ channel, key, length = 48, gap = 0 }) => [
    { deltaTime: gap, type: 'noteOn', channel: channel - 1, noteNumber: key, velocity: 100 },
    { deltaTime: length, type: 'noteOff', channel: channel - 1, noteNumber: key, velocity: 0 },
  ]);
  return [...named, ...events, { deltaTime: 0, meta: true, type: 'endOfTrack' }];
}

/** A Standard MIDI File with one track per list of hits. */
export function midi(...tracks: Track[]): Buffer {
  return Buffer.from(
    writeMidi({
      header: { format: tracks.length > 1 ? 1 : 0, numTracks: tracks.length, ticksPerBeat: 480 },
      tracks: tracks.map(trackOf),
    }),
  );
}

/** A `.mid` file for `setInputFiles`. */
export function midFile(name: string, ...tracks: Track[]) {
  return { name, mimeType: 'audio/midi', buffer: midi(...tracks) };
}

/** `file` without its last `n` bytes, as a download that broke off leaves it. */
export function cut(file: ReturnType<typeof midFile>, n: number) {
  return { ...file, buffer: file.buffer.subarray(0, file.buffer.length - n) };
}

/** Every note-on with a velocity, across tracks, in order: its channel (1..=16) and key. */
export function hitsOf(bytes: Uint8Array): Hit[] {
  return parseMidi(bytes).tracks.flatMap((track) =>
    track.flatMap((e) => (e.type === 'noteOn' && e.velocity > 0 ? [{ channel: e.channel + 1, key: e.noteNumber }] : [])),
  );
}

/** Keys of every note-on with a velocity, across tracks, in order. */
export function hitKeys(bytes: Uint8Array): number[] {
  return hitsOf(bytes).map((hit) => hit.key);
}

export const DRUMS = 10;

/** GetGood Drums Invasion's kick on the drum channel, as the file `name`. */
export const kick = (name: string) => midFile(name, [{ channel: DRUMS, key: 24 }]);

/** GetGood Drums Invasion's kick and China, on the drum channel. */
export const kickAndChina = () => midFile('groove.mid', [
  { channel: DRUMS, key: 24 },
  { channel: DRUMS, key: 65, gap: 48 },
]);

export const HALPERN = "GGD Invasion (Mapping 'Halpern')";

/** The engine the advice suggests for the Toontrack groove read as anything but a Toontrack layout. */
export const SUGGESTED = 'EZdrummer 3';

/** The notes of the Toontrack layout the groove plays: hat pedal, closed edge, open hats, kicks, snare, tight tip and a crash. */
export const TOONTRACK_NOTES = [21, 22, 25, 34, 36, 38, 46, 63, 86];

/** A groove in the Toontrack layout, `times` hits on each of its notes. */
export const toontrackGroove = (times: number) => midFile('toontrack.mid', TOONTRACK_NOTES
  .flatMap((key) => Array.from({ length: times }, () => ({ channel: DRUMS, key, gap: 48 }))));

/** Opens the converter with GetGood Drums Invasion → EZdrummer chosen. */
export async function openPair(page: Page) {
  await page.goto('/?from=ggd_invasion&to=ezdrummer');
}

export async function addFiles(page: Page, ...files: ReturnType<typeof midFile>[]) {
  await page.getByTestId('file-input').setInputFiles(files);
}
