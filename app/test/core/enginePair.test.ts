import { describe, expect, it } from 'vitest';
import { pairOf } from '../../src/core/enginePair';
import { engineId } from '../typed';

describe('pairOf', () => {
  it('is null when only the source engine is chosen', () => {
    expect(pairOf(engineId('a'), null)).toBeNull();
  });

  it('is null when only the target engine is chosen', () => {
    expect(pairOf(null, engineId('b'))).toBeNull();
  });
});
