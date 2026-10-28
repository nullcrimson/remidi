import { describe, expect, it } from 'vitest';

const css = Object.values(
  import.meta.glob<string>('../src/index.css', { query: '?raw', import: 'default', eager: true }),
)[0];

describe('page geometry', () => {
  it('keeps the scrollbar’s room so a page that grows a scrollbar does not move sideways', () => {
    expect(css).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable/);
  });
});
