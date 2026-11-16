import { describe, expect, it } from 'vitest';
import { listed } from '../../src/locale/list';

describe('listed', () => {
  it('lists items in English as a comma list', () => {
    expect(listed('en', ['a.mid', 'b.mid', 'c.mid'])).toBe('a.mid, b.mid, c.mid');
  });

  it('lists items in the words of the locale', () => {
    expect(listed('ja', ['a', 'b'])).toBe(new Intl.ListFormat('ja', { style: 'short', type: 'unit' }).format(['a', 'b']));
  });
});
