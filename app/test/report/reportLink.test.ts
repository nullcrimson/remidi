import { describe, expect, it } from 'vitest';
import { MAX_LINK_CHARS, REPORT_LIST_CHARS, reportLink, type ReportContext } from '../../src/report/reportLink';
import { engineId } from '../typed';

const CONTEXT: ReportContext = {
  from: engineId('ggd_invasion_halpern'),
  to: engineId('superior_drummer3'),
  lang: 'pl',
  build: 'a627bac',
  files: 2,
  read: 412,
  lost: 112,
  unrecognizedNotes: ['22', '34', '36'],
  droppedDrums: ['china.1.hit'],
  approximatedDrums: ['ride.1.bell>ride.1.cup'],
  suggested: engineId('ezdrummer'),
  missing: 'nearest',
  keep: 'remove',
  channel: 'auto',
};

const fields = (context: ReportContext) => Object.fromEntries(new URL(reportLink(context)).searchParams);

describe('reportLink', () => {
  it('names every field of the conversion', () => {
    expect(reportLink(CONTEXT).startsWith('https://tally.so/r/J95eYd?')).toBe(true);
    expect(fields(CONTEXT)).toEqual({
      from: 'ggd_invasion_halpern',
      to: 'superior_drummer3',
      lang: 'pl',
      build: 'a627bac',
      files: '2',
      read: '412',
      lost: '112',
      unrecognized: '22,34,36',
      dropped: 'china.1.hit',
      approximated: 'ride.1.bell>ride.1.cup',
      closer: 'ezdrummer',
      missing: 'nearest',
      keep: 'remove',
      channel: 'auto',
    });
  });

  it('sends an absent suggestion and build as empty fields', () => {
    expect(fields({ ...CONTEXT, suggested: null, build: null })).toMatchObject({ closer: '', build: '' });
  });

  it('a list is cut at whole items by its encoded length', () => {
    const items = Array.from({ length: 40 }, (_, i) => `drum.${i}>stand.in`);
    const kept = fields({ ...CONTEXT, approximatedDrums: items }).approximated.split(',');
    const encoded = (list: string[]) => new URLSearchParams({ v: list.join(',') }).toString().length - 2;
    expect(kept).toEqual(items.slice(0, kept.length));
    expect(encoded(kept)).toBeLessThanOrEqual(REPORT_LIST_CHARS);
    expect(encoded(items.slice(0, kept.length + 1))).toBeGreaterThan(REPORT_LIST_CHARS);
  });

  it('every list at its cut keeps the link under MAX_LINK_CHARS', () => {
    const long = Array.from({ length: 300 }, (_, i) => `crash.${i}.hit>china.${i}.hit é`);
    const link = reportLink({ ...CONTEXT, unrecognizedNotes: long, droppedDrums: long, approximatedDrums: long });
    expect(link.length).toBeLessThan(MAX_LINK_CHARS);
  });
});
