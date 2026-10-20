import { describe, expect, it } from 'vitest';
import { UNRECOGNIZED_OPTIONS, unrecognizedHint } from '../../src/core/unrecognized';
import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;

describe('unrecognized notes setting', () => {
  it('offers Remove then Keep as they are', () => {
    expect(UNRECOGNIZED_OPTIONS.map((o) => [o.value, t(o.label)])).toEqual([
      ['remove', 'Remove'],
      ['keep', 'Keep as they are'],
    ]);
  });

  it('explains Remove', () => {
    expect(t(unrecognizedHint('remove'))).toBe('leave them out of the file');
  });

  it('explains Keep as they are', () => {
    expect(t(unrecognizedHint('keep'))).toBe('write them out unchanged');
  });
});
