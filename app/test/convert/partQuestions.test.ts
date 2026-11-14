import { describe, expect, it } from 'vitest';
import { sameTracks } from '../../src/convert/partQuestions';
import type { PartSummary } from '../../src/core/midiremap';
import { typed } from '../typed';

const summary = (track: number, channel: number, trackName: string | null) =>
  typed<PartSummary>({ part: { track, channel }, trackName, hits: 1, plays: null });

describe('sameTracks', () => {
  const from = [summary(1, 1, 'Kick'), summary(2, 1, 'Snare'), summary(3, 2, 'Bass')];

  it('carries picked parts over by track name and channel', () => {
    const to = [summary(1, 2, 'Bass'), summary(2, 1, 'Snare'), summary(4, 1, 'Kick')];
    expect(sameTracks(from, [{ track: 1, channel: 1 }, { track: 2, channel: 1 }], to))
      .toEqual([{ track: 4, channel: 1 }, { track: 2, channel: 1 }]);
  });

  it('carries nothing when a picked track has no name', () => {
    expect(sameTracks([summary(1, 1, null)], [{ track: 1, channel: 1 }], [summary(1, 1, null)])).toBeUndefined();
  });

  it('carries nothing when the other file lacks a picked track', () => {
    expect(sameTracks(from, [{ track: 1, channel: 1 }], [summary(1, 1, 'Snare')])).toBeUndefined();
  });

  it('carries nothing when a name is shared by two parts on the channel', () => {
    const twice = [summary(1, 1, 'Drums'), summary(2, 1, 'Drums')];
    expect(sameTracks(twice, [{ track: 1, channel: 1 }], [summary(1, 1, 'Drums')])).toBeUndefined();
    expect(sameTracks([summary(1, 1, 'Drums')], [{ track: 1, channel: 1 }], twice)).toBeUndefined();
  });

  it('carries nothing when nothing is picked', () => {
    expect(sameTracks(from, [], from)).toBeUndefined();
  });
});
