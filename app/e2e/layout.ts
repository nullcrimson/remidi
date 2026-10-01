import type { Page } from '@playwright/test';

/** Whether the page scrolls sideways. */
export const overflowing = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

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
export const brokenNav = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll<HTMLElement>('header nav > ul > li > a')]
    .filter((a) => a.getClientRects().length > 1 || a.getBoundingClientRect().height > parseFloat(getComputedStyle(a).lineHeight) * 1.5)
    .map((a) => a.textContent?.trim() ?? ''),
);
