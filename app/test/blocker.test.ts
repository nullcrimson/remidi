import { describe, expect, it } from 'vitest';
import { convertBlocker } from '../src/lib/blocker';
import { ENGLISH } from '../src/i18n';

const { t } = ENGLISH;
const said = (b: ReturnType<typeof convertBlocker>) => b && { reason: t(b.reason), quiet: b.quiet };

describe('convertBlocker', () => {
  it('names what is missing under the button', () => {
    expect(said(convertBlocker({ files: 0, src: '', tgt: '' }))).toEqual({ reason: 'Add a .mid file and pick both engines', quiet: false });
    expect(said(convertBlocker({ files: 2, src: 'a', tgt: '' }))).toEqual({ reason: 'Pick a FROM and a TO engine', quiet: false });
    expect(said(convertBlocker({ files: 1, src: '', tgt: 'b' }))).toEqual({ reason: 'Pick a FROM and a TO engine', quiet: false });
  });

  it('keeps a missing file quiet under the button, since the file row asks for it', () => {
    expect(said(convertBlocker({ files: 0, src: 'a', tgt: 'b' }))).toEqual({ reason: 'Add a .mid file to convert', quiet: true });
  });

  it('is null when ready', () => {
    expect(convertBlocker({ files: 1, src: 'a', tgt: 'b' })).toBeNull();
  });
});
