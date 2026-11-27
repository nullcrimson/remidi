import { beforeEach, describe, expect, it, vi } from 'vitest';
import { amountAnswer, askAfterDownload, rememberTip } from '../../src/tip/tipAsk';
import { storedName } from '../../src/core/storage';
import tip from '../../../content/tip.json';

const TIP_KEY = storedName('tip');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 9, 1, 12);

const APART = 60 * 1000;

/** Saves `count` files a minute apart, the last one at `now`. */
const downloads = (count: number, now = T0) =>
  Array.from({ length: count }, (_, i) => askAfterDownload(now - (count - 1 - i) * APART));

describe('askAfterDownload', () => {
  beforeEach(() => localStorage.clear());

  it('never asks on the first file ever saved, and asks on the second', () => {
    expect(downloads(2)).toEqual([false, true]);
  });

  it('stores the count of saved files', () => {
    downloads(2);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('counts files saved within ten seconds of the previous one as one task', () => {
    expect([askAfterDownload(T0), askAfterDownload(T0 + 4_000), askAfterDownload(T0 + 8_000)]).toEqual([false, false, false]);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 1 });
  });

  it('counts a file saved ten seconds after the previous one', () => {
    askAfterDownload(T0);
    expect(askAfterDownload(T0 + 10_000)).toBe(true);
  });

  it('counts a file saved before the previous one, as after a clock change', () => {
    askAfterDownload(T0);
    expect(askAfterDownload(T0 - APART)).toBe(true);
  });

  it('counts files across visits', () => {
    downloads(1);
    expect(askAfterDownload(T0 + 3 * DAY)).toBe(true);
  });

  it('does not ask again within a day', () => {
    downloads(2);
    expect(askAfterDownload(T0 + HOUR)).toBe(false);
    expect(askAfterDownload(T0 + 23 * HOUR)).toBe(false);
  });

  it('asks again after a day', () => {
    downloads(2);
    expect(askAfterDownload(T0 + DAY)).toBe(true);
  });

  it('waits another day after asking again', () => {
    downloads(2);
    askAfterDownload(T0 + DAY);
    expect(askAfterDownload(T0 + DAY + HOUR)).toBe(false);
  });

  it('pauses for 90 days after a tip', () => {
    downloads(2);
    rememberTip(T0 + HOUR);
    expect(askAfterDownload(T0 + 2 * DAY)).toBe(false);
    expect(askAfterDownload(T0 + HOUR + 89 * DAY)).toBe(false);
  });

  it('asks again once 90 days after a tip have passed', () => {
    downloads(2);
    rememberTip(T0 + HOUR);
    expect(askAfterDownload(T0 + HOUR + 90 * DAY)).toBe(true);
  });

  it('starts over from a damaged record', () => {
    localStorage.setItem(TIP_KEY, '{not json');
    expect(downloads(2)).toEqual([false, true]);
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

  it('never asks when storage reads but does not save', () => {
    localStorage.setItem(TIP_KEY, JSON.stringify({ downloads: 9, shownAt: T0 - 2 * DAY, tippedAt: null }));
    const set = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(downloads(3)).toEqual([false, false, false]);
    set.mockRestore();
  });
});

describe('amountAnswer', () => {
  it('names a listed amount by its euros', () => {
    expect(amountAnswer(5)).toBe('5');
  });

  it('names no listed amount other', () => {
    expect(tip.amounts.map(({ euros }) => amountAnswer(euros))).not.toContain('other');
  });

  it('names an amount that is not listed as other', () => {
    expect(amountAnswer(7)).toBe('other');
  });
});
