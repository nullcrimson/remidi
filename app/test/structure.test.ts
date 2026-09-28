import { describe, expect, it } from 'vitest';

const MAX_LINES = 250;

const SOURCES = import.meta.glob<string>(
  ['../src/App.tsx', '../src/components/**/*.{ts,tsx}', '../src/hooks/**/*.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
);

describe('app structure', () => {
  it('scans the components and hooks', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(40);
  });

  it(`keeps every component and hook within ${MAX_LINES} lines`, () => {
    const long = Object.entries(SOURCES)
      .map(([file, text]) => [file, text.trimEnd().split('\n').length] as const)
      .filter(([, lines]) => lines > MAX_LINES)
      .map(([file, lines]) => `${file}: ${lines}`);
    expect(long).toEqual([]);
  });
});
