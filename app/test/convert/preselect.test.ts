import { describe, expect, it } from 'vitest';
import { preselection } from '../../src/convert/preselect';

const ENGINES = [
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'EZdrummer' },
];

describe('preselection', () => {
  it('returns both known ids', () => {
    expect(preselection('?from=ggd_invasion&to=ezdrummer', ENGINES)).toEqual({
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
    });
  });

  it('returns only the given source', () => {
    expect(preselection('?from=ezdrummer', ENGINES)).toEqual({ src: 'ezdrummer' });
  });

  it('returns only the given target', () => {
    expect(preselection('?to=ezdrummer', ENGINES)).toEqual({ tgt: 'ezdrummer' });
  });

  it('ignores an unknown id beside a known one', () => {
    expect(preselection('?from=nope&to=ezdrummer', ENGINES)).toEqual({ tgt: 'ezdrummer' });
  });

  it('returns null for an unknown id alone', () => {
    expect(preselection('?from=nope', ENGINES)).toBeNull();
  });

  it('keeps only the source when source and target are identical', () => {
    expect(preselection('?from=ezdrummer&to=ezdrummer', ENGINES)).toEqual({ src: 'ezdrummer' });
  });

  it('returns null without params', () => {
    expect(preselection('', ENGINES)).toBeNull();
  });
});
