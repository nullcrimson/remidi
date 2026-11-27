import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storedName } from '../../src/core/storage';
import { runTipScript } from '../../src/tip/pageTip';
import { fakeUmami } from '../umami';

const TIP_KEY = storedName('tip');
const T0 = Date.UTC(2026, 9, 1, 12);
const MINUTE = 60 * 1000;

const PAGE = `
  <main>
    <div data-tip-toast hidden role="group" aria-label="Leave a tip" class="tip-toast">
      <p>If it saved you some remapping, a coffee keeps it free.</p>
      <button type="button" aria-label="Close" data-tip-close>×</button>
      <ul>
        <li><a href="https://buy.stripe.com/three" target="_blank" rel="noopener" data-euros="3"></a></li>
        <li><a href="https://buy.stripe.com/five" target="_blank" rel="noopener" data-euros="5"></a></li>
        <li><a href="https://buy.stripe.com/other" target="_blank" rel="noopener">Other amount</a></li>
      </ul>
    </div>
    <span data-download="drum-map"><a href="/files/reaper.txt" download="reaper.txt"><svg><path /></svg>Reaper</a></span>
    <span data-download="note-map"><a href="/files/map.pdf" download="map.pdf">PDF</a></span>
    <a href="/engines/">All engines</a>
    <input type="search" aria-label="Filter" />
  </main>`;

const toast = () => document.querySelector<HTMLElement>('[data-tip-toast]')!;
const link = (name: string) => [...document.querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.textContent === name)!;
const now = vi.spyOn(Date, 'now');
const umami = fakeUmami();

function start({ phone = false, lang = 'en' } = {}) {
  document.documentElement.lang = lang;
  runTipScript(document, () => phone);
}

function download(name = 'Reaper', at = T0 + MINUTE) {
  now.mockReturnValue(at);
  const clicked = new MouseEvent('click', { bubbles: true, cancelable: true });
  const target = name === 'Reaper' ? document.querySelector('svg path')! : link(name);
  target.dispatchEvent(clicked);
  return clicked;
}

describe('the tip ask of the static pages', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    localStorage.setItem(TIP_KEY, JSON.stringify({ downloads: 2 }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    now.mockReset();
  });

  it('shows on a counted download, a click on the icon inside the link included, and never holds the download up', () => {
    start();
    expect(download().defaultPrevented).toBe(false);
    expect(toast().hidden).toBe(false);
    expect(umami).toHaveBeenCalledWith('tip-asked', { after: 'drum-map', page: 'page' });
  });

  it('names the kind of download that raised it', () => {
    start();
    download('PDF');
    expect(umami).toHaveBeenCalledWith('tip-asked', { after: 'note-map', page: 'page' });
  });

  it('asks nothing on the first two downloads', () => {
    localStorage.clear();
    start();
    download();
    download('PDF');
    expect(toast().hidden).toBe(true);
  });

  it('counts no other link', () => {
    start();
    download('All engines');
    expect(toast().hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('counts no download on a phone', () => {
    start({ phone: true });
    download();
    expect(toast().hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('writes the amounts in the page\'s language', () => {
    start({ lang: 'de' });
    const amounts = [...toast().querySelectorAll('a[data-euros]')].map((a) => a.textContent);
    expect(amounts).toEqual([expect.stringMatching(/^3\s€$/), expect.stringMatching(/^5\s€$/)]);
  });

  it('closes with its close button, counts closed and gives focus back to the download', () => {
    start();
    download();
    const close = toast().querySelector<HTMLButtonElement>('[data-tip-close]')!;
    close.focus();
    close.click();
    expect(toast().hidden).toBe(true);
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'closed', where: 'toast', page: 'page' });
    expect(document.activeElement).toBe(document.querySelector('[data-download="drum-map"] a'));
  });

  it('closes on Escape inside it', () => {
    start();
    download();
    toast().querySelector('a')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toast().hidden).toBe(true);
  });

  it('leaves Escape outside it alone, shown or hidden', () => {
    start();
    document.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    download();
    document.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toast().hidden).toBe(false);
    expect(umami).not.toHaveBeenCalledWith('tip-answered', expect.anything());
  });

  it('remembers a tip chosen by amount and counts it', () => {
    start();
    download();
    link('€5').click();
    expect(toast().hidden).toBe(true);
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: '5', where: 'toast', page: 'page' });
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!).tippedAt).toEqual(expect.any(Number));
  });

  it('counts the other amount as other', () => {
    start();
    download();
    link('Other amount').click();
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'toast', page: 'page' });
  });

  it('remembers a tip on the thanks page', () => {
    document.body.innerHTML = '<main><h1 data-tipped>Thank you!</h1></main>';
    start();
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!).tippedAt).toEqual(expect.any(Number));
  });

  it('throws on a download kind it does not know', () => {
    document.querySelector('[data-download="drum-map"]')!.setAttribute('data-download', 'zip');
    expect(() => start()).toThrow('data-download="zip" names no download tip-asked knows');
  });
});
