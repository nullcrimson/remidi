import { useT } from '../locale/localeContext';
import { namesOf } from '../core/enginePair';
import type { ReportView } from '../report/report';
import { ErrorText } from '../ui/ErrorText';
import type { FocusRef } from '../ui/useFocusIntent';
import { Rich } from '../ui/Rich';
import { convertBlocker } from './blocker';
import { ConvertButton } from './ConvertButton';
import { DonePanel } from './DonePanel';
import type { Remapper } from './useRemapper';
import { isConverted } from './useConverter';

/** The last step's end: the Convert button and what failed, or the converted files once they are ready. */
export function ConvertOutcome({
  remapper,
  reportView,
  editedDrums,
  convertRef,
  onViewReport,
  onPickSource,
  onDropMissing,
  onConvertMore,
}: {
  remapper: Remapper;
  reportView: ReportView;
  editedDrums: number;
  convertRef: FocusRef;
  onViewReport: () => void;
  onPickSource: () => void;
  onDropMissing?: () => void;
  onConvertMore: () => void;
}) {
  const t = useT();
  const { conv, pair } = remapper;
  if (isConverted(conv)) {
    return (
      <DonePanel
        results={conv.results}
        failures={conv.failures}
        view={reportView}
        pair={conv.pair}
        names={namesOf(remapper.engines, conv.pair)}
        unrecognized={remapper.unrecognized}
        onViewReport={onViewReport}
        onPickSource={onPickSource}
        onDropMissing={onDropMissing}
        editedDrums={editedDrums}
        onConvertMore={onConvertMore}
      />
    );
  }
  const blocker = convertBlocker({ files: remapper.files.length, pair });
  return (
    <>
      <ConvertButton
        ref={convertRef}
        conv={conv}
        ready={pair && { files: remapper.files.length, target: namesOf(remapper.engines, pair).target }}
        blockedBy={blocker && { reason: t(blocker.reason), quiet: blocker.quiet }}
        onConvert={() => void remapper.convert()}
      />
      {conv.kind === 'error' && (
        <p
          role="alert"
          className="rounded-chip bg-danger/10 p-3 text-ui text-danger"
        >
          <Rich id="convert-error" slots={{ error: <ErrorText error={conv.error} /> }} />
        </p>
      )}
    </>
  );
}
