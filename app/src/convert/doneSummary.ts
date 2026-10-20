import type { Translate } from '../locale/i18n';
import type { ReportFile, ReportView } from '../report/report';
import type { TagTone } from '../ui/styles';

/** The counts the done card shows as tags, each in the tone of what happened to those notes. */
export function outcomeTags(view: ReportView, failed: number, t: Translate): { text: string; tone: TagTone }[] {
  const { converted, approximated, dropped, unrecognized, untouched } = view.totals;
  const tags: { text: string; tone: TagTone }[] = [
    converted > 0
      ? { text: t({ id: 'done-tag-converted', args: { count: converted } }), tone: 'neutral' }
      : { text: t({ id: 'done-tag-nothing' }), tone: 'danger' },
  ];
  if (approximated > 0) tags.push({ text: t({ id: 'done-tag-approximated', args: { count: approximated } }), tone: 'bright' });
  if (dropped > 0) tags.push({ text: t({ id: 'done-tag-dropped', args: { count: dropped } }), tone: 'danger' });
  if (unrecognized > 0) tags.push({ text: t({ id: 'done-tag-unrecognized', args: { count: unrecognized } }), tone: 'neutral' });
  if (untouched > 0) tags.push({ text: t({ id: 'done-tag-untouched', args: { count: untouched } }), tone: 'neutral' });
  if (failed > 0) tags.push({ text: t({ id: 'done-tag-failed', args: { count: failed } }), tone: 'danger' });
  return tags;
}

/** One converted file's line in a batch: what it lost, or that it converted cleanly. */
export function fileStatus(file: ReportFile | undefined, t: Translate): string {
  if (!file) return '';
  if (file.converted === 0) return t({ id: 'done-tag-nothing' });
  const sum = (entries: { count: number }[]) => entries.reduce((n, e) => n + e.count, 0);
  const parts = [
    { count: sum(file.groups.approximated), id: 'done-file-approximated' },
    { count: sum(file.groups.dropped), id: 'done-file-dropped' },
    { count: sum(file.groups.unrecognized), id: 'done-file-unrecognized' },
  ] as const;
  const lossy = parts.filter((p) => p.count > 0).map((p) => t({ id: p.id, args: { count: p.count } }));
  return lossy.length > 0 ? lossy.join(' · ') : t({ id: 'done-file-clean' });
}
