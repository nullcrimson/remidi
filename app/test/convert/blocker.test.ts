import { describe, expect, it } from 'vitest';
import { convertReadiness, type Readiness } from '../../src/convert/blocker';
import type { ConvertActions } from '../../src/convert/convertActions';
import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;
const said = (r: Readiness) => (r.kind === 'blocked' ? { reason: t(r.reason), quiet: r.quiet } : r);

const ACTIONS = {} as ConvertActions;

describe('convertReadiness', () => {
  it('asks for a file and both engines when nothing is there', () => {
    expect(said(convertReadiness({ waiting: 0, files: 0, actions: null }))).toEqual({ reason: 'Add a .mid file and pick both engines', quiet: false });
  });

  it('asks for both engines when only files are there', () => {
    expect(said(convertReadiness({ waiting: 0, files: 2, actions: null }))).toEqual({ reason: 'Pick a FROM and a TO engine', quiet: false });
  });

  it('keeps a missing file quiet under the button, since the file row asks for it', () => {
    expect(said(convertReadiness({ waiting: 0, files: 0, actions: ACTIONS }))).toEqual({ reason: 'Add a .mid file to convert', quiet: true });
  });

  it('is ready with the files and the ways to convert them once both are there', () => {
    expect(convertReadiness({ waiting: 0, files: 1, actions: ACTIONS })).toEqual({ kind: 'ready', files: 1, actions: ACTIONS, waiting: 0 });
  });

  it('waits for the drum parts while every file is still asked about', () => {
    expect(convertReadiness({ waiting: 2, files: 2, actions: ACTIONS })).toEqual({ kind: 'blocked', reason: { id: 'blocker-parts' }, quiet: false });
  });

  it('is ready with the files that do not wait for their drum parts', () => {
    expect(convertReadiness({ waiting: 1, files: 3, actions: ACTIONS })).toEqual({ kind: 'ready', files: 2, actions: ACTIONS, waiting: 1 });
  });
});
