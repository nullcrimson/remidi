import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { storedName } from '../../src/core/storage';
import { runTipScript } from '../../src/tip/pageTip';
import { fakeUmami } from '../umami';

const TIP_KEY = storedName('tip');

const PAGE = `
  <main>
    <div data-tip-toast hidden role="group" aria-label="Leave a tip" class="tip-toast">
      <p>If it saved you some remapping, a coffee keeps it free.</p>
      <button type="button" aria-label="Close" data-tip-close>×</button>
      <ul>
        <li><a href="https://buy.stripe.com/three" target="_blank" rel="noopener" data-euros="3"></a></li>
        <li><a href="https://buy.stripe.com/five" target="_blank" rel="noopener" data-euros="5"></a></li>
        <li><a href="https://buy.stripe.com/other" target="_blank" rel="noopener" data-tip-other>Other amount</a></li>
      </ul>
    </div>
    <span data-download="drum-map"><a href="/files/reaper.txt" download="reaper.txt"><svg><path /></svg>Reaper</a></span>
    <span data-download="note-map"><a href="/files/map.pdf" download="map.pdf">PDF</a></span>
    <a href="/engines/">All engines</a>
    <input type="search" aria-label="Filter" />
  </main>`;

const toast = () => document.querySelector<HTMLElement>('[data-tip-toast]')!;
const link = (name: string) => [...document.querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.textContent === name)!;
const reaper = () => document.querySelector<HTMLAnchorElement>('[data-download="drum-map"] a')!;
const umami = fakeUmami();

function start({ phone = false, lang = 'en' } = {}) {
  document.documentElement.lang = lang;
  runTipScript(window, () => phone);
}

function click(target: Element) {
  const clicked = new MouseEvent('click', { bubbles: true, cancelable: true });
  target.dispatchEvent(clicked);
  return clicked;
}

const escape = (target: Element) => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

describe('the tip ask of the static pages', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    localStorage.setItem(TIP_KEY, JSON.stringify({ downloads: 2 }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-tip-paused');
  });

  it('shows on a download that the rule asks after, and counts the ask with its kind of download', () => {
    start();
    click(reaper());
    expect(toast().hidden).toBe(false);
    expect(umami).toHaveBeenCalledWith('tip-asked', { site: 'static', after: 'drum-map' });
  });

  it('counts a click on the icon inside a download link', () => {
    start();
    click(document.querySelector('svg path')!);
    expect(toast().hidden).toBe(false);
  });

  it('never holds the download up', () => {
    start();
    expect(click(reaper()).defaultPrevented).toBe(false);
  });

  it('names the kind of download that raised it', () => {
    start();
    click(link('PDF'));
    expect(umami).toHaveBeenCalledWith('tip-asked', { site: 'static', after: 'note-map' });
  });

  it('asks nothing while the rule says no', () => {
    localStorage.clear();
    start();
    click(reaper());
    expect(toast().hidden).toBe(true);
  });

  it('counts no other link', () => {
    start();
    click(link('All engines'));
    expect(toast().hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('counts no download on a phone', () => {
    start({ phone: true });
    click(reaper());
    expect(toast().hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!)).toMatchObject({ downloads: 2 });
  });

  it('writes the amounts in the page\'s language', () => {
    start({ lang: 'de' });
    const amounts = [...toast().querySelectorAll('a[data-euros]')].map((a) => a.textContent);
    expect(amounts).toEqual([expect.stringMatching(/^3\s€$/), expect.stringMatching(/^5\s€$/)]);
  });

  it('closes with its close button', () => {
    start();
    click(reaper());
    click(toast().querySelector('[data-tip-close]')!);
    expect(toast().hidden).toBe(true);
  });

  it('counts closing as closed', () => {
    start();
    click(reaper());
    click(toast().querySelector('[data-tip-close]')!);
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'closed', where: 'toast', site: 'static' });
  });

  it('gives focus back to the download when closed from inside', () => {
    start();
    click(reaper());
    const close = toast().querySelector<HTMLButtonElement>('[data-tip-close]')!;
    close.focus();
    click(close);
    expect(document.activeElement).toBe(reaper());
  });

  it('closes on Escape inside it', () => {
    start();
    click(reaper());
    escape(toast().querySelector('a')!);
    expect(toast().hidden).toBe(true);
  });

  it('leaves Escape outside it alone, shown or hidden', () => {
    start();
    escape(document.querySelector('input')!);
    click(reaper());
    escape(document.querySelector('input')!);
    expect(toast().hidden).toBe(false);
    expect(umami).not.toHaveBeenCalledWith('tip-answered', expect.anything());
  });

  it('closes once an amount is chosen', () => {
    start();
    click(reaper());
    click(link('€5'));
    expect(toast().hidden).toBe(true);
  });

  it('remembers a tip chosen by amount', () => {
    start();
    click(reaper());
    click(link('€5'));
    expect(JSON.parse(localStorage.getItem(TIP_KEY)!).tippedAt).toEqual(expect.any(Number));
  });

  it('counts an amount by its euros', () => {
    start();
    click(reaper());
    click(link('€5'));
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: '5', where: 'toast', site: 'static' });
  });

  it('counts the other amount as other', () => {
    start();
    click(reaper());
    click(link('Other amount'));
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'toast', site: 'static' });
  });

  it('marks the root while a tip pauses the asks, also on a page without a tip ask', () => {
    document.body.innerHTML = '<main><h1>FAQ</h1></main>';
    localStorage.setItem(TIP_KEY, JSON.stringify({ tippedAt: Date.now() }));
    start();
    expect(document.documentElement.hasAttribute('data-tip-paused')).toBe(true);
  });

  it('marks the root once an amount is chosen', () => {
    start();
    click(reaper());
    click(link('€5'));
    expect(document.documentElement.hasAttribute('data-tip-paused')).toBe(true);
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

  it('throws on an amount that is not whole euros', () => {
    document.querySelector('[data-euros="3"]')!.setAttribute('data-euros', 'three');
    expect(() => start()).toThrow('data-euros="three" is no whole amount of euros');
  });

  it('throws on a tip ask without a close button', () => {
    document.querySelector('[data-tip-close]')!.remove();
    expect(() => start()).toThrow('the tip ask has no [data-tip-close]');
  });
});
