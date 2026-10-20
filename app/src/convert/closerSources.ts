import type { EngineId, SourceFit, SourceFits } from '../core/midiremap';
import { SUGGESTION_RANKS, type SuggestionRank } from '../core/stats';

/** An engine the notice suggests, with its place and whether it recognizes every hit. */
export type RankedFit = SourceFit & { rank: SuggestionRank; complete: boolean };

/** The suggestions, best first: at least one, at most three. */
export type Better = [RankedFit] | [RankedFit, RankedFit] | [RankedFit, RankedFit, RankedFit];

/** What the chosen source misses of the files' hits, and the engines that recognize more of them, best first. */
export interface CloserSources {
  missing: number;
  hits: number;
  better: Better;
}

function recognizesAll(fit: SourceFit, hits: number): boolean {
  return fit.recognized === hits;
}

/**
 * The engines among `fits` that recognize more hits than `src`, at most three, leaving out
 * the target `tgt`, which cannot also be the source; `null` when `src` recognizes every hit
 * or none does better.
 */
export function closerSources({ hits, ranked }: SourceFits, src: EngineId, tgt: EngineId | null): CloserSources | null {
  const current = ranked.find((fit) => fit.engine === src);
  if (current === undefined || recognizesAll(current, hits)) return null;
  const above = ranked.filter((fit) => fit.recognized > current.recognized && fit.engine !== tgt);
  const [first, second, third] = SUGGESTION_RANKS.map((rank, i): RankedFit | undefined =>
    i < above.length ? { ...above[i], rank, complete: recognizesAll(above[i], hits) } : undefined);
  if (first === undefined) return null;
  const better: Better = second === undefined ? [first] : third === undefined ? [first, second] : [first, second, third];
  return { missing: hits - current.recognized, hits, better };
}
