import { useMemo } from 'react';
import { toAppError } from '../core/errors';
import type { FileResult, LoadedFile } from '../core/files';
import type {
  AutoQuestion,
  ChannelScope,
  EngineId,
  MissingDrums,
  Midiremap,
  Overrides,
  Part,
  PartSummary,
  Unrecognized,
} from '../core/midiremap';
import { asksForParts, samePart, type PickedParts } from '../core/part';
import type { FailedFile } from './batch';
import type { Picks } from './useConverter';

/** A file converting under `auto` would ask about, with the question it asks. */
export type PartQuestion = AutoQuestion & { file: string };

/** What a conversion would read that decides whether `auto` asks: the engines, the edits and the settings. */
export interface QuestionSetup {
  src: EngineId | null;
  tgt: EngineId | null;
  overrides: Overrides;
  missing: MissingDrums;
  unrecognized: Unrecognized;
}

/** Parts a conversion left as they are beside channel-10 drums in their track, and the pick that converts them too. */
export interface Offer {
  file: string;
  parts: PartSummary[];
  withOffers: PickedParts;
}

export interface PartQuestions {
  /** Each file `auto` would ask about, in file order. */
  asked: PartQuestion[];
  /** The files whose parts could not be read, and why: converting them fails the same way. */
  unreadable: FailedFile[];
  /** The asked files no part is picked in yet. */
  waiting: ReadonlySet<string>;
  /** The parts each converted file left beside its channel-10 drums. */
  offers: Offer[];
}

type Asking = { kind: 'asked'; question: PartQuestion } | { kind: 'unreadable'; failure: FailedFile } | { kind: 'converts' };

function asking(core: Midiremap, file: LoadedFile, { src, tgt, overrides, missing, unrecognized }: QuestionSetup): Asking {
  try {
    const question = core.autoQuestion(file.bytes, src ?? undefined, tgt ?? undefined, overrides, missing, unrecognized);
    return question === undefined ? { kind: 'converts' } : { kind: 'asked', question: { file: file.name, ...question } };
  } catch (err) {
    return { kind: 'unreadable', failure: { name: file.name, error: toAppError(err) } };
  }
}

/** The offer of `result`, when its conversion left parts beside its channel-10 drums. */
function offerOf(result: FileResult): Offer[] {
  const [first, ...rest] = result.offers;
  if (first === undefined) return [];
  return [{
    file: result.input.name,
    parts: result.offers,
    withOffers: [first.part, ...rest.map((o) => o.part), ...result.picked],
  }];
}

/** The questions `auto` asks about `files`, which of them wait for a pick, and what the last conversion offers. */
export function usePartQuestions(
  core: Midiremap | null,
  files: LoadedFile[],
  setup: QuestionSetup,
  channel: ChannelScope,
  picks: Picks,
  results: FileResult[],
): PartQuestions {
  const askings = useMemo(
    () => (core === null || !asksForParts(channel) ? [] : files.map((f) => asking(core, f, setup))),
    [core, files, setup, channel],
  );
  const asked = useMemo(() => askings.flatMap((a) => (a.kind === 'asked' ? [a.question] : [])), [askings]);
  const unreadable = useMemo(() => askings.flatMap((a) => (a.kind === 'unreadable' ? [a.failure] : [])), [askings]);
  const waiting = useMemo(
    () => new Set(asked.filter((q) => picks[q.file] === undefined).map((q) => q.file)),
    [asked, picks],
  );
  const offers = useMemo(() => results.flatMap(offerOf), [results]);
  return { asked, unreadable, waiting, offers };
}

/** The part of `among` with this track name on this channel, when exactly one has it. */
function onlyNamed(among: PartSummary[], name: string, channel: number): PartSummary | undefined {
  const named = among.filter((s) => s.trackName === name && s.part.channel === channel);
  return named.length === 1 ? named[0] : undefined;
}

/**
 * `picked` in `from` carried over to `to` by track name, or `undefined` when a picked part's
 * track has no name, or its name and channel are not one part's in both files.
 */
export function sameTracks(from: PartSummary[], picked: Part[], to: PartSummary[]): Part[] | undefined {
  const carried: Part[] = [];
  for (const part of picked) {
    const name = from.find((s) => samePart(s.part, part))?.trackName;
    if (name === undefined || name === null || onlyNamed(from, name, part.channel) === undefined) return undefined;
    const there = onlyNamed(to, name, part.channel);
    if (there === undefined) return undefined;
    carried.push(there.part);
  }
  return carried.length > 0 ? carried : undefined;
}
