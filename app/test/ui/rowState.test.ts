import { describe, expect, it } from 'vitest';
import { rowState } from '../../src/ui/styles';

describe('rowState', () => {
  it('marks a selected row with the accent rule, bold and bright text', () => {
    expect(rowState('selected')).toBe('border-l-2 transition-colors border-accent font-semibold text-t1');
  });

  it('keeps an idle row quiet until hover', () => {
    expect(rowState('idle')).toBe('border-l-2 transition-colors border-transparent text-t4 hover:text-t1');
  });

  it('dims a disabled row without a hover change', () => {
    expect(rowState('disabled')).toBe('border-l-2 transition-colors border-transparent text-t5 opacity-40');
  });
});
