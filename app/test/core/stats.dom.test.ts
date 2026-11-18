import { describe, expect, it } from 'vitest';
import { buildTag, track, tracker } from '../../src/core/stats';
import { fakeUmami } from '../umami';

describe('track', () => {
  const umami = fakeUmami();

  it('hands the event and its properties to Umami', () => {
    track('convert-failed', { from: 'ggd_invasion', to: 'ezdrummer', kind: 'badMidi' });
    expect(umami).toHaveBeenCalledWith('convert-failed', { from: 'ggd_invasion', to: 'ezdrummer', kind: 'badMidi' });
  });

  it('does nothing when the Umami script is not loaded', () => {
    delete window.umami;
    expect(() => track('downloaded', { files: 1, how: 'single' })).not.toThrow();
  });

  it('sends the events of a tier that is on', () => {
    tracker(new Set([1] as const))('downloaded', { files: 1, how: 'single' });
    expect(umami).toHaveBeenCalledWith('downloaded', { files: 1, how: 'single' });
  });

  it('sends none of the events of a tier that is off', () => {
    tracker(new Set([1] as const))('preset-loaded');
    expect(umami).not.toHaveBeenCalled();
  });
});

describe('buildTag', () => {
  const stats = (attrs: Record<string, string>) => {
    const script = document.createElement('script');
    for (const [name, value] of Object.entries(attrs)) script.setAttribute(name, value);
    document.head.append(script);
    return script;
  };

  it('reads the short commit the stats script is tagged with', () => {
    const script = stats({ 'data-website-id': 'x', 'data-tag': 'a627bac' });
    expect(buildTag()).toBe('a627bac');
    script.remove();
  });

  it('is null when the stats script carries no tag or is absent', () => {
    expect(buildTag()).toBeNull();
    const script = stats({ 'data-website-id': 'x' });
    expect(buildTag()).toBeNull();
    script.remove();
  });
});
