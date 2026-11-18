import { useLocale } from '../locale/localeContext';
import type { Locale } from '../generated/i18n';
import { eventChannel } from '../core/channel';
import { engineName, namesOf, pairName } from '../core/enginePair';
import type { EngineId, Note } from '../core/midiremap';
import { share, shareBucket } from '../core/share';
import { buildTag, track } from '../core/stats';
import { suggestedEngine } from './sourceOffer';
import { SourceQuestion } from './SourceQuestion';
import type { WayBack } from './ReadAs';
import type { ReportView } from '../report/report';
import { lossLists } from '../report/lossProps';
import type { ReportContext } from '../report/reportLink';
import { ErrorText } from '../ui/ErrorText';
import type { FocusRef } from '../ui/useFocusIntent';
import { Rich } from '../ui/Rich';
import { convertReadiness } from './blocker';
import { ConvertButton } from './ConvertButton';
import type { ConvertActions } from './convertActions';
import { DonePanel } from './DonePanel';
import { showPartQuestion } from './partQuestionJump';
import { waitingFiles } from './partQuestions';
import type { SourceSurface } from './sourceSurface';
import type { SourceFixes } from './UnrecognizedNotes';
import type { Remapper } from './useRemapper';
import { isConverted, type Converted } from './useConverter';

/** What the done card offers for the source, each converting at once: from the suggested engine, or the other way round when the target is named. */
function doneFixes(remapper: Remapper, actions: ConvertActions, nameOf: (id: EngineId) => string): SourceFixes | null {
  if (remapper.offered === null) return null;
  return {
    offered: remapper.offered,
    nameOf,
    onConvertFrom: (engine) => void actions.convertFrom(engine, 'none'),
    onSwap: () => void actions.swapAndConvert(),
  };
}

/**
 * Which layout the file was read as after a suggestion was taken, and the way back, named by
 * the source it returns to, or by the whole pair when the target changed too.
 */
function readAsLine(remapper: Remapper, actions: ConvertActions, nameOf: (id: EngineId) => string): { back: WayBack | null } | null {
  if (remapper.readAs === null) return null;
  const { back } = remapper.readAs;
  if (back === null) return { back: null };
  const previous = back.pair.tgt === actions.setup.pair.tgt ? nameOf(back.pair.src) : pairName(namesOf(remapper.engines, back.pair));
  return { back: { previous, onBack: () => void actions.goBack(back) } };
}

/** What a report of the conversion `conv` is about, for the problem form. */
function reportContext(remapper: Remapper, conv: Converted, view: ReportView, lang: Locale): ReportContext {
  return {
    from: conv.pair.src,
    to: conv.pair.tgt,
    lang,
    build: buildTag(),
    files: conv.results.length,
    read: view.totals.read,
    lost: view.totals.lost,
    ...lossLists(conv.results.map((file) => file.report)),
    suggested: suggestedEngine(remapper.offered),
    missing: remapper.missing,
    keep: remapper.unrecognized,
    channel: eventChannel(conv.results, remapper.channel),
  };
}

/**
 * The last step's end: the Convert button and what failed, or the converted files once they
 * are ready. When the source may be wrong, a click on Convert asks first, in the button's
 * place, while `surface` is the question; closing it hands focus back through
 * `onQuestionClosed`.
 */
export function ConvertStepEnd({
  remapper,
  surface,
  reportView,
  editedDrums,
  convertRef,
  onViewReport,
  onPickSource,
  onAssignNotes,
  onDropMissing,
  onConvertMore,
  onQuestionClosed,
}: {
  remapper: Remapper;
  surface: SourceSurface;
  reportView: ReportView;
  editedDrums: number;
  convertRef: FocusRef;
  onViewReport: () => void;
  onPickSource: () => void;
  onAssignNotes: (notes: Note[]) => void;
  onDropMissing?: () => void;
  onConvertMore: () => void;
  onQuestionClosed: () => void;
}) {
  const { t, locale } = useLocale().translator;
  const { conversion, sourceQuestion: question } = remapper;
  const nameOf = (id: EngineId) => engineName(remapper.engines, id);
  if (conversion.kind === 'ready' && isConverted(conversion.conv)) {
    const conv = conversion.conv;
    const { actions } = conversion;
    return (
      <DonePanel
        results={conv.results}
        failures={conv.failures}
        heavy={conv.heavy}
        view={reportView}
        pair={conv.pair}
        report={reportContext(remapper, conv, reportView, locale)}
        names={namesOf(remapper.engines, conv.pair)}
        unrecognized={remapper.unrecognized}
        onViewReport={onViewReport}
        onPickSource={onPickSource}
        onAssignNotes={onAssignNotes}
        onDropMissing={onDropMissing}
        editedDrums={editedDrums}
        onConvertMore={onConvertMore}
        offers={remapper.questions.offers}
        onAlsoConvert={(offer) => void actions.alsoConvert(offer)}
        fixes={doneFixes(remapper, actions, nameOf)}
        readAs={readAsLine(remapper, actions, nameOf)}
        waiting={waitingFiles(remapper.files, remapper.questions.waiting, conv.failures)}
        onShowWaiting={showPartQuestion}
      />
    );
  }
  const readiness = convertReadiness({
    files: remapper.files.length,
    waiting: remapper.questions.waiting.size,
    actions: conversion.kind === 'ready' ? conversion.actions : null,
  });
  const partial = readiness.kind === 'ready' && readiness.waiting > 0;
  if (readiness.kind === 'ready' && surface.kind === 'question') {
    const { close } = question;
    const { actions } = readiness;
    return (
      <SourceQuestion
        offered={surface.offered}
        nameOf={nameOf}
        onSwitch={(engine) => {
          close();
          void actions.convertFrom(engine, 'switched');
        }}
        onPick={() => {
          close();
          onPickSource();
        }}
        onAnyway={() => {
          close();
          void actions.convertAnyway(partial);
        }}
        onDismiss={() => {
          close();
          onQuestionClosed();
        }}
      />
    );
  }
  const { offer } = question;
  const convertOrAsk = (actions: ConvertActions) => () => {
    if (offer.kind !== 'due') {
      void (partial ? actions.convertReady() : actions.convert());
      return;
    }
    const { offered } = offer;
    const engine = suggestedEngine(offered) ?? actions.setup.pair.tgt;
    track('source-asked', { missed: shareBucket(share(offered.missing, offered.hits)), engine, via: actions.setup.via });
    question.ask();
  };
  return (
    <>
      <ConvertButton
        ref={convertRef}
        conv={conversion.conv}
        state={readiness.kind === 'ready'
          ? {
              kind: 'ready',
              files: readiness.files,
              target: namesOf(remapper.engines, readiness.actions.setup.pair).target,
              partial,
              onConvert: convertOrAsk(readiness.actions),
            }
          : { kind: 'blocked', reason: t(readiness.reason), quiet: readiness.quiet }}
      />
      {conversion.conv.kind === 'error' && (
        <p
          role="alert"
          className="rounded-chip bg-danger/10 p-3 text-ui text-danger"
        >
          <Rich id="convert-error" slots={{ error: <ErrorText error={conversion.conv.error} /> }} />
        </p>
      )}
    </>
  );
}
