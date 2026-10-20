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
import { SettingsFold } from './SettingsFold';
import { SummaryRow } from './SummaryRow';

type OpenEditor = (from: Extract<StatEvents['editor-opened']['from'], 'summary' | 'missing'>, show?: EditFilter) => void;

/** The conversion settings, folded under the line that names their values. */
export function PlanSettings({
  remapper,
  editor,
  open,
  onToggle,
  channelRef,
  onOpenEditor,
}: {
  remapper: Remapper;
  editor: Editor;
  open: boolean;
  onToggle: (open: boolean) => void;
  channelRef: FocusRef;
  onOpenEditor: OpenEditor;
}) {
  const t = useT();
  return (
    <SettingsFold
      open={open}
      onToggle={onToggle}
      oct={remapper.oct}
      channel={remapper.channel}
      missing={remapper.missing}
      unrecognized={remapper.unrecognized}
    >
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
    </SettingsFold>
  );
}

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
  onOpenEditor: OpenEditor;
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
