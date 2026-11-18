import { useCallback, useState } from 'react';
import type { LoadedFile } from '../core/files';
import type { ChannelScope, EngineId } from '../core/midiremap';
import type { Offered } from './sourceOffer';
import type { Picks } from './useConverter';

/**
 * What the screen holds about the source before converting: nothing offered; an offer; an offer
 * Convert asks about before converting (`due`); or that question open.
 */
export type QuestionState = { kind: 'none' } | { kind: 'offered' | 'due' | 'open'; offered: Offered };

const NONE: QuestionState = { kind: 'none' };

/**
 * Whether Convert asks about the source before converting, remembered per files, picks,
 * channel and source: once answered for them it does not ask again, and the answer is
 * forgotten as soon as any of them changes. An open question is about those and the target,
 * so any change of them closes it: the question is open from `ask` until `close` or such a
 * change.
 */
export function useSourceQuestion({ offered, files, picks, channel, src, tgt }: {
  offered: Offered | null;
  files: LoadedFile[];
  picks: Picks;
  channel: ChannelScope;
  src: EngineId | null;
  tgt: EngineId | null;
}) {
  const keyOf = useCallback(
    (source: EngineId | null) => JSON.stringify({ files: files.map((f) => f.name), picks, channel, source }),
    [files, picks, channel],
  );
  const answerKey = keyOf(src);
  const key = JSON.stringify({ answerKey, tgt });
  const [askedFor, setAskedFor] = useState<string | null>(null);
  const [askingFor, setAskingFor] = useState<string | null>(null);
  const [seen, setSeen] = useState(answerKey);
  if (seen !== answerKey) {
    setSeen(answerKey);
    if (askedFor !== answerKey) setAskedFor(null);
  }
  const answered = useCallback(() => setAskedFor(answerKey), [answerKey]);
  const markAsked = useCallback((source: EngineId) => setAskedFor(keyOf(source)), [keyOf]);
  const ask = useCallback(() => setAskingFor(key), [key]);
  const close = useCallback(() => setAskingFor(null), []);
  const due = offered !== null && offered.ask !== null && askedFor !== answerKey;
  const offer: QuestionState = offered === null ? NONE : { kind: !due ? 'offered' : askingFor === key ? 'open' : 'due', offered };
  return { offer, ask, close, answered, markAsked };
}
