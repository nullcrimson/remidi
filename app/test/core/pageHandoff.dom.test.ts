import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runHandoffScript } from '../../src/core/pageHandoff';
import { fakeUmami } from '../umami';

const box = (kind: string) => `
  <div data-handoff="${kind}">
    <button type="button" data-share>Send this page</button>
    <p data-shared="copied" hidden>Link copied</p>
    <p data-shared="failed" hidden>Copy this address: <span data-address></span></p>
  </div>`;

type Nav = Pick<Navigator, 'share' | 'clipboard'>;

const nav = (parts: { share?: () => Promise<void>; writeText?: () => Promise<void> }) =>
  ({ share: parts.share, clipboard: parts.writeText && { writeText: parts.writeText } }) as unknown as Nav;

const shown = () => [...document.querySelectorAll<HTMLElement>('[data-shared]')].filter((line) => !line.hidden).map((line) => line.dataset.shared);

async function press(navigator: Nav) {
  runHandoffScript(document, navigator);
  document.querySelector<HTMLElement>('[data-share]')?.click();
  await vi.waitFor(() => expect(umami).toHaveBeenCalled());
}

const umami = fakeUmami();

describe('the handoff line of the static pages', () => {
  beforeEach(() => {
    document.body.innerHTML = box('engine');
    window.history.replaceState(null, '', '/engines/ggd-invasion/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shares the page it is on and counts it for its kind of page', async () => {
    const share = vi.fn(async () => {});
    await press(nav({ share }));
    expect(share).toHaveBeenCalledWith({ url: `${location.origin}/engines/ggd-invasion/` });
    expect(umami).toHaveBeenCalledWith('page-shared', { page: 'engine', how: 'share' });
    expect(shown()).toEqual([]);
  });

  it('says the link is copied where there is no share sheet', async () => {
    const writeText = vi.fn(async () => {});
    await press(nav({ writeText }));
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/engines/ggd-invasion/`);
    expect(shown()).toEqual(['copied']);
    expect(umami).toHaveBeenCalledWith('page-shared', { page: 'engine', how: 'copy' });
  });

  it('counts an address shown to copy by hand as shown', async () => {
    await press(nav({}));
    expect(umami).toHaveBeenCalledWith('page-shared', { page: 'engine', how: 'shown' });
  });

  it('counts nothing when the visitor closes the share sheet', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('closed', 'AbortError');
    });
    runHandoffScript(document, nav({ share }));
    document.querySelector<HTMLElement>('[data-share]')?.click();
    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    await Promise.resolve();
    expect(umami).not.toHaveBeenCalled();
    expect(shown()).toEqual([]);
  });

  it('throws on a box naming a page page-shared does not know, rather than share it uncounted', () => {
    document.body.innerHTML = box('faq');
    expect(() => runHandoffScript(document, nav({}))).toThrow('data-handoff="faq" names no page page-shared knows');
  });
});
