import { useMemo } from 'react';
import type { FileResult, LoadedFile } from '../core/files';
import type { Canon, CanonEntry, ChannelScope, EngineId, Midiremap, Part, PartSummary } from '../core/midiremap';
import type { Translate } from '../locale/i18n';
import type { Picks } from './useConverter';

/** A file converting under `auto` would ask about: several parts have notes, none on channel 10. */
export interface PartQuestion {
  file: string;
  parts: PartSummary[];
}

/** Parts a conversion left as they are beside channel-10 drums in their track, and the pick that converts them too. */
export interface Offer {
  file: string;
  parts: PartSummary[];
  withOffers: Part[];
}

export interface PartQuestions {
  /** Each file `auto` would ask about, in file order. */
  asked: PartQuestion[];
  /** The asked files no part is picked in yet. */
  waiting: ReadonlySet<string>;
  /** The parts each converted file left beside its channel-10 drums. */
  offers: Offer[];
}

export function samePart(a: Part, b: Part): boolean {
  return a.track === b.track && a.channel === b.channel;
}

function summariesOf(read: () => PartSummary[] | undefined): PartSummary[] | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/** The questions `auto` asks about `files`, which of them wait for a pick, and what the last conversion offers. */
export function usePartQuestions(
  core: Midiremap | null,
  files: LoadedFile[],
  src: EngineId | null,
  channel: ChannelScope,
  picks: Picks,
  results: FileResult[],
): PartQuestions {
  const source = src ?? undefined;
  const asked = useMemo(() => {
    if (core === null || channel !== 'auto') return [];
    return files.flatMap((f) => {
      const parts = summariesOf(() => core.autoQuestion(f.bytes, source));
      return parts === undefined ? [] : [{ file: f.name, parts }];
    });
  }, [core, files, source, channel]);
  const waiting = useMemo(
    () => new Set(asked.filter((q) => (picks[q.file] ?? []).length === 0).map((q) => q.file)),
    [asked, picks],
  );
  const offers = useMemo(() => {
    if (core === null) return [];
    return results.flatMap((r) => {
      if (r.offers.length === 0) return [];
      const parts = (summariesOf(() => core.fileParts(r.input.bytes, source)) ?? [])
        .filter((s) => r.offers.some((o) => samePart(o, s.part)));
      return [{ file: r.input.name, parts, withOffers: [...r.picked, ...r.offers] }];
    });
  }, [core, results, source]);
  return { asked, waiting, offers };
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

/** One part as a line: its track by name or number, and its channel. */
export function partName(s: PartSummary, t: Translate): string {
  const { track, channel } = s.part;
  return s.trackName === null
    ? t({ id: 'parts-track-unnamed', args: { track, channel } })
    : t({ id: 'parts-track-named', args: { name: s.trackName, channel } });
}

/** Looks up a drum's label in `canons`, falling back to its key. */
export function canonLabels(canons: CanonEntry[]): (canon: Canon) => string {
  const labels = new Map(canons.map((c) => [c.canon, c.label]));
  return (canon) => labels.get(canon) ?? canon;
}
