import { useLocale } from '../locale/localeContext';
import { useEffect, useRef, useState } from 'react';
import { saveBlob } from '../core/download';
import { engineCode } from '../core/engineCode';
import type { EngineNames, EnginePair } from '../core/enginePair';
import type { Unrecognized } from '../core/midiremap';
import { reportLink } from '../report/reportLink';
import type { FailedFile } from './batch';
import { ErrorText } from '../ui/ErrorText';
import type { ReportView } from '../report/report';
import type { Converted } from './useConverter';
import { zipFiles } from './zip';
import { Button } from '../ui/Button';
import { askAfterDownload } from '../tip/tipAsk';
import { tag } from '../ui/styles';
import { CheckIcon } from '../ui/CheckIcon';
import { fileStatus, outcomeTags } from './doneSummary';
import { UnrecognizedNotes } from './UnrecognizedNotes';
import { TextButton } from '../ui/TextButton';
import { TipToast } from '../tip/TipToast';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

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
  results: Converted['results'];
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
      <div className="
        flex flex-col items-center gap-4 rounded-card border border-accent/20
        bg-accent/6 px-5 py-6 text-center
        sm:p-8
      "
      >
        <span
          aria-hidden="true"
          className="
            flex size-12 items-center justify-center rounded-full bg-accent/16
            text-accent
          "
        >
          <CheckIcon size={22} />
        </span>
        <div className="flex flex-col items-center gap-2.5">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="
              font-display text-title font-semibold text-t1 outline-none
            "
          >
            {t({ id: 'done-heading', args: { count: results.length, target: names.target } })}
            {editedDrums > 0 && (
              <span className="font-normal text-t4">
                {' · '}
                {t({ id: 'done-edited', args: { count: editedDrums } })}
              </span>
            )}
          </h3>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {outcomeTags(view, failures.length, t).map((item) => (
              <li key={item.text} {...tag(item.tone)}>{item.text}</li>
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

        <div className="flex w-full flex-col items-center gap-1.5">
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
          {single && <span className="font-mono text-label text-t4">{results[0].name}</span>}
        </div>

        {showFiles && (
          <ul
            aria-label={t({ id: 'done-files' })}
            className="flex w-full flex-col text-left"
          >
            {results.map((r) => (
              <li
                key={r.name}
                className="
                  flex items-center justify-between gap-3 border-b
                  border-hairline py-2 text-label
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
                  flex items-center justify-between gap-3 border-b
                  border-hairline py-2 text-label
                "
              >
                <span className="min-w-0 truncate font-mono text-t2">{f.name}</span>
                <span className="shrink-0 text-danger"><ErrorText error={f.error} /></span>
              </li>
            ))}
          </ul>
        )}

        <div className="
          flex flex-wrap items-center justify-center gap-x-5 gap-y-2
        "
        >
          <TextButton
            tone="link"
            onClick={() => {
              track('report-opened');
              onViewReport();
            }}
          >{t({ id: 'done-view-report' })}
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

      {asking && <TipToast onClose={() => setAsking(false)} />}

      <div className="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5
      "
      >
        <p className="text-ui text-t4">{t({ id: 'done-convert-more-hint' })}</p>
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            track('convert-again');
            onConvertMore();
          }}
        >{t({ id: 'done-convert-more' })}
        </Button>
      </div>
    </div>
  );
}
