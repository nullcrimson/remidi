import { describe, expect, it } from 'vitest';
import { knownEdits } from '../../src/core/overrides';
import { EMPTY_SESSION } from '../../src/convert/session';
import { selectionOf, selectionReducer } from '../../src/convert/selectionState';
import { engineId } from '../typed';

const restored = selectionOf({ ...EMPTY_SESSION, src: engineId('ggd_invasion'), tgt: engineId('ezdrummer') });

describe('the source and how it came to be', () => {
  it('starts as restored from the session', () => {
    expect(restored.src).toEqual({ id: 'ggd_invasion', via: 'restored' });
  });

  it('is picked after a swap', () => {
    expect(selectionReducer(restored, { type: 'swap', via: 'picked' }).src).toEqual({ id: 'ezdrummer', via: 'picked' });
  });

  it('is suggested after a swap the done card offered, with what it left behind', () => {
    const from = { pair: { src: engineId('ggd_invasion'), tgt: engineId('ezdrummer') }, overrides: { edits: {}, srcEdits: {} }, presetId: null };
    const next = selectionReducer(restored, { type: 'swap', via: { kind: 'suggested', from } });
    expect(next.src).toEqual({ id: 'ezdrummer', via: { kind: 'suggested', from } });
  });

  it('is picked after a mapping is loaded', () => {
    const known = knownEdits({ edits: {}, srcEdits: {} }, new Map());
    const next = selectionReducer(restored, { type: 'loadMapping', src: engineId('ssd5'), tgt: engineId('ezdrummer'), presetId: null, known });
    expect(next.src).toEqual({ id: 'ssd5', via: 'picked' });
  });

  it('comes from the link when the link names the source it already is', () => {
    expect(selectionReducer(restored, { type: 'SRC_FROM_LINK' }).src).toEqual({ id: 'ggd_invasion', via: 'link' });
  });

  it('stays none when a link is marked without a source', () => {
    expect(selectionReducer({ ...restored, src: null }, { type: 'SRC_FROM_LINK' }).src).toBeNull();
  });
});
