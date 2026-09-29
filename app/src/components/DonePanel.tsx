import { t } from '../i18n';
import { useEffect, useRef } from 'react';
import { saveFile } from '../lib/download';
import type { FailedFile } from '../lib/batch';
import type { FileResult } from '../lib/files';
import { ErrorText } from './ErrorText';
import type { ReportFile, ReportView } from '../lib/report';
import { zipFiles } from '../lib/zip';
import { Button } from './Button';
import { tag, type TagTone } from './styles';
import { TextButton } from './TextButton';

const FREE_ZIP_AFTER_MS = 10_000;

function outcomeTags(view: ReportView, failed: number): { text: string; tone: TagTone }[] {
  const { converted, approximated, dropped, unrecognized, untouched } = view.totals;
  const tags: { text: string; tone: TagTone }[] = [
    converted > 0
      ? { text: t({ id: 'done-tag-converted', args: { count: converted } }), tone: 'neutral' }
      : { text: t({ id: 'done-tag-nothing' }), tone: 'danger' },
  ];
  if (approximated > 0) tags.push({ text: t({ id: 'done-tag-approximated', args: { count: approximated } }), tone: 'gold' });
  if (dropped > 0) tags.push({ text: t({ id: 'done-tag-dropped', args: { count: dropped } }), tone: 'danger' });
  if (unrecognized > 0) tags.push({ text: t({ id: 'done-tag-unrecognized', args: { count: unrecognized } }), tone: 'neutral' });
  if (untouched > 0) tags.push({ text: t({ id: 'done-tag-untouched', args: { count: untouched } }), tone: 'neutral' });
  if (failed > 0) tags.push({ text: t({ id: 'done-tag-failed', args: { count: failed } }), tone: 'danger' });
  return tags;
}

function fileStatus(file: ReportFile | undefined): string {
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

export function DonePanel({
  results,
  failures,
  view,
  targetName,
  targetShort,
  onViewReport,
  onConvertMore,
  onDropMissing,
  editedDrums = 0,
}: {
  results: FileResult[];
  failures: FailedFile[];
  view: ReportView;
  targetName: string;
  targetShort: string;
  onViewReport: () => void;
  onConvertMore: () => void;
  onDropMissing?: () => void;
  editedDrums?: number;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const single = results.length === 1;
  const downloadZip = () => {
    const url = URL.createObjectURL(zipFiles(results));
    saveFile(url, `remapped-${targetShort}.zip`);
    setTimeout(() => URL.revokeObjectURL(url), FREE_ZIP_AFTER_MS);
  };

  const reportByName = new Map(view.files.map((f) => [f.name, f]));
  const showFiles = results.length + failures.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-body font-semibold text-t1 outline-none"
        >
          {t({ id: 'done-heading', args: { count: results.length, target: targetName } })}
          {editedDrums > 0 && (
            <span className="font-normal text-t4">
              {' · '}
              {t({ id: 'done-edited', args: { count: editedDrums } })}
            </span>
          )}
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {outcomeTags(view, failures.length).map((item) => (
            <li key={item.text} className={tag(item.tone)}>{item.text}</li>
          ))}
        </ul>
      </div>

      {single
        ? (
            <Button variant="primary" size="lg" href={results[0].url} download={results[0].name}>
              {t({ id: 'done-download-one' })}
            </Button>
          )
        : (
            <Button variant="primary" size="lg" onClick={downloadZip}>
              {t({ id: 'done-download-zip', args: { count: results.length } })}
            </Button>
          )}

      {showFiles && (
        <ul aria-label={t({ id: 'done-files' })} className="flex flex-col">
          {results.map((r) => (
            <li
              key={r.name}
              className="
                flex items-center justify-between gap-3 border-b border-hairline
                py-2 text-label
              "
            >
              <span className="min-w-0 truncate font-mono text-t2">{r.name}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-t4">{fileStatus(reportByName.get(r.name))}</span>
                <TextButton href={r.url} download={r.name}>{t({ id: 'done-file-download' })}</TextButton>
              </span>
            </li>
          ))}
          {failures.map((f) => (
            <li
              key={f.name}
              className="
                flex items-center justify-between gap-3 border-b border-hairline
                py-2 text-label
              "
            >
              <span className="min-w-0 truncate font-mono text-t2">{f.name}</span>
              <span className="shrink-0 text-danger"><ErrorText error={f.error} /></span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextButton onClick={onViewReport}>{t({ id: 'done-view-report' })}</TextButton>
        <TextButton onClick={onConvertMore}>{t({ id: 'done-convert-more' })}</TextButton>
        {onDropMissing && (
          <TextButton onClick={onDropMissing}>{t({ id: 'drop-missing' })}</TextButton>
        )}
      </div>
    </div>
  );
}
