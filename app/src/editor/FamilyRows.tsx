import type { Translate } from '../locale/i18n';
import { useT } from '../locale/localeContext';
import { Fragment } from 'react';
import type { Editor } from './useEditor';
import type { Canon, Drum, Family, Note, VoiceRow as VoiceRowData } from '../core/midiremap';
import { labelByNote } from '../core/drums';
import { noteName, type OctaveBase } from '../core/notes';
import { MonoLabel } from '../ui/MonoLabel';
import { NotePicker } from './NotePicker';
import { SourceNotePicker } from './SourceNotePicker';
import { ROW_GRID } from './rowGrid';
import { pickOf } from './editorState';
import { VoiceRow, type RowResult } from './VoiceRow';
import { isPlayed, leadNote, playedNote } from '../core/outcome';

type RowActions = Pick<
  Editor,
  | 'openPick'
  | 'openSrcPick'
  | 'closePick'
  | 'setPickOct'
  | 'chooseNote'
  | 'chooseSrcNote'
  | 'countPick'
  | 'resetRow'
>;

function playsOf(row: VoiceRowData, changed: boolean, drumAt: (note: Note) => string, t: Translate): RowResult {
  if (!isPlayed(row)) return { text: t({ id: 'row-no-source' }), tone: 'faint' };
  if (row.outcome.status === 'dropped') return { text: t({ id: 'row-dropped' }), tone: 'danger' };
  const name = drumAt(row.outcome.tgtNote);
  if (changed) return { text: name, tone: 'strong' };
  if (row.outcome.status === 'fallback') return { text: `≈ ${name}`, tone: 'gold' };
  return { text: name, tone: 'faint' };
}

function Header() {
  const t = useT();
  return (
    <div className={`
      ${ROW_GRID}
      pb-1
    `}
    >
      <MonoLabel>{t({ id: 'rows-drum' })}</MonoLabel>
      <MonoLabel className="justify-self-end">{t({ id: 'rows-source' })}</MonoLabel>
      <span />
      <MonoLabel>{t({ id: 'rows-target' })}</MonoLabel>
      <MonoLabel className="
        hidden
        sm:block
      "
      >
        {t({ id: 'rows-plays' })}
      </MonoLabel>
      <span />
    </div>
  );
}

/** The editor's drum rows, grouped by family, each with its source and target pickers. */
export function FamilyRows({
  groups,
  overlay,
  edits,
  changed,
  changedSrc,
  targetDrums,
  families,
  oct,
  actions,
}: {
  groups: { family: Family; items: VoiceRowData[] }[];
  overlay: Editor['overlay'];
  edits: Editor['edits'];
  changed: ReadonlySet<Canon>;
  changedSrc: ReadonlySet<Canon>;
  targetDrums: Drum[];
  families: readonly Family[];
  oct: OctaveBase;
  actions: RowActions;
}) {
  const t = useT();
  const drumByNote = labelByNote(targetDrums);
  const drumAt = (note: Note) => drumByNote.get(note) ?? noteName(note, oct);

  return (
    <div>
      <Header />
      {groups.length === 0 && <p className="py-4 text-ui text-t4">{t({ id: 'rows-none' })}</p>}
      {groups.map((g) => (
        <div key={g.family} className="pt-3">
          <div
            data-testid="family"
            className="
              border-b border-hairline pb-1 font-mono text-caption
              tracking-[0.14em] text-t4
            "
          >
            {g.family}
          </div>
          {g.items.map((row) => {
            const here = overlay?.canon === row.canon ? overlay : null;
            const rowChanged = changed.has(row.canon);
            return (
              <Fragment key={row.canon}>
                <VoiceRow
                  row={row}
                  base={oct}
                  srcChanged={changedSrc.has(row.canon)}
                  tgtChanged={row.canon in edits}
                  expanded={pickOf(here)?.kind ?? null}
                  onSrcToggle={() => (here?.kind === 'src' ? actions.closePick() : actions.openSrcPick(row.canon))}
                  onToggle={() => (here?.kind === 'tgt' ? actions.closePick() : actions.openPick(row.canon))}
                  result={playsOf(row, rowChanged, drumAt, t)}
                  onReset={rowChanged ? () => actions.resetRow(row.canon) : undefined}
                >
                  {here?.kind === 'src' && (
                    <SourceNotePicker
                      voiceLabel={row.label}
                      currentNote={leadNote(row)}
                      octIndex={here.octIndex}
                      base={oct}
                      onSetOct={(octIndex) => actions.setPickOct(here, octIndex)}
                      onPickNote={(note) => actions.chooseSrcNote(here, note)}
                      onClose={actions.closePick}
                    />
                  )}
                  {here?.kind === 'tgt' && (
                    <NotePicker
                      voiceLabel={row.label}
                      currentNote={playedNote(row.outcome)}
                      octIndex={here.octIndex}
                      base={oct}
                      drums={targetDrums}
                      families={families}
                      onSetOct={(octIndex) => actions.setPickOct(here, octIndex)}
                      onPickNote={(note) => actions.chooseNote(here, note)}
                      onPickVia={actions.countPick}
                      onClose={actions.closePick}
                    />
                  )}
                </VoiceRow>
                {here?.kind === 'notice' && (
                  <p role="status" className="px-1 pb-2 text-label text-t4">
                    {t({ id: 'rows-reassigned', args: { note: noteName(here.note, oct), from: here.from, drum: row.label } })}
                  </p>
                )}
              </Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
