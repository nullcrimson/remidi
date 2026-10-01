import { useT } from '../localeContext';
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
  const t = useT();
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
            <TextButton onClick={() => setView('convert')}>{t({ id: 'edit-back' })}</TextButton>
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
