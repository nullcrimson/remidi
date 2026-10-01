import { beforeEach, describe, expect, it, vi } from 'vitest';
import { askAfterDownload, rememberTip, TIP_KEY } from '../src/lib/tipAsk';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 9, 1, 12);

const downloads = (count: number, now = T0) => Array.from({ length: count }, () => askAfterDownload(now));

describe('askAfterDownload', () => {
  beforeEach(() => localStorage.clear());

  it('never asks on the first two files ever saved, and asks on the third', () => {
    expect(downloads(3)).toEqual([false, false, true]);
  });

  it('counts files across visits', () => {
    downloads(2);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
    expect(askAfterDownload(T0 + 3 * DAY)).toBe(true);
  });

  it('asks at most once a day', () => {
    downloads(3);
    expect(askAfterDownload(T0 + HOUR)).toBe(false);
    expect(askAfterDownload(T0 + 23 * HOUR)).toBe(false);
    expect(askAfterDownload(T0 + DAY)).toBe(true);
    expect(askAfterDownload(T0 + DAY + HOUR)).toBe(false);
  });

  it('pauses for 90 days after a tip', () => {
    downloads(3);
    rememberTip(T0 + HOUR);
    expect(askAfterDownload(T0 + 2 * DAY)).toBe(false);
    expect(askAfterDownload(T0 + HOUR + 89 * DAY)).toBe(false);
    expect(askAfterDownload(T0 + HOUR + 90 * DAY)).toBe(true);
  });

  it('starts over from a damaged record', () => {
    localStorage.setItem(TIP_KEY, '{not json');
    expect(downloads(3)).toEqual([false, false, true]);
  });

  it('never asks when storage is blocked', () => {
    const get = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(downloads(5)).toEqual([false, false, false, false, false]);
    get.mockRestore();
    set.mockRestore();
  });
});
