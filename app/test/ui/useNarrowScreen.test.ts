import { describe, expect, it } from 'vitest';
import css from '../../src/index.css?raw';
import { SM_WIDTH } from '../../src/ui/useNarrowScreen';

describe('useNarrowScreen', () => {
  it('turns at the width the theme gives sm:', () => {
    expect(css.match(/--breakpoint-sm:\s*([^;]+);/)?.[1]).toBe(SM_WIDTH);
  });
});
