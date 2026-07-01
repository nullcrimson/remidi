import { useEffect, useRef } from "react";
import { useDismiss } from "../hooks/useDismiss";
import type { Drum } from "../lib/midiremap";
import { noteName, type OctaveBase } from "../lib/notes";
import { DrumList } from "./DrumList";
import { OctaveTabs } from "./OctaveTabs";
import { PianoKeyboard } from "./PianoKeyboard";

export function NotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  drums,
  onSetOct,
  onPickSemitone,
  onPickNote,
  onClose,
}: {
  voiceLabel: string;
  currentNote: number;
  octIndex: number;
  base: OctaveBase;
  drums: Drum[];
  onSetOct: (octIndex: number) => void;
  onPickSemitone: (semitone: number) => void;
  onPickNote: (note: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Target note for ${voiceLabel}`}
      tabIndex={-1}
      className="
        my-0.5 mb-3 rounded-[10px] border border-accent/18 bg-inset
        p-[13px_14px_16px] outline-none
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.25">
          <span className="font-mono text-[9.5px] tracking-[0.12em] text-t4">
            TARGET · {voiceLabel}
          </span>
          <span className="font-mono text-[15px] font-bold text-accent">
            {noteName(currentNote, base)}
          </span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="
            flex size-5 items-center justify-center rounded-[5px] bg-white/5
            text-[14px] text-t4
          "
        >
          ×
        </button>
      </div>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <DrumList drums={drums} currentNote={currentNote} base={base} onPickNote={onPickNote} />
        </div>
        <div className="flex w-105 shrink-0 flex-col gap-3.25">
          <OctaveTabs value={octIndex} base={base} onChange={onSetOct} />
          <PianoKeyboard
            octIndex={octIndex}
            currentNote={currentNote}
            base={base}
            onPickSemitone={onPickSemitone}
          />
        </div>
      </div>
    </div>
  );
}
