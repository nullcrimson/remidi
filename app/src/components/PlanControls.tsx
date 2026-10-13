import type { useEditedSummary } from '../hooks/useEditedSummary';
import type { Editor } from '../hooks/useEditor';
import type { FocusRef } from '../hooks/useFocusIntent';
import type { Remapper } from '../hooks/useRemapper';
import type { EditFilter } from '../lib/editFilter';
import { missingHint, swapList } from '../lib/missing';
import { planBreakdown } from '../lib/planBreakdown';
import { useT } from '../localeContext';
import { ConvertSettings } from './ConvertSettings';
import { PlanErrorNotice } from './PlanErrorNotice';
import { SummaryRow, type EngineNames } from './SummaryRow';

/** The conversion settings and, once both engines are picked, what the plan does to every drum. */
export function PlanControls({
  remapper,
  editor,
  edited,
  names,
  channelRef,
  editRef,
  onOpenEditor,
}: {
  remapper: Remapper;
  editor: Editor;
  edited: ReturnType<typeof useEditedSummary>;
  names: EngineNames;
  channelRef: FocusRef;
  editRef: FocusRef;
  onOpenEditor: (show?: EditFilter) => void;
}) {
  const t = useT();
  const bothSelected = remapper.src !== '' && remapper.tgt !== '';
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
        onMissingDetail={() => onOpenEditor('issues')}
        onMissing={remapper.setMissing}
      />

      {bothSelected && editor.planError !== null && (
        <PlanErrorNotice error={editor.planError} onReset={editor.reset} />
      )}

      {bothSelected && editor.planError === null && (
        <SummaryRow
          remapped={editor.remappedCount}
          total={editor.rows.length}
          onEdit={onOpenEditor}
          breakdown={planBreakdown(editor.rows, editor.targetDrums, remapper.oct)}
          names={names}
          editRef={editRef}
          edited={edited.count > 0 ? { ...edited, onReview: () => onOpenEditor('changed') } : undefined}
        />
      )}
    </>
  );
}
