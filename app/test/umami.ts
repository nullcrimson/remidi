import { afterEach, beforeEach, vi, type Mock } from 'vitest';

type Track = NonNullable<Window['umami']>['track'];

/** Installs a fake Umami on the page for each test and returns its `track`. */
export function fakeUmami(): Mock<Track> {
  const track = vi.fn<Track>();
  beforeEach(() => {
    track.mockClear();
    window.umami = { track };
  });
  afterEach(() => {
    delete window.umami;
  });
  return track;
}
