import { describe, expect, it } from 'vitest';
import { convertReadiness, type Readiness } from '../../src/convert/blocker';
import { ENGLISH } from '../../src/locale/i18n';
import { enginePair } from '../typed';

const { t } = ENGLISH;
const said = (r: Readiness) => (r.kind === 'blocked' ? { reason: t(r.reason), quiet: r.quiet } : r);

describe('convertReadiness', () => {
  it('asks for a file and both engines when nothing is there', () => {
    expect(said(convertReadiness({ files: 0, pair: null }))).toEqual({ reason: 'Add a .mid file and pick both engines', quiet: false });
  });

  it('asks for both engines when only files are there', () => {
    expect(said(convertReadiness({ files: 2, pair: null }))).toEqual({ reason: 'Pick a FROM and a TO engine', quiet: false });
  });

  it('keeps a missing file quiet under the button, since the file row asks for it', () => {
    expect(said(convertReadiness({ files: 0, pair: enginePair('a', 'b') }))).toEqual({ reason: 'Add a .mid file to convert', quiet: true });
  });

  it('is ready with the files and the pair once both are there', () => {
    expect(convertReadiness({ files: 1, pair: enginePair('a', 'b') })).toEqual({ kind: 'ready', files: 1, pair: enginePair('a', 'b') });
  });
});
