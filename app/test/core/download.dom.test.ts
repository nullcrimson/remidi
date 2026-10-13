import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from '../../src/core/download';

describe('saveBlob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(URL.createObjectURL).mockReset().mockReturnValue('blob:made');
    vi.mocked(URL.revokeObjectURL).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a download link to the blob under the given name', () => {
    const blob = new Blob(['x']);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.getAttribute('href')).toBe('blob:made');
      expect(this.download).toBe('kit.json');
    });
    saveBlob(blob, 'kit.json');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('leaves no link in the page', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    saveBlob(new Blob(['x']), 'kit.json');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('frees the address only after ten seconds', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    saveBlob(new Blob(['x']), 'kit.json');
    vi.advanceTimersByTime(9_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:made');
  });
});
