import { describe, expect, it } from 'vitest';
import { preselection } from '../../src/convert/preselect';

const ENGINES = [
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'EZdrummer' },
];

const query = (search: string) => ({ search, hash: '' });
const fragment = (hash: string) => ({ search: '', hash });

describe('preselection', () => {
  it('returns both known ids', () => {
    expect(preselection(query('?from=ggd_invasion&to=ezdrummer'), ENGINES)).toEqual({
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
    });
  });

  it('returns only the given source', () => {
    expect(preselection(query('?from=ezdrummer'), ENGINES)).toEqual({ src: 'ezdrummer' });
  });

  it('returns only the given target', () => {
    expect(preselection(query('?to=ezdrummer'), ENGINES)).toEqual({ tgt: 'ezdrummer' });
  });

  it('ignores an unknown id beside a known one', () => {
    expect(preselection(query('?from=nope&to=ezdrummer'), ENGINES)).toEqual({ tgt: 'ezdrummer' });
  });

  it('returns null for an unknown id alone', () => {
    expect(preselection(query('?from=nope'), ENGINES)).toBeNull();
  });

  it('keeps only the source when source and target are identical', () => {
    expect(preselection(query('?from=ezdrummer&to=ezdrummer'), ENGINES)).toEqual({ src: 'ezdrummer' });
  });

  it('returns null without params', () => {
    expect(preselection(query(''), ENGINES)).toBeNull();
  });

  it('reads both ids from the fragment', () => {
    expect(preselection(fragment('#from=ggd_invasion&to=ezdrummer'), ENGINES)).toEqual({
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
    });
  });

  it('prefers the fragment over the query', () => {
    expect(preselection({ search: '?from=ggd_invasion', hash: '#to=ggd_invasion' }, ENGINES)).toEqual({
      tgt: 'ggd_invasion',
    });
  });

  it('falls back to the query when the fragment names no engine', () => {
    expect(preselection({ search: '?from=ezdrummer', hash: '#main' }, ENGINES)).toEqual({ src: 'ezdrummer' });
  });
});
