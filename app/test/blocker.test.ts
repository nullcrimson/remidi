import { describe, expect, it } from 'vitest';
import { convertBlocker } from '../src/lib/blocker';
import { ENGLISH } from '../src/i18n';

const { t } = ENGLISH;

describe('convertBlocker', () => {
  it('names what is missing', () => {
    expect(t(convertBlocker({ files: 0, src: '', tgt: '' })!)).toBe('Add a .mid file and pick both engines');
    expect(t(convertBlocker({ files: 0, src: 'a', tgt: 'b' })!)).toBe('Add a .mid file to convert');
    expect(t(convertBlocker({ files: 2, src: 'a', tgt: '' })!)).toBe('Pick a FROM and a TO engine');
    expect(t(convertBlocker({ files: 1, src: '', tgt: 'b' })!)).toBe('Pick a FROM and a TO engine');
  });

  it('is null when ready', () => {
    expect(convertBlocker({ files: 1, src: 'a', tgt: 'b' })).toBeNull();
  });
});
