import { describe, expect, it } from 'vitest';
import { pairOf } from '../../src/core/enginePair';

describe('pairOf', () => {
  it('is null when only the source engine is chosen', () => {
    expect(pairOf('a', null)).toBeNull();
  });

  it('is null when only the target engine is chosen', () => {
    expect(pairOf(null, 'b')).toBeNull();
  });
});
