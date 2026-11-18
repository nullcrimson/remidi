import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhoneHandoff } from '../../src/convert/PhoneHandoff';
import { engineId } from '../typed';
import { fakeUmami } from '../umami';

const ADDRESS = `${location.origin}/#from=ggd_invasion&to=ezdrummer`;

function navigatorWith(share: Navigator['share'] | undefined, writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(writeText) }, configurable: true });
  return navigator.clipboard.writeText;
}

const send = async () => {
  render(<PhoneHandoff src={engineId('ggd_invasion')} tgt={engineId('ezdrummer')} />);
  await userEvent.click(screen.getByRole('button', { name: 'Send this page' }));
};

describe('PhoneHandoff', () => {
  const umami = fakeUmami();

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('asks the visitor to send the page on to a computer', () => {
    render(<PhoneHandoff src={null} tgt={null} />);
    expect(screen.getByText('Working on a computer? Send yourself this page.')).toBeInTheDocument();
  });

  it('shares the converter with the engines chosen and counts it, showing nothing more', async () => {
    const share = vi.fn(async () => {});
    navigatorWith(share, async () => {});
    await send();
    expect(share).toHaveBeenCalledWith({ url: ADDRESS });
    expect(umami).toHaveBeenCalledWith('page-shared', { page: 'converter', how: 'share' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('counts a copied link as a copy', async () => {
    navigatorWith(undefined, async () => {});
    await send();
    await vi.waitFor(() => expect(umami).toHaveBeenCalledWith('page-shared', { page: 'converter', how: 'copy' }));
  });

  it('counts an address shown to copy by hand as shown', async () => {
    navigatorWith(undefined, async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    await send();
    await vi.waitFor(() => expect(umami).toHaveBeenCalledWith('page-shared', { page: 'converter', how: 'shown' }));
  });

  it('sends nothing when the visitor closes the share sheet', async () => {
    navigatorWith(async () => {
      throw new DOMException('closed', 'AbortError');
    }, async () => {});
    await send();
    expect(umami).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
