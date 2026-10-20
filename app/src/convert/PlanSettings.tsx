import type { Editor } from '../editor/useEditor';
import type { FocusRef } from '../ui/useFocusIntent';
import type { Remapper } from './useRemapper';
import type { StatEvents } from '../core/umami';
import type { EditFilter } from '../editor/editFilter';
import { missingHint, swapList } from '../core/missing';
import { useT } from '../locale/localeContext';
import { ConvertSettings } from './ConvertSettings';
import { SettingsFold } from './SettingsFold';

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
  onOpenEditor: (from: Extract<StatEvents['editor-opened']['from'], 'missing'>, show: EditFilter) => void;
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
