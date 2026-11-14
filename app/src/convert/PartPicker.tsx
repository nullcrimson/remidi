import { useMemo } from 'react';
import { engineName } from '../core/enginePair';
import type { Canon, Part, PartSummary } from '../core/midiremap';
import { useT } from '../locale/localeContext';
import { TextButton } from '../ui/TextButton';
import { canonLabels } from '../core/canon';
import { partLabel, samePart } from '../core/part';
import { sameTracks, type PartQuestion } from './partQuestions';
import type { Remapper } from './useRemapper';
import type { Picks } from './useConverter';

const SHOWN_DRUMS = 3;

/** What a part's hits play as the source: its most hit drums, then how many more and how many unknown. */
function PartPlays({ summary, labelOf }: { summary: PartSummary; labelOf: (canon: Canon) => string }) {
  const t = useT();
  const plays = summary.plays;
  if (plays === null) return null;
  const shown = plays.drums.slice(0, SHOWN_DRUMS).map((d) => labelOf(d.canon));
  const more = plays.drums.length - shown.length;
  const extras = [
    ...(more > 0 ? [t({ id: 'parts-more', args: { count: more } })] : []),
    ...(plays.unknown > 0 ? [t({ id: 'parts-unknown', args: { count: plays.unknown } })] : []),
  ];
  return <span className="text-t4">{[...shown, ...extras].join(' · ')}</span>;
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
      flex flex-col gap-2 rounded-chip border border-hairline p-3
    "
    >
      <legend className="px-1 text-ui text-t1">
        {t({ id: 'parts-question', args: { file: question.file } })}
      </legend>
      <p className="text-label text-t4">{t({ id: 'parts-why', args: { count: question.parts.length } })}</p>
      {source !== null && <p className="text-label text-t4">{t({ id: 'parts-plays-as', args: { source } })}</p>}
      <ul className="flex flex-col gap-1">
        {question.parts.map((s) => (
          <li key={`${s.part.track}:${s.part.channel}`}>
            <label className="
              flex flex-wrap items-baseline gap-x-2 text-ui text-t2
              pointer-coarse:min-h-11
            "
            >
              <input
                type="checkbox"
                className="accent-accent"
                checked={picked.some((p) => samePart(p, s.part))}
                onChange={() => onPick(question.file, toggled(picked, s.part))}
              />
              <span>{t(partLabel(s))}</span>
              <span className="font-mono text-label text-t4">{t({ id: 'parts-notes', args: { count: s.hits } })}</span>
              <PartPlays summary={s} labelOf={labelOf} />
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
