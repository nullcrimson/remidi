import { describe, expect, it } from 'vitest';
import { share, shareBucket } from '../../src/core/share';

describe('share', () => {
  it('is no share of nothing', () => {
    expect(share(0, 0)).toBeNull();
  });

  it('is no share for a part larger than its whole', () => {
    expect(share(4, 3)).toBeNull();
  });

  it('is no share for a part below nothing', () => {
    expect(share(-1, 3)).toBeNull();
  });

  it('is the part over the whole', () => {
    expect(share(1, 4)).toBe(0.25);
  });
});

describe('shareBucket', () => {
  it('puts no share at all in none', () => {
    expect(shareBucket(share(3, 0))).toBe('none');
  });

  it('puts no hits of some in none', () => {
    expect(shareBucket(share(0, 9))).toBe('none');
  });

  it('puts a share above nothing and below a tenth under ten', () => {
    expect(shareBucket(share(1, 11))).toBe('under10');
  });

  it('puts a tenth under twenty-five', () => {
    expect(shareBucket(share(1, 10))).toBe('under25');
  });

  it('puts a quarter under thirty-three', () => {
    expect(shareBucket(share(1, 4))).toBe('under33');
  });

  it('puts a third under fifty', () => {
    expect(shareBucket(share(1, 3))).toBe('under50');
  });

  it('puts a half over fifty', () => {
    expect(shareBucket(share(1, 2))).toBe('over50');
  });

  it('puts every hit over fifty', () => {
    expect(shareBucket(share(9, 9))).toBe('over50');
  });
});
