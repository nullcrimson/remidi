import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from '../src/lib/stats';

describe('track', () => {
  afterEach(() => {
    delete window.umami;
  });

  it('hands the event and its properties to Umami', () => {
    const umami = { track: vi.fn() };
    window.umami = umami;
    track('converted', { from: 'ggd_invasion', to: 'ezdrummer', files: 2 });
    expect(umami.track).toHaveBeenCalledWith('converted', { from: 'ggd_invasion', to: 'ezdrummer', files: 2 });
  });

  it('does nothing when the Umami script is not loaded', () => {
    expect(() => track('downloaded')).not.toThrow();
  });
});
