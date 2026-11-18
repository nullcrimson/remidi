import { describe, expect, it } from 'vitest';
import { outcomeTags } from '../../src/convert/doneSummary';
import type { ReportView } from '../../src/report/report';

const view = (unrecognized: number): ReportView => ({
  clean: false,
  totals: { dropped: 0, approximated: 0, unrecognized, untouched: 0, converted: 30, read: 30 + unrecognized, lost: unrecognized },
  groups: { unrecognized: [], dropped: [], approximated: [] },
  files: [],
});

const unrecognizedTone = (heavy: boolean) =>
  outcomeTags(view(10), 0, heavy, (m) => m.id).find((tag) => tag.text === 'done-tag-unrecognized')?.tone;

describe('outcomeTags', () => {
  it('tags the unrecognized notes in the danger tone when the loss is heavy, and neutral otherwise', () => {
    expect([unrecognizedTone(true), unrecognizedTone(false)]).toEqual(['danger', 'neutral']);
  });
});
