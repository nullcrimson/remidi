import { describe, expect, it } from 'vitest';
import { CHANNELS, channelHint } from '../src/lib/channel';
import { t } from '../src/i18n';

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

  it('describes what each choice converts', () => {
    expect(t(channelHint('auto'))).toBe('tracks with channel-10 hits · others unchanged');
    expect(t(channelHint('all'))).toBe('every channel is converted');
    expect(t(channelHint('10'))).toBe('only channel 10 is converted');
  });
});
