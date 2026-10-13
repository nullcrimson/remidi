import { describe, expect, it } from 'vitest';
import { convertBlocker } from '../../src/convert/blocker';
import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;
const said = (b: ReturnType<typeof convertBlocker>) => b && { reason: t(b.reason), quiet: b.quiet };

describe('convertBlocker', () => {
  it('asks for a file and both engines when nothing is there', () => {
    expect(said(convertBlocker({ files: 0, pair: null }))).toEqual({ reason: 'Add a .mid file and pick both engines', quiet: false });
  });

  it('asks for both engines when only files are there', () => {
    expect(said(convertBlocker({ files: 2, pair: null }))).toEqual({ reason: 'Pick a FROM and a TO engine', quiet: false });
  });

  it('keeps a missing file quiet under the button, since the file row asks for it', () => {
    expect(said(convertBlocker({ files: 0, pair: { src: 'a', tgt: 'b' } }))).toEqual({ reason: 'Add a .mid file to convert', quiet: true });
  });

  it('is null when ready', () => {
    expect(convertBlocker({ files: 1, pair: { src: 'a', tgt: 'b' } })).toBeNull();
  });
});
