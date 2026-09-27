import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob<string>(['../src/**/*.{ts,tsx}', '!../src/wasm/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const css = Object.values(
  import.meta.glob<string>('../src/index.css', { query: '?raw', import: 'default', eager: true }),
)[0];

function offenders(pattern: RegExp): string[] {
  return Object.entries(SOURCES).flatMap(([file, text]) =>
    text
      .split('\n')
      .flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );
}

describe('style tokens', () => {
  it('scans the app sources', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(40);
  });

  it('uses the type scale instead of arbitrary font sizes', () => {
    expect(offenders(/text-\[\d/)).toEqual([]);
  });

  it('uses the radius tokens instead of arbitrary radii', () => {
    expect(offenders(/rounded(-[a-z]+)?-\[/)).toEqual([]);
  });

  it('keeps the decoration colour off text that must be read', () => {
    expect(offenders(/\btext-t6\b/)).toEqual([]);
    expect(css).not.toContain('--color-t6');
  });

  it('replaces the default scales and lifts t5 to AA contrast', () => {
    expect(css).toContain('--text-*: initial;');
    expect(css).toContain('--radius-*: initial;');
    expect(css).toContain('--color-t5: #8a8375;');
  });
});
