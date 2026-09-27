import { useEffect, useMemo } from 'react';
import type { FileFailure, FileResult } from '../lib/files';
import type { ReportFile, ReportView } from '../lib/report';
import { zipFiles } from '../lib/zip';
import { Button } from './Button';
import { tag, type TagTone } from './styles';
import { TextButton } from './TextButton';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function outcomeTags(view: ReportView, failed: number): { text: string; tone: TagTone }[] {
  const { converted, approximated, dropped, unrecognized, untouched } = view.totals;
  const tags: { text: string; tone: TagTone }[] = [
    converted > 0
      ? { text: `${plural(converted, 'note', 'notes')} converted`, tone: 'neutral' }
      : { text: 'nothing converted', tone: 'danger' },
  ];
  if (approximated > 0) tags.push({ text: `${approximated} approximated`, tone: 'gold' });
  if (dropped > 0) tags.push({ text: `${dropped} dropped`, tone: 'danger' });
  if (unrecognized > 0) tags.push({ text: `${unrecognized} unrecognized`, tone: 'neutral' });
  if (untouched > 0) tags.push({ text: `${untouched} on other channels unchanged`, tone: 'neutral' });
  if (failed > 0) tags.push({ text: `${failed} failed`, tone: 'danger' });
  return tags;
}

function fileStatus(file: ReportFile | undefined): string {
  if (!file) return '';
  if (file.converted === 0) return 'nothing converted';
  const sum = (entries: { count: number }[]) => entries.reduce((n, e) => n + e.count, 0);
  const parts = [
    [sum(file.groups.approximated), 'approx'],
    [sum(file.groups.dropped), 'dropped'],
    [sum(file.groups.unrecognized), 'unrec.'],
  ] as const;
  const lossy = parts.filter(([n]) => n > 0).map(([n, what]) => `${n} ${what}`);
  return lossy.length > 0 ? lossy.join(' · ') : 'clean';
}

export function DonePanel({
  results,
  failures,
  view,
  targetName,
  targetShort,
  onViewReport,
  onConvertMore,
}: {
  results: FileResult[];
  failures: FileFailure[];
  view: ReportView;
  targetName: string;
  targetShort: string;
  onViewReport: () => void;
  onConvertMore: () => void;
}) {
  const single = results.length === 1;
  const zipUrl = useMemo(
    () => (single ? null : URL.createObjectURL(zipFiles(results))),
    [single, results],
  );
  useEffect(() => {
    if (!zipUrl) return;
    return () => URL.revokeObjectURL(zipUrl);
  }, [zipUrl]);

  const reportByName = new Map(view.files.map((f) => [f.name, f]));
  const showFiles = results.length + failures.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <p className="text-body font-semibold text-t1">
          {plural(results.length, 'file', 'files')} converted → {targetName}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {outcomeTags(view, failures.length).map((t) => (
            <li key={t.text} className={tag(t.tone)}>{t.text}</li>
          ))}
        </ul>
      </div>

      {single
        ? (
            <Button variant="primary" size="lg" href={results[0].url} download={results[0].name}>
              ↓ Download .mid
            </Button>
          )
        : zipUrl && (
          <Button variant="primary" size="lg" href={zipUrl} download={`remapped-${targetShort}.zip`}>
            ↓ Download {results.length} files (.zip)
          </Button>
        )}

      {showFiles && (
        <ul aria-label="Converted files" className="flex flex-col">
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
                <TextButton href={r.url} download={r.name}>↓ .mid</TextButton>
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
              <span className="shrink-0 text-danger">{f.error.replace(/^Error: /, '')}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-5">
        <TextButton onClick={onViewReport}>View report →</TextButton>
        <TextButton onClick={onConvertMore}>Convert more</TextButton>
      </div>
    </div>
  );
}
