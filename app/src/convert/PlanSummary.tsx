import type { useEditedSummary } from '../editor/useEditedSummary';
import type { Editor } from '../editor/useEditor';
import type { FocusRef } from '../ui/useFocusIntent';
import type { Remapper } from './useRemapper';
import type { StatEvents } from '../core/umami';
import type { EditFilter } from '../editor/editFilter';
import { namesOf } from '../core/enginePair';
import { planBreakdown } from './planBreakdown';
import { PlanErrorNotice } from '../editor/PlanErrorNotice';
import { SummaryRow } from './SummaryRow';

/** Once both engines are picked, what the plan does to every drum. */
export function PlanSummary({
  remapper,
  editor,
  edited,
  editRef,
  onOpenEditor,
}: {
  remapper: Remapper;
  editor: Editor;
  edited: ReturnType<typeof useEditedSummary>;
  editRef: FocusRef;
  onOpenEditor: (from: Extract<StatEvents['editor-opened']['from'], 'summary'>, show?: EditFilter) => void;
}) {
  const { pair } = remapper;
  if (pair === null) return null;
  if (editor.planError !== null) return <PlanErrorNotice error={editor.planError} onReset={editor.reset} />;
  return (
    <SummaryRow
      remapped={editor.remappedCount}
      total={editor.rows.length}
      onEdit={(show) => onOpenEditor('summary', show)}
      breakdown={planBreakdown(editor.rows, editor.targetDrums, remapper.oct)}
      names={namesOf(remapper.engines, pair)}
      editRef={editRef}
      edited={edited.count > 0 ? { ...edited, onReview: () => onOpenEditor('summary', 'changed') } : undefined}
    />
  );
}
