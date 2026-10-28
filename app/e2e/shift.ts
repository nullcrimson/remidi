import { setTimeout as sleep } from 'node:timers/promises';
import type { Page, Route } from '@playwright/test';

/** A desktop window, as layout shift is measured at. */
export const DESKTOP = { width: 1350, height: 940 };

/** A common phone, as layout shift is measured at. */
export const PHONE = { width: 412, height: 823 };

const LATE_MS = 1000;

/** Adds up the page's layout shifts that no input caused, from its first paint on. */
export async function watchShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { shift: number };
    w.shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.shift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** The layout shift so far, read once two more frames have painted. */
export const settledShift = (page: Page) => page.evaluate(() => new Promise<number>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve((window as unknown as { shift: number }).shift)));
}));

/** Holds every request matching `pattern` for `ms`, then answers it with `then`: by default, lets it through. */
export async function delayed(page: Page, pattern: string, ms: number, then: (route: Route) => Promise<void> = (route) => route.continue()) {
  await page.route(pattern, async (route) => {
    await sleep(ms);
    await then(route);
  });
}

/** The layout shift of `path` loaded with the requests matching `late` held back. */
export async function lateShift(page: Page, path: string, late: string) {
  await watchShifts(page);
  await delayed(page, late, LATE_MS);
  await page.goto(path);
  await page.waitForLoadState('load');
  return settledShift(page);
}
