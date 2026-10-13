import { describe, expect, it } from 'vitest';
import { CHANNELS, channelHint } from '../../src/core/channel';
import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;

describe('channel options', () => {
  it('lists auto, all, then channels 1 to 16', () => {
    expect(CHANNELS.map((c) => c.value)).toEqual([
      'auto',
      'all',
      ...Array.from({ length: 16 }, (_, i) => String(i + 1)),
    ]);
    expect(CHANNELS.slice(0, 3).map((c) => t(c.label))).toEqual(['Auto', 'All channels', '1']);
    expect(t(CHANNELS[CHANNELS.length - 1].label)).toBe('16');
  });

  it('describes what Auto converts', () => {
    expect(t(channelHint('auto'))).toBe('tracks with channel-10 hits · others unchanged');
  });

  it('describes what All channels converts', () => {
    expect(t(channelHint('all'))).toBe('every channel is converted');
  });

  it('describes what a numbered channel converts', () => {
    expect(t(channelHint('10'))).toBe('only channel 10 is converted');
  });
});
