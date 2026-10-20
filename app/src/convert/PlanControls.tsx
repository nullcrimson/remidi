import type { useEditedSummary } from '../editor/useEditedSummary';
import type { Editor } from '../editor/useEditor';
import type { FocusRef } from '../ui/useFocusIntent';
import type { Remapper } from './useRemapper';
import type { StatEvents } from '../core/umami';
import type { EditFilter } from '../editor/editFilter';
import { namesOf } from '../core/enginePair';
import { missingHint, swapList } from '../core/missing';
import { planBreakdown } from './planBreakdown';
import { useT } from '../locale/localeContext';
import { ConvertSettings } from './ConvertSettings';
import { PlanErrorNotice } from '../editor/PlanErrorNotice';
import { SummaryRow } from './SummaryRow';

/** The conversion settings and, once both engines are picked, what the plan does to every drum. */
export function PlanControls({
  remapper,
  editor,
  edited,
  channelRef,
  editRef,
  onOpenEditor,
}: {
  remapper: Remapper;
  editor: Editor;
  edited: ReturnType<typeof useEditedSummary>;
  channelRef: FocusRef;
  editRef: FocusRef;
  onOpenEditor: (from: Extract<StatEvents['editor-opened']['from'], 'summary' | 'missing'>, show?: EditFilter) => void;
}) {
  const t = useT();
  const { pair } = remapper;
  return (
    <>
      <ConvertSettings
        oct={remapper.oct}
        onOct={remapper.setOct}
        channel={remapper.channel}
        onChannel={remapper.setChannel}
        channelRef={channelRef}
        missing={remapper.missing}
        missingHint={t(missingHint(remapper.missing, editor.rows))}
        missingSwaps={swapList(editor.rows, editor.targetDrums, remapper.oct)}
        onMissingDetail={() => onOpenEditor('missing', 'issues')}
        onMissing={remapper.setMissing}
        unrecognized={remapper.unrecognized}
        onUnrecognized={remapper.setUnrecognized}
      />

      {pair !== null && editor.planError !== null && (
        <PlanErrorNotice error={editor.planError} onReset={editor.reset} />
      )}

      {pair !== null && editor.planError === null && (
        <SummaryRow
          remapped={editor.remappedCount}
          total={editor.rows.length}
          onEdit={(show) => onOpenEditor('summary', show)}
          breakdown={planBreakdown(editor.rows, editor.targetDrums, remapper.oct)}
          names={namesOf(remapper.engines, pair)}
          editRef={editRef}
          edited={edited.count > 0 ? { ...edited, onReview: () => onOpenEditor('summary', 'changed') } : undefined}
        />
      )}
    </>
  );
}
