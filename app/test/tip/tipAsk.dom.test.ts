import { beforeEach, describe, expect, it, vi } from 'vitest';
import { amountAnswer, askAfterDownload, rememberTip, showTipPause } from '../../src/tip/tipAsk';
import { storedName } from '../../src/core/storage';
import tip from '../../../content/tip.json';

const TIP_KEY = storedName('tip');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 9, 1, 12);

const downloads = (count: number, now = T0) => Array.from({ length: count }, () => askAfterDownload(now));

describe('askAfterDownload', () => {
  beforeEach(() => localStorage.clear());

  it('never asks on the first two files ever saved, and asks on the third, however quick', () => {
    expect(downloads(3)).toEqual([false, false, true]);
  });

  it('stores the count of saved files', () => {
    downloads(2);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('counts files across visits', () => {
    downloads(2);
    expect(askAfterDownload(T0 + 3 * DAY)).toBe(true);
  });

  it('does not ask again within a day', () => {
    downloads(3);
    expect(askAfterDownload(T0 + HOUR)).toBe(false);
    expect(askAfterDownload(T0 + 23 * HOUR)).toBe(false);
  });

  it('asks again after a day', () => {
    downloads(3);
    expect(askAfterDownload(T0 + DAY)).toBe(true);
  });

  it('waits another day after asking again', () => {
    downloads(3);
    askAfterDownload(T0 + DAY);
    expect(askAfterDownload(T0 + DAY + HOUR)).toBe(false);
  });

  it('pauses for 90 days after a tip', () => {
    downloads(3);
    rememberTip(document.documentElement, T0 + HOUR);
    expect(askAfterDownload(T0 + 2 * DAY)).toBe(false);
    expect(askAfterDownload(T0 + HOUR + 89 * DAY)).toBe(false);
  });

  it('asks again once 90 days after a tip have passed', () => {
    downloads(3);
    rememberTip(document.documentElement, T0 + HOUR);
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

describe('the tip pause on the page root', () => {
  const root = document.documentElement;
  const paused = () => root.hasAttribute('data-tip-paused');

  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-tip-paused');
  });

  it('is marked by remembering a tip', () => {
    rememberTip(root);
    expect(paused()).toBe(true);
  });

  it('is marked from the stored tip when shown', () => {
    localStorage.setItem(TIP_KEY, JSON.stringify({ tippedAt: Date.now() }));
    showTipPause(window);
    expect(paused()).toBe(true);
  });

  it('follows a tip remembered in another tab', () => {
    showTipPause(window);
    expect(paused()).toBe(false);
    localStorage.setItem(TIP_KEY, JSON.stringify({ tippedAt: Date.now() }));
    window.dispatchEvent(new StorageEvent('storage', { key: TIP_KEY }));
    expect(paused()).toBe(true);
  });

  it('is cleared once the stored tip no longer pauses the asks', () => {
    localStorage.setItem(TIP_KEY, JSON.stringify({ tippedAt: Date.now() }));
    showTipPause(window);
    localStorage.setItem(TIP_KEY, JSON.stringify({ tippedAt: Date.now() - 90 * DAY }));
    window.dispatchEvent(new StorageEvent('storage', { key: TIP_KEY }));
    expect(paused()).toBe(false);
  });
});
