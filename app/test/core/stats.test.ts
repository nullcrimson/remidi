import { describe, expect, it } from 'vitest';
import { wholeItems } from '../../src/core/stats';

describe('wholeItems', () => {
  it('joins the items with the separator', () => {
    expect(wholeItems(['1', '2'], ',', 500)).toBe('1,2');
  });

  it('is empty for no items', () => {
    expect(wholeItems([], ',', 500)).toBe('');
  });

  it('stops at the last whole item that fits the limit', () => {
    const joined = wholeItems(Array<string>(200).fill('abcdefghij'), ',', 500);
    expect(joined).toHaveLength(494);
    expect(joined).toMatch(/^(abcdefghij,)*abcdefghij$/);
  });

  it('is empty when the first item alone passes the limit', () => {
    expect(wholeItems(['x'.repeat(501)], ',', 500)).toBe('');
  });
});
