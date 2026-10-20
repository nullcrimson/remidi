import type { Page } from '@playwright/test';
import { LOCALE_CODES } from '../src/generated/localeCodes';
import { expect } from './fixtures';
import { PSEUDO } from './messages';

/** Whether the page scrolls sideways. */
const overflowing = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

/** Text cut off by its box: clipped elements and input placeholders wider than their field. */
export const clipped = (page: Page) => page.evaluate(() => {
  const out: string[] = [];
  const visible = (el: Element) => {
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1 && getComputedStyle(el).visibility !== 'hidden' && el.checkVisibility({ opacityProperty: true });
  };
  for (const el of document.querySelectorAll<HTMLElement>('button, a, label, th, h1, h2, h3, [role=tab], [role=button], span, p, li')) {
    if (!visible(el) || !el.textContent?.trim()) continue;
    const s = getComputedStyle(el);
    const cut = ['hidden', 'clip'].includes(s.overflowX) || (s.whiteSpace.startsWith('nowrap') && s.display !== 'inline');
    if (s.textOverflow !== 'ellipsis' && cut && el.scrollWidth > el.clientWidth + 1) out.push(el.textContent.trim().slice(0, 60));
  }
  const ctx = document.createElement('canvas').getContext('2d')!;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[placeholder]')) {
    if (!visible(input)) continue;
    const s = getComputedStyle(input);
    ctx.font = s.font;
    const room = input.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    if (ctx.measureText(input.placeholder).width > room + 1) out.push(`placeholder: ${input.placeholder}`);
  }
  return out;
});

/** Main-nav labels broken across lines. */
const brokenNav = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll<HTMLElement>('header nav > ul > li > a')]
    .filter((a) => a.getClientRects().length > 1 || a.getBoundingClientRect().height > parseFloat(getComputedStyle(a).lineHeight) * 1.5)
    .map((a) => a.textContent?.trim() ?? ''),
);

/** The shipped locales besides English, which the pseudo-locale stands in for. */
export const SHIPPED = LOCALE_CODES.filter((code) => code !== 'en');

/** The locales the layout tests check: the shipped ones and the pseudo-locale. */
export const LOCALES = [PSEUDO, ...SHIPPED];

/** The static page checked at every viewport: its header and nav are the static pages' own. */
export const EVERY_VIEWPORT_PAGE = 'engines/';

/** The other static pages, one of each kind, checked on the phone, where text runs out of room first. */
export const PHONE_PAGES = ['engines/ezdrummer/', 'convert/ggd-invasion-to-ezdrummer/', 'drum-maps/', 'how-it-works/', 'faq/', 'terms/', 'thanks/'];

/** Fails when the page scrolls sideways, clips text or breaks a nav label over two lines. */
export async function fits(page: Page, state: string) {
  expect(await overflowing(page), `${state}: page scrolls sideways`).toBe(false);
  expect(await clipped(page), `${state}: clipped text`).toEqual([]);
  expect(await brokenNav(page), `${state}: nav label on two lines`).toEqual([]);
}
