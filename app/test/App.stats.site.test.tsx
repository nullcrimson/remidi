import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ErrorBoundary } from '../src/site/ErrorBoundary';
import type { Runtime } from '../src/convert/runtime';
import { addMidi, convert, pickEngines, startApp, store } from './eventSteps';
import { recordDownloads } from './downloads';
import { RUNTIME } from './runtime';
import { fakeUmami } from './umami';

recordDownloads();

const header = () => within(screen.getByRole('navigation', { name: 'Main' }));
const footer = () => within(screen.getByRole('navigation', { name: 'Site' }));

function Boom(): never {
  throw new Error('render exploded');
}

describe('the events of language, navigation, tips and failures', () => {
  const umami = fakeUmami();

  beforeEach(() => {
    document.addEventListener('click', (e) => e.preventDefault(), { once: true, capture: true });
  });

  it('sends language-picked with where app for a language chosen in the menu', async () => {
    await startApp();
    await userEvent.click(screen.getByRole('link', { name: 'Polski', hidden: true }));
    expect(umami).toHaveBeenCalledWith('language-picked', { to: 'pl', where: 'app' });
  });

  it('sends no language-picked for the language already shown', async () => {
    await startApp();
    await userEvent.click(screen.getByRole('link', { name: 'English', hidden: true }));
    expect(umami).not.toHaveBeenCalledWith('language-picked', expect.anything());
  });

  it('sends section-opened for a footer section that opens as a dialog', async () => {
    await startApp();
    await userEvent.click(footer().getByRole('link', { name: 'FAQ' }));
    expect(umami).toHaveBeenCalledWith('section-opened', { section: 'faq' });
  });

  it('sends section-opened with guide for the guide', async () => {
    await startApp();
    await userEvent.click(footer().getByRole('link', { name: 'How to use' }));
    expect(umami).toHaveBeenCalledWith('section-opened', { section: 'guide' });
  });

  it('sends nav-used for a header link to another page', async () => {
    await startApp();
    await userEvent.click(header().getByRole('link', { name: 'Note maps' }));
    expect(umami).toHaveBeenCalledWith('nav-used', { target: 'noteMaps', where: 'header' });
  });

  it('sends no nav-used for the converter link on the converter', async () => {
    await startApp();
    await userEvent.click(header().getByRole('link', { name: 'Converter' }));
    expect(umami).not.toHaveBeenCalledWith('nav-used', expect.anything());
  });

  it('sends nav-used for a footer link to another page', async () => {
    await startApp();
    await userEvent.click(footer().getByRole('link', { name: 'Note maps' }));
    expect(umami).toHaveBeenCalledWith('nav-used', { target: 'noteMaps', where: 'footer' });
  });

  it('sends tip-answered from the footer tip link', async () => {
    await startApp();
    await userEvent.click(footer().getByRole('link', { name: 'Buy me a coffee' }));
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'footer' });
  });

  describe('the tip toast', () => {
    const askForTip = async () => {
      store('tip', { downloads: 2 });
      await startApp();
      await pickEngines();
      await addMidi('a.mid');
      await convert();
      await userEvent.click(screen.getByRole('link', { name: '↓ Download .mid' }));
      return screen.findByRole('group', { name: 'Leave a tip' });
    };

    it('sends tip-asked once for one toast', async () => {
      await askForTip();
      expect(umami.mock.calls.filter(([name]) => name === 'tip-asked')).toHaveLength(1);
    });

    it('sends tip-answered with the amount chosen', async () => {
      const toast = await askForTip();
      await userEvent.click(within(toast).getByRole('link', { name: '€5' }));
      expect(umami).toHaveBeenCalledWith('tip-answered', { answer: '5', where: 'toast' });
    });

    it('sends tip-answered with other for the other amount', async () => {
      const toast = await askForTip();
      await userEvent.click(within(toast).getByRole('link', { name: 'Other amount' }));
      expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'toast' });
    });

    it('sends tip-answered with closed when the toast is closed', async () => {
      const toast = await askForTip();
      await userEvent.click(within(toast).getByRole('button', { name: 'Close' }));
      expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'closed', where: 'toast' });
    });
  });

  it('sends load-failed with the kind when the converter cannot load', async () => {
    const failing: Runtime = { ...RUNTIME, load: () => Promise.reject(new Error('wasm boom')) };
    render(<App runtime={failing} />);
    await waitFor(() => expect(umami).toHaveBeenCalledWith('load-failed', { kind: 'wasmUnavailable' }));
  });

  describe('the error screen', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('sends crashed when the error screen appears', () => {
      render(<ErrorBoundary onReload={vi.fn()}><Boom /></ErrorBoundary>);
      expect(umami).toHaveBeenCalledWith('crashed', { error: 'Error: render exploded' });
    });

    it('sends storage-cleared when the reset is confirmed', async () => {
      render(<ErrorBoundary onReload={vi.fn()}><Boom /></ErrorBoundary>);
      await userEvent.click(screen.getByRole('button', { name: 'Reset saved data…' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete and reload' }));
      expect(umami).toHaveBeenCalledWith('storage-cleared');
    });
  });
});
