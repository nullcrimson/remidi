import { useRemapper } from '../hooks/useRemapper';
import { effectiveTgt } from '../lib/overrides';
import { VoiceRow } from './VoiceRow';

export function EditView({ c }: { c: ReturnType<typeof useRemapper> }) {
  const srcShort = c.src.toUpperCase().slice(0, 3);
  const tgtShort = c.tgt.toUpperCase().slice(0, 3);
  return (
    <div className="flex flex-col gap-5 p-[26px_30px_24px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <button
            type="button"
            onClick={() => c.setView('convert')}
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
          {srcShort} → {tgtShort}
        </span>
      </div>

      <div>
        {c.rows.map((row) => (
          <VoiceRow
            key={row.canon}
            row={row}
            effectiveTgt={effectiveTgt(row, c.edits)}
            base={c.oct}
            expanded={c.pick?.canon === row.canon}
            pickOctIndex={c.pick?.canon === row.canon ? c.pick.octIndex : 0}
            onOpen={() => c.openPick(row.canon)}
            onSetOct={c.setPickOct}
            onPick={c.chooseNote}
            onClose={c.closePick}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <span className="font-mono text-[11px] text-t5">
          <span className="text-accent">●</span> = remapped
        </span>
        <button
          type="button"
          onClick={() => c.setView('convert')}
          className="
            inline-flex items-center gap-1.75 rounded-[9px] bg-accent px-4 py-2
            font-display text-[13px] font-semibold text-ink
            hover:brightness-110
          "
        >
          <span>✓</span>Save mapping
        </button>
      </div>
    </div>
  );
}
