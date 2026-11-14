import { useMemo } from 'react';
import { engineName } from '../core/enginePair';
import type { Canon, Part, PartSummary, Plays } from '../core/midiremap';
import { useT } from '../locale/localeContext';
import { Checkbox } from '../ui/Checkbox';
import { TextButton } from '../ui/TextButton';
import { canonLabels } from '../core/canon';
import { partLabel, samePart } from '../core/part';
import { sameTracks, type PartQuestion } from './partQuestions';
import type { Remapper } from './useRemapper';
import type { Picks } from './useConverter';

const SHOWN_DRUMS = 3;

/** How much of a part the source knows: a bar of its known hits against its unknown ones, and how many are unknown. */
function KnownShare({ plays }: { plays: Plays }) {
  const t = useT();
  const known = plays.drums.reduce((sum, d) => sum + d.hits, 0);
  const total = known + plays.unknown;
  if (total === 0) return null;
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="
          h-1.5 w-40 max-w-1/2 shrink-0 overflow-hidden rounded-full bg-white/8
        "
      >
        <span className="block h-full bg-accent" style={{ width: `${(known / total) * 100}%` }} />
      </span>
      {plays.unknown > 0 && (
        <span className="text-label text-t2">{t({ id: 'parts-unknown', args: { count: plays.unknown } })}</span>
      )}
    </span>
  );
}

/** What a part's hits play as the source: how much of it is known, then its most hit drums and how many more. */
function PartPlays({ summary, labelOf }: { summary: PartSummary; labelOf: (canon: Canon) => string }) {
  const t = useT();
  const plays = summary.plays;
  if (plays === null) return null;
  const shown = plays.drums.slice(0, SHOWN_DRUMS).map((d) => labelOf(d.canon));
  const more = plays.drums.length - shown.length;
  const drums = [...shown, ...(more > 0 ? [t({ id: 'parts-more', args: { count: more } })] : [])];
  return (
    <>
      <KnownShare plays={plays} />
      {drums.length > 0 && <span className="text-label text-t3">{drums.join(' · ')}</span>}
    </>
  );
}

function toggled(parts: Part[], part: Part): Part[] {
  return parts.some((p) => samePart(p, part)) ? parts.filter((p) => !samePart(p, part)) : [...parts, part];
}

/** A file `auto` asks about: its parts to tick as the drums, and a shortcut to tick the tracks named as in another file. */
function Question({
  question,
  others,
  picks,
  source,
  labelOf,
  onPick,
}: {
  question: PartQuestion;
  others: PartQuestion[];
  picks: Picks;
  source: string | null;
  labelOf: (canon: Canon) => string;
  onPick: (name: string, parts: Part[]) => void;
}) {
  const t = useT();
  const picked = picks[question.file] ?? [];
  const shortcut = picked.length > 0
    ? undefined
    : others.flatMap((o) => {
      const carried = sameTracks(o.parts, picks[o.file] ?? [], question.parts);
      return carried === undefined ? [] : [{ from: o.file, parts: carried }];
    })[0];
  return (
    <fieldset className="
      flex flex-col gap-3.5 rounded-card border border-star/30 bg-star/3 p-4
      sm:px-5.5 sm:pt-5
    "
    >
      <legend className="px-2 font-display text-body font-semibold text-t1">
        {t({ id: 'parts-question', args: { file: question.file } })}
      </legend>
      <div className="flex flex-col gap-1 text-ui/relaxed text-t3">
        <p>{t({ id: 'parts-why', args: { count: question.parts.length } })}</p>
        {source !== null && <p>{t({ id: 'parts-plays-as', args: { source } })}</p>}
      </div>
      <ul className="flex flex-col gap-2">
        {question.parts.map((s) => (
          <li key={`${s.part.track}:${s.part.channel}`}>
            <label className="
              flex min-h-11 cursor-pointer items-start gap-3.5 rounded-panel
              border border-white/8 bg-white/2 px-4 py-3.5 transition-colors
              hover:not-has-checked:border-white/16
              has-checked:border-star/60 has-checked:bg-star/7
              motion-reduce:transition-none
            "
            >
              <span className="flex h-lh items-center text-ui">
                <Checkbox
                  checked={picked.some((p) => samePart(p, s.part))}
                  onChange={() => onPick(question.file, toggled(picked, s.part))}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-ui font-semibold text-t1">{t(partLabel(s))}</span>
                  <span className="text-label text-t4">{t({ id: 'parts-notes', args: { count: s.hits } })}</span>
                </span>
                <PartPlays summary={s} labelOf={labelOf} />
              </span>
            </label>
          </li>
        ))}
      </ul>
      {shortcut !== undefined && (
        <div>
          <TextButton onClick={() => onPick(question.file, shortcut.parts)}>
            {t({ id: 'parts-same-as', args: { file: shortcut.from } })}
          </TextButton>
        </div>
      )}
    </fieldset>
  );
}

/** The files `auto` asks about, each with its parts to tick as the drums. */
export type PartPickerSource = Pick<Remapper, 'questions' | 'picks' | 'src' | 'engines' | 'setParts'> & {
  editor: Pick<Remapper['editor'], 'canonOptions'>;
};

export function PartPicker({ remapper }: { remapper: PartPickerSource }) {
  const { questions: { asked }, picks, src, engines, editor: { canonOptions }, setParts } = remapper;
  const labelOf = useMemo(() => canonLabels(canonOptions), [canonOptions]);
  if (asked.length === 0) return null;
  const source = src === null ? null : engineName(engines, src);
  return (
    <div className="flex flex-col gap-3">
      {asked.map((q) => (
        <Question
          key={q.file}
          question={q}
          others={asked.filter((o) => o.file !== q.file)}
          picks={picks}
          source={source}
          labelOf={labelOf}
          onPick={setParts}
        />
      ))}
    </div>
  );
}
