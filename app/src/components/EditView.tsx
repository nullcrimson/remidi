import { useEffect, useRef, useState } from 'react';
import type { Editor } from '../hooks/useEditor';
import { useFilter } from '../hooks/useFilter';
import { groupByFamily } from '../lib/families';
import type { SavedMapping } from '../lib/mappings';
import type { OctaveBase } from '../lib/notes';
import { isIssue, type EditFilter } from '../lib/editFilter';
import { EditFilters } from './edit/EditFilters';
import { EditFooter } from './edit/EditFooter';
import { FamilyRows } from './edit/FamilyRows';
import { PlanErrorNotice } from './PlanErrorNotice';
import { SourceEditor } from './SourceEditor';
import { textAction } from './styles';
import { TextButton } from './TextButton';

export interface EditViewProps {
  editor: Editor;
  src: string;
  tgt: string;
  srcName: string;
  tgtName: string;
  oct: OctaveBase;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  assignNote?: number | null;
  initialShow?: EditFilter;
  setView: (v: 'convert' | 'edit') => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (id: string, name: string) => void;
}

/** The note editor screen: it owns the editor and hands each part only what it reads. */
export function EditView({
  editor,
  src,
  tgt,
  srcName,
  tgtName,
  oct,
  existingPreset,
  presetsAtCap,
  assignNote = null,
  initialShow = 'all',
  setView,
  onSavePreset,
  onUpdatePreset,
}: EditViewProps) {
  const { rows, planError, changed, canonOptions, families, reset } = editor;
  const [advanced, setAdvanced] = useState(assignNote !== null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusHeading] = useState(editor.pick === null && assignNote === null);
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);
  const [show, setShow] = useState<EditFilter>(initialShow);
  const { q, setQ, filtered } = useFilter(rows, (r) => r.label);
  const issues = rows.filter(isIssue).length;
  const shown = filtered.filter((r) =>
    show === 'changed' ? changed.has(r.canon) : show === 'issues' ? isIssue(r) : true,
  );
  const familyOf = new Map(canonOptions.map((c) => [c.canon, c.family]));
  const groups = groupByFamily(shown, (r) => familyOf.get(r.canon) ?? 'Other', families);

  return (
    <div className="flex flex-col">
      <div className="
        flex flex-col gap-5 p-5
        sm:p-[26px_30px_24px]
      "
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <TextButton onClick={() => setView('convert')}>← Back</TextButton>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-body font-semibold text-t1 outline-none"
            >
              Edit notes
            </h2>
          </div>
          <span className="truncate text-label text-t4">
            {srcName} → {tgtName}
          </span>
        </div>

        {planError !== null && <PlanErrorNotice message={planError} onReset={reset} />}

        <EditFilters
          q={q}
          onQ={setQ}
          show={show}
          onShow={setShow}
          counts={{ all: rows.length, changed: changed.size, issues }}
        />

        <FamilyRows
          groups={groups}
          pick={editor.pick}
          notice={editor.notice}
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
            className={`
              self-start
              ${textAction()}
            `}
          >
            {advanced ? '▾' : '▸'} Advanced — reassign source notes
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
        onResetAll={reset}
        src={src}
        tgt={tgt}
        existingPreset={existingPreset}
        presetsAtCap={presetsAtCap}
        onSavePreset={onSavePreset}
        onUpdatePreset={onUpdatePreset}
        onDone={() => setView('convert')}
      />
    </div>
  );
}
