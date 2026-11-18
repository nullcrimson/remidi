import { describe, expect, it, vi } from 'vitest';
import { sharePage } from '../../src/core/sharePage';

const ADDRESS = 'https://drumverter.com/#from=ggd_invasion&to=ezdrummer';

type Nav = Pick<Navigator, 'share' | 'clipboard'>;

const sharing = (share: Navigator['share']) => vi.fn(share);
const copying = (writeText: (text: string) => Promise<void>) => ({ writeText: vi.fn(writeText) });
const nav = (parts: { share?: Navigator['share']; clipboard?: { writeText: (text: string) => Promise<void> } }) => parts as unknown as Nav;

describe('sharePage', () => {
  it('shares the address through the share sheet', async () => {
    const share = sharing(async () => {});
    const clipboard = copying(async () => {});
    expect(await sharePage(ADDRESS, nav({ share, clipboard }))).toBe('shared');
    expect(share).toHaveBeenCalledWith({ url: ADDRESS });
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('counts the visitor closing the share sheet as a cancel and copies nothing', async () => {
    const clipboard = copying(async () => {});
    const share = sharing(async () => {
      throw new DOMException('closed', 'AbortError');
    });
    expect(await sharePage(ADDRESS, nav({ share, clipboard }))).toBe('cancelled');
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies the address when the share sheet fails for any other reason', async () => {
    const clipboard = copying(async () => {});
    const share = sharing(async () => {
      throw new DOMException('not allowed', 'NotAllowedError');
    });
    expect(await sharePage(ADDRESS, nav({ share, clipboard }))).toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(ADDRESS);
  });

  it('copies the address where there is no share sheet', async () => {
    const clipboard = copying(async () => {});
    expect(await sharePage(ADDRESS, nav({ clipboard }))).toBe('copied');
    expect(clipboard.writeText).toHaveBeenCalledWith(ADDRESS);
  });

  it('fails when the copy is refused, so the address is shown', async () => {
    const clipboard = copying(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    expect(await sharePage(ADDRESS, nav({ clipboard }))).toBe('failed');
  });

  it('fails when there is neither a share sheet nor a clipboard', async () => {
    expect(await sharePage(ADDRESS, nav({}))).toBe('failed');
  });
});
