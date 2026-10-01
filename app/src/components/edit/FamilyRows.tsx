import type { Translate } from '../../i18n';
import { useT } from '../../localeContext';
import { Fragment } from 'react';
import type { Editor } from '../../hooks/useEditor';
import type { Drum, VoiceRow as VoiceRowData } from '../../lib/midiremap';
import { labelByNote } from '../../lib/missing';
import { noteName, type OctaveBase } from '../../lib/notes';
import { MonoLabel } from '../MonoLabel';
import { NotePicker } from '../NotePicker';
import { SourceNotePicker } from '../SourceNotePicker';
import { ROW_GRID } from '../styles';
import { VoiceRow, type RowResult } from '../VoiceRow';
import { playedNote } from '../../lib/outcome';

/** The editor actions a row and its pickers use. */
export type RowActions = Pick<
  Editor,
  | 'openPick'
  | 'openSrcPick'
  | 'closePick'
  | 'setPickOct'
  | 'chooseNote'
  | 'chooseNoteAbsolute'
  | 'chooseSrcNote'
  | 'resetRow'
>;

function playsOf(row: VoiceRowData, changed: boolean, drumAt: (note: number) => string, t: Translate): RowResult {
  if (row.srcNotes.length === 0) return { text: t({ id: 'row-no-source' }), tone: 'text-t5' };
  if (row.outcome.status === 'dropped') return { text: t({ id: 'row-dropped' }), tone: 'text-danger' };
  const name = drumAt(row.outcome.tgtNote);
  if (changed) return { text: name, tone: 'text-t2' };
  if (row.outcome.status === 'fallback') return { text: `≈ ${name}`, tone: 'text-star' };
  return { text: name, tone: 'text-t5' };
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
  pick,
  notice,
  edits,
  changed,
  changedSrc,
  targetDrums,
  families,
  oct,
  actions,
}: {
  groups: { family: string; items: VoiceRowData[] }[];
  pick: Editor['pick'];
  notice: Editor['notice'];
  edits: Editor['edits'];
  changed: ReadonlySet<string>;
  changedSrc: ReadonlySet<string>;
  targetDrums: Drum[];
  families: readonly string[];
  oct: OctaveBase;
  actions: RowActions;
}) {
  const t = useT();
  const drumByNote = labelByNote(targetDrums);
  const drumAt = (note: number) => drumByNote.get(note) ?? noteName(note, oct);

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
            const srcExpanded = pick?.canon === row.canon && pick.side === 'src';
            const tgtExpanded = pick?.canon === row.canon && pick.side === 'tgt';
            const rowChanged = changed.has(row.canon);
            return (
              <Fragment key={row.canon}>
                <VoiceRow
                  row={row}
                  base={oct}
                  srcChanged={changedSrc.has(row.canon)}
                  tgtChanged={row.canon in edits}
                  srcExpanded={srcExpanded}
                  tgtExpanded={tgtExpanded}
                  onSrcToggle={() => (srcExpanded ? actions.closePick() : actions.openSrcPick(row.canon))}
                  onToggle={() => (tgtExpanded ? actions.closePick() : actions.openPick(row.canon))}
                  result={playsOf(row, rowChanged, drumAt, t)}
                  onReset={rowChanged ? () => actions.resetRow(row.canon) : undefined}
                >
                  {srcExpanded && pick && (
                    <SourceNotePicker
                      voiceLabel={row.label}
                      currentNote={row.srcNotes[0] ?? null}
                      octIndex={pick.octIndex}
                      base={oct}
                      onSetOct={actions.setPickOct}
                      onPickSemitone={actions.chooseSrcNote}
                      onClose={actions.closePick}
                    />
                  )}
                  {tgtExpanded && pick && (
                    <NotePicker
                      voiceLabel={row.label}
                      currentNote={playedNote(row.outcome)}
                      octIndex={pick.octIndex}
                      base={oct}
                      drums={targetDrums}
                      families={families}
                      onSetOct={actions.setPickOct}
                      onPickSemitone={actions.chooseNote}
                      onPickNote={actions.chooseNoteAbsolute}
                      onClose={actions.closePick}
                    />
                  )}
                </VoiceRow>
                {notice?.canon === row.canon && (
                  <p role="status" className="px-1 pb-2 text-label text-t4">
                    {t({ id: 'rows-reassigned', args: { note: noteName(notice.note, oct), from: notice.from, drum: row.label } })}
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
