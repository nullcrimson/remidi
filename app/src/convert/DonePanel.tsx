import { useT } from '../locale/localeContext';
import { useEffect, useRef } from 'react';
import { saveBlob } from '../core/download';
import { engineCode } from '../core/engineCode';
import type { EngineNames, EnginePair } from '../core/enginePair';
import type { Note, Unrecognized } from '../core/midiremap';
import { reportLink, type ReportContext } from '../report/reportLink';
import type { FailedFile } from './batch';
import { ErrorText } from '../ui/ErrorText';
import type { ReportView } from '../report/report';
import { lossShares } from '../report/lossProps';
import type { Converted } from './useConverter';
import { zipFiles } from './zip';
import { Button } from '../ui/Button';
import { noteDownload } from '../tip/tipNote';
import { tag } from '../ui/styles';
import { DoneBadge, type DoneTone } from './DoneBadge';
import { fileStatus, outcomeTags } from './doneSummary';
import { UnrecognizedNotes, type SourceFixes } from './UnrecognizedNotes';
import { ReadAs, type WayBack } from './ReadAs';
import { DamagedFiles } from './DamagedFiles';
import { PartOffers } from './PartOffers';
import { WaitingFiles } from './WaitingFiles';
import type { Offer } from './partQuestions';
import { TextButton } from '../ui/TextButton';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';

const CARD_TONE: Record<DoneTone, string> = { accent: 'border-accent/20 bg-accent/6', danger: 'border-danger/30 bg-danger/6' };

export function DonePanel({
  results,
  failures,
  heavy,
  view,
  pair,
  report,
  names,
  unrecognized,
  onViewReport,
  onPickSource,
  onAssignNotes,
  onConvertMore,
  onDropMissing,
  editedDrums = 0,
  offers = [],
  onAlsoConvert = () => {},
  fixes = null,
  readAs = null,
  waiting = [],
  onShowWaiting = () => {},
}: {
  results: Converted['results'];
  failures: FailedFile[];
  heavy: boolean;
  view: ReportView;
  pair: EnginePair;
  report: ReportContext;
  names: EngineNames;
  unrecognized: Unrecognized;
  onViewReport: () => void;
  onPickSource: () => void;
  onAssignNotes: (notes: Note[]) => void;
  onConvertMore: () => void;
  onDropMissing?: () => void;
  editedDrums?: number;
  offers?: Offer[];
  onAlsoConvert?: (offer: Offer) => void;
  fixes?: SourceFixes | null;
  readAs?: { back: WayBack | null } | null;
  waiting?: string[];
  onShowWaiting?: (file: string) => void;
}) {
  const t = useT();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const markSaved = (how: StatEvents['downloaded']['how']) => {
    track('downloaded', { files: how === 'zip' ? results.length : 1, how });
    noteDownload('converted');
  };
  const single = results.length === 1;
  const downloadZip = () => {
    markSaved('zip');
    saveBlob(zipFiles(results), `remapped-${engineCode(pair.tgt)}.zip`);
  };

  const reportByName = new Map(view.files.map((f) => [f.name, f]));
  const showFiles = results.length + failures.length > 1;
  const tone: DoneTone = heavy || view.totals.converted === 0 ? 'danger' : 'accent';

  return (
    <div className="flex flex-col gap-4">
      <div
        data-tone={tone}
        className={`
          flex flex-col items-center gap-4 rounded-card border px-5 py-6
          text-center
          sm:p-8
          ${CARD_TONE[tone]}
        `}
      >
        <DoneBadge tone={tone} />
        <div className="flex flex-col items-center gap-2.5">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="
              font-display text-title font-semibold text-t1 outline-none
            "
          >
            <span>{t({ id: 'done-heading', args: { count: results.length, target: names.target } })}</span>
            {editedDrums > 0 && (
              <span className="font-normal text-t4">
                {` · ${t({ id: 'done-edited', args: { count: editedDrums } })}`}
              </span>
            )}
          </h3>
          {readAs && <ReadAs back={readAs.back} source={names.source} />}
          <ul className="flex flex-wrap justify-center gap-1.5">
            {outcomeTags(view, failures.length, heavy, t).map((item) => (
              <li key={item.text} {...tag(item.tone)}>{item.text}</li>
            ))}
          </ul>
          {heavy && <p className="text-ui text-danger">{t({ id: 'done-lost-many', args: { lost: view.totals.lost, read: view.totals.read } })}</p>}
          {view.totals.unrecognized > 0 && (
            <UnrecognizedNotes
              count={view.totals.unrecognized}
              entries={view.groups.unrecognized}
              source={names.source}
              target={names.target}
              unrecognized={unrecognized}
              fixes={fixes}
              onPickSource={onPickSource}
              onAssign={onAssignNotes}
            />
          )}
          <DamagedFiles results={results} />
          <PartOffers offers={offers} onAlsoConvert={onAlsoConvert} />
          <WaitingFiles files={waiting} onShow={onShowWaiting} />
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
            href={reportLink(report)}
            target="_blank"
            rel="noopener"
            onClick={() => track('mapping-reported', { from: report.from, to: report.to, closer: report.suggested ?? '', ...lossShares(view.totals) })}
            className="prose-link text-ui"
          >
            {t({ id: 'done-report-mapping' })}
          </a>
        </div>
      </div>

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
