import { useT } from '../locale/localeContext';
import { useEffect, useRef, useState } from 'react';
import type { Editor } from './useEditor';
import { useFilter } from '../ui/useFilter';
import { groupByFamily } from './families';
import type { EnginePair } from '../core/enginePair';
import type { PresetName } from '../core/midiremap';
import type { SavedMapping } from '../presets/mappings';
import type { Note } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { isIssue, type EditFilter } from './editFilter';
import { EditFilters } from './EditFilters';
import { EditFooter } from './EditFooter';
import { pickOf } from './editorState';
import { FamilyRows } from './FamilyRows';
import { PlanErrorNotice } from './PlanErrorNotice';
import { SourceEditor } from './SourceEditor';
import { track } from '../core/stats';
import type { CloseHow } from './editorTally';
import { TextButton } from '../ui/TextButton';

interface EditViewProps {
  editor: Editor;
  pair: EnginePair;
  srcName: string;
  tgtName: string;
  oct: OctaveBase;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  presetsUnsaved: boolean;
  assignNote: Note | null;
  initialShow: EditFilter;
  onClose: (how: Exclude<CloseHow, 'history'>) => void;
  onSavePreset: (name: PresetName) => void;
  onUpdatePreset: (id: string, name: PresetName) => void;
}

/** The note editor screen: it owns the editor and hands each part only what it reads. */
export function EditView({
  editor,
  pair,
  srcName,
  tgtName,
  oct,
  existingPreset,
  presetsAtCap,
  presetsUnsaved,
  assignNote,
  initialShow,
  onClose,
  onSavePreset,
  onUpdatePreset,
}: EditViewProps) {
  const t = useT();
  const { rows, planError, changed, canonOptions, families, reset } = editor;
  const [advanced, setAdvanced] = useState(assignNote !== null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusHeading] = useState(pickOf(editor.overlay) === null && assignNote === null);
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);
  const [show, setShow] = useState<EditFilter>(initialShow);
  const { q, setQ, filtered } = useFilter(rows, (r) => r.label);
  const issues = rows.filter(isIssue).length;
  const shown = filtered.filter((r) =>
    show === 'changed' ? changed.has(r.canon) : show === 'issues' ? isIssue(r) : true,
  );
  const groups = groupByFamily(shown, (r) => r.family, families);

  return (
    <div className="flex flex-col">
      <div className="
        flex flex-col gap-5 p-5
        sm:p-[26px_30px_24px]
      "
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <TextButton onClick={() => onClose('back')}>{t({ id: 'edit-back' })}</TextButton>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-body font-semibold text-t1 outline-none"
            >
              {t({ id: 'edit-heading' })}
            </h2>
          </div>
          <span className="truncate text-label text-t4">
            {srcName} → {tgtName}
          </span>
        </div>

        {planError !== null && <PlanErrorNotice error={planError} onReset={reset} />}

        <EditFilters
          q={q}
          onQ={(text) => {
            editor.countFilter();
            setQ(text);
          }}
          show={show}
          onShow={(next) => {
            editor.countFilter();
            setShow(next);
          }}
          counts={{ all: rows.length, changed: changed.size, issues }}
        />

        <FamilyRows
          groups={groups}
          overlay={editor.overlay}
          edits={editor.edits}
          changed={changed}
          changedSrc={editor.changedSrc}
          targetDrums={editor.targetDrums}
          families={families}
          oct={oct}
          actions={editor}
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
            className="
              tap flex w-full items-center justify-between gap-3 rounded-panel
              border border-hairline px-4 py-3 text-left text-ui text-t2
              transition-colors
              hover:border-accent/40 hover:bg-accent/4 hover:text-t1
              aria-expanded:border-accent/40 aria-expanded:text-t1
            "
          >
            {t({ id: 'edit-advanced' })}
            <span
              aria-hidden="true"
              className={`
                text-accent transition-transform
                ${advanced ? 'rotate-180' : ''}
              `}
            >
              ▾
            </span>
          </button>
          {advanced && (
            <SourceEditor
              notes={editor.sourceNotes}
              srcEdits={editor.srcEdits}
              options={canonOptions}
              families={families}
              base={oct}
              initialNote={assignNote}
              onSet={editor.setSrcCanon}
              onClear={editor.clearSrcCanon}
            />
          )}
        </div>
      </div>

      <EditFooter
        changes={changed.size}
        onResetAll={() => {
          track('editor-reset');
          reset();
        }}
        pair={pair}
        existingPreset={existingPreset}
        presetsAtCap={presetsAtCap}
        presetsUnsaved={presetsUnsaved}
        onSavePreset={onSavePreset}
        onUpdatePreset={onUpdatePreset}
        onDone={() => onClose('done')}
      />
    </div>
  );
}
