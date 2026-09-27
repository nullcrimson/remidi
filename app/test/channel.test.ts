import { describe, expect, it } from 'vitest';
import { CHANNELS, channelHint } from '../src/lib/channel';

describe('channel options', () => {
  it('lists auto, all, then channels 1 to 16', () => {
    expect(CHANNELS.map((c) => c.value)).toEqual([
      'auto',
      'all',
      ...Array.from({ length: 16 }, (_, i) => String(i + 1)),
    ]);
    expect(CHANNELS.slice(0, 3).map((c) => c.label)).toEqual(['Auto', 'All channels', '1']);
    expect(CHANNELS[CHANNELS.length - 1].label).toBe('16');
  });

  it('describes what each choice converts', () => {
    expect(channelHint('auto')).toBe('tracks with channel-10 hits · others unchanged');
    expect(channelHint('all')).toBe('every channel is converted');
    expect(channelHint('10')).toBe('only channel 10 is converted');
  });
});
