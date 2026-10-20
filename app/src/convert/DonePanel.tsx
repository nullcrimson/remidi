import type { MessageId } from '../generated/i18n';
import type { Translate } from '../locale/i18n';
import { useLocale, useT } from '../locale/localeContext';
import { useEffect, useRef, useState } from 'react';
import { saveBlob } from '../core/download';
import { engineCode } from '../core/engineCode';
import type { EngineNames, EnginePair } from '../core/enginePair';
import type { Unrecognized } from '../core/midiremap';
import { reportLink } from '../report/reportLink';
import type { FailedFile } from './batch';
import type { FileResult } from '../core/files';
import { ErrorText } from '../ui/ErrorText';
import type { ReportFile, ReportView } from '../report/report';
import { zipFiles } from './zip';
import { Button } from '../ui/Button';
import { askAfterDownload } from '../tip/tipAsk';
import { tag, type TagTone } from '../ui/styles';
import { TextButton } from '../ui/TextButton';
import { TipToast } from '../tip/TipToast';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

function outcomeTags(view: ReportView, failed: number, t: Translate): { text: string; tone: TagTone }[] {
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

function fileStatus(file: ReportFile | undefined, t: Translate): string {
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

const UNRECOGNIZED_SENTENCE = {
  remove: 'done-removed',
  keep: 'done-kept',
} as const satisfies Record<Unrecognized, MessageId>;

function UnrecognizedNotes({ count, source, unrecognized, onPickSource, onAssign }: {
  count: number;
  source: string;
  unrecognized: Unrecognized;
  onPickSource: () => void;
  onAssign: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5 text-ui text-t3">
      <p>{t({ id: UNRECOGNIZED_SENTENCE[unrecognized], args: { count, source } })}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextButton
          onClick={() => {
            track('done-wrong-source');
            onPickSource();
          }}
        >{t({ id: 'done-pick-source' })}
        </TextButton>
        <TextButton
          onClick={() => {
            track('done-assign-unrecognized');
            onAssign();
          }}
        >{t({ id: 'done-assign-notes' })}
        </TextButton>
      </div>
    </div>
  );
}

export function DonePanel({
  results,
  failures,
  view,
  pair,
  names,
  unrecognized,
  onViewReport,
  onPickSource,
  onConvertMore,
  onDropMissing,
  editedDrums = 0,
}: {
  results: FileResult[];
  failures: FailedFile[];
  view: ReportView;
  pair: EnginePair;
  names: EngineNames;
  unrecognized: Unrecognized;
  onViewReport: () => void;
  onPickSource: () => void;
  onConvertMore: () => void;
  onDropMissing?: () => void;
  editedDrums?: number;
}) {
  const { translator } = useLocale();
  const { t, locale } = translator;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const [asking, setAsking] = useState(false);
  const markSaved = (how: StatEvents['downloaded']['how']) => {
    track('downloaded', { files: how === 'zip' ? results.length : 1, how });
    if (askAfterDownload()) setAsking(true);
  };
  const single = results.length === 1;
  const downloadZip = () => {
    markSaved('zip');
    saveBlob(zipFiles(results), `remapped-${engineCode(pair.tgt)}.zip`);
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
          {t({ id: 'done-heading', args: { count: results.length, target: names.target } })}
          {editedDrums > 0 && (
            <span className="font-normal text-t4">
              {' · '}
              {t({ id: 'done-edited', args: { count: editedDrums } })}
            </span>
          )}
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {outcomeTags(view, failures.length, t).map((item) => (
            <li key={item.text} className={tag(item.tone)}>{item.text}</li>
          ))}
        </ul>
        {view.totals.unrecognized > 0 && (
          <UnrecognizedNotes
            count={view.totals.unrecognized}
            source={names.source}
            unrecognized={unrecognized}
            onPickSource={onPickSource}
            onAssign={onViewReport}
          />
        )}
      </div>

      {single
        ? (
            <Button variant="primary" size="lg" href={results[0].url} download={results[0].name} onClick={() => markSaved('single')}>
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
                <span className="text-t4">{fileStatus(reportByName.get(r.name), t)}</span>
                <TextButton href={r.url} download={r.name} onClick={() => markSaved('file')}>{t({ id: 'done-file-download' })}</TextButton>
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

      {asking && <TipToast onClose={() => setAsking(false)} />}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextButton
          tone="link"
          onClick={() => {
            track('report-opened');
            onViewReport();
          }}
        >{t({ id: 'done-view-report' })}
        </TextButton>
        <TextButton
          onClick={() => {
            track('convert-again');
            onConvertMore();
          }}
        >{t({ id: 'done-convert-more' })}
        </TextButton>
        {onDropMissing && (
          <TextButton
            onClick={() => {
              track('missing-dropped', { where: 'done' });
              onDropMissing();
            }}
          >
            {t({ id: 'drop-missing' })}
          </TextButton>
        )}
        <a
          href={reportLink({ from: pair.src, to: pair.tgt, lang: locale })}
          target="_blank"
          rel="noopener"
          onClick={() => track('mapping-reported')}
          className="prose-link text-ui"
        >
          {t({ id: 'done-report-mapping' })}
        </a>
      </div>
    </div>
  );
}
