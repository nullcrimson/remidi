import type { Drum, VoiceRow as VoiceRowData } from '../lib/midiremap';
import type { OctaveBase } from '../lib/notes';
import { effectiveTgt, type Edits } from '../lib/overrides';
import { shortCode } from '../lib/format';
import { Button } from './Button';
import { NotePicker } from './NotePicker';
import { VoiceRow } from './VoiceRow';

export interface EditViewProps {
  src: string;
  tgt: string;
  oct: OctaveBase;
  rows: VoiceRowData[];
  edits: Edits;
  pick: { canon: string; octIndex: number } | null;
  targetDrums: Drum[];
  setView: (v: 'convert' | 'edit') => void;
  openPick: (canon: string) => void;
  setPickOct: (octIndex: number) => void;
  chooseNote: (semitone: number) => void;
  chooseNoteAbsolute: (note: number) => void;
  closePick: () => void;
}

export function EditView({
  src,
  tgt,
  oct,
  rows,
  edits,
  pick,
  targetDrums,
  setView,
  openPick,
  setPickOct,
  chooseNote,
  chooseNoteAbsolute,
  closePick,
}: EditViewProps) {
  return (
    <div className="flex flex-col gap-5 p-[26px_30px_24px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <button
            type="button"
            onClick={() => setView('convert')}
            className="
              text-[12px] text-t4
              hover:text-accent
            "
          >
            ← back
          </button>
          <span className="text-[14px] font-semibold text-t1">Edit mapping</span>
        </div>
        <span className="font-mono text-[11px] text-t4">
          {shortCode(src)} → {shortCode(tgt)}
        </span>
      </div>

      <div>
        {rows.map((row) => {
          const tgtNote = effectiveTgt(row, edits);
          const expanded = pick?.canon === row.canon;
          return (
            <VoiceRow
              key={row.canon}
              row={row}
              effectiveTgt={tgtNote}
              base={oct}
              expanded={expanded}
              onToggle={() => (expanded ? closePick() : openPick(row.canon))}
            >
              {expanded && pick && tgtNote !== null && (
                <NotePicker
                  voiceLabel={row.label}
                  currentNote={tgtNote}
                  octIndex={pick.octIndex}
                  base={oct}
                  drums={targetDrums}
                  onSetOct={setPickOct}
                  onPickSemitone={chooseNote}
                  onPickNote={chooseNoteAbsolute}
                  onClose={closePick}
                />
              )}
            </VoiceRow>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <span className="font-mono text-[11px] text-t5">
          <span className="text-accent">●</span> = remapped
        </span>
        <Button variant="solid" onClick={() => setView('convert')}>
          <span>✓</span>Save mapping
        </Button>
      </div>
    </div>
  );
}
