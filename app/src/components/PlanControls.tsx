import type { useEditedSummary } from '../hooks/useEditedSummary';
import type { Editor } from '../hooks/useEditor';
import type { FocusRef } from '../hooks/useFocusIntent';
import type { useRemapper } from '../hooks/useRemapper';
import type { EditFilter } from '../lib/editFilter';
import { missingHint, swapList } from '../lib/missing';
import { planBreakdown } from '../lib/planBreakdown';
import { useT } from '../localeContext';
import { ConvertSettings } from './ConvertSettings';
import { PlanErrorNotice } from './PlanErrorNotice';
import { SummaryRow, type EngineNames } from './SummaryRow';

/** The conversion settings and, once both engines are picked, what the plan does to every drum. */
export function PlanControls({
  c,
  editor,
  edited,
  names,
  channelRef,
  editRef,
  onOpenEditor,
}: {
  c: ReturnType<typeof useRemapper>;
  editor: Editor;
  edited: ReturnType<typeof useEditedSummary>;
  names: EngineNames;
  channelRef: FocusRef;
  editRef: FocusRef;
  onOpenEditor: (show?: EditFilter) => void;
}) {
  const t = useT();
  const bothSelected = c.src !== '' && c.tgt !== '';
  return (
    <>
      <ConvertSettings
        oct={c.oct}
        onOct={c.setOct}
        channel={c.channel}
        onChannel={c.setChannel}
        channelRef={channelRef}
        missing={c.missing}
        missingHint={t(missingHint(c.missing, editor.rows))}
        missingSwaps={swapList(editor.rows, editor.targetDrums, c.oct)}
        onMissingDetail={() => onOpenEditor('issues')}
        onMissing={c.setMissing}
      />

      {bothSelected && editor.planError !== null && (
        <PlanErrorNotice error={editor.planError} onReset={editor.reset} />
      )}

      {bothSelected && editor.planError === null && (
        <SummaryRow
          remapped={editor.remappedCount}
          total={editor.rows.length}
          onEdit={onOpenEditor}
          breakdown={planBreakdown(editor.rows, editor.targetDrums, c.oct)}
          names={names}
          editRef={editRef}
          edited={edited.count > 0 ? { ...edited, onReview: () => onOpenEditor('changed') } : undefined}
        />
      )}
    </>
  );
}
