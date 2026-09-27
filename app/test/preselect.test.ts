import { describe, expect, it } from 'vitest';
import { preselection } from '../src/lib/preselect';

const ENGINES = [
  { id: 'ggd_invasion', name: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer' },
];

describe('preselection', () => {
  it('returns both known ids', () => {
    expect(preselection('?from=ggd_invasion&to=ezdrummer', ENGINES)).toEqual({
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
    });
  });

  it('returns only the given side', () => {
    expect(preselection('?from=ezdrummer', ENGINES)).toEqual({ src: 'ezdrummer' });
    expect(preselection('?to=ezdrummer', ENGINES)).toEqual({ tgt: 'ezdrummer' });
  });

  it('ignores unknown ids', () => {
    expect(preselection('?from=nope&to=ezdrummer', ENGINES)).toEqual({ tgt: 'ezdrummer' });
    expect(preselection('?from=nope', ENGINES)).toBeNull();
  });

  it('keeps only the source when source and target are identical', () => {
    expect(preselection('?from=ezdrummer&to=ezdrummer', ENGINES)).toEqual({ src: 'ezdrummer' });
  });

  it('returns null without params', () => {
    expect(preselection('', ENGINES)).toBeNull();
  });
});
