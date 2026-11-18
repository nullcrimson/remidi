import type { Canon, Note, Report } from '../core/midiremap';
import type { FileResult } from '../core/files';
import type { EnginePair } from '../core/enginePair';
import { listProp } from '../core/stats';
import { share, shareBucket, type ShareBucket } from '../core/share';
import type { StatEvents } from '../core/umami';
import { byCanon } from '../core/canon';
import { ascending, byNote } from '../core/notes';
import { lossTotals, type ReportTotals } from './report';

/**
 * What a batch that returned tells the `converted` event: its pair and settings, the files that
 * converted, how many of them a damaged file and how many parts they offer, how many files
 * failed, and the loss of the ones that converted.
 */
export function convertedProps(
  pair: EnginePair,
  ok: FileResult[],
  failed: number,
  setup: Pick<StatEvents['converted'], 'channel' | 'missing' | 'edited' | 'preset' | 'closer' | 'via' | 'asked'>,
): StatEvents['converted'] {
  return {
    from: pair.src,
    to: pair.tgt,
    pair: `${pair.src}>${pair.tgt}`,
    files: ok.length,
    failed,
    damaged: ok.filter((file) => file.damage.length > 0).length,
    offered: ok.reduce((sum, file) => sum + file.offers.length, 0),
    ...setup,
    ...lossProps(ok.map((file) => file.report)),
  };
}

type LossProps = Pick<StatEvents['converted'], 'untouched' | 'dropped' | 'approximated' | 'unrecognized' | 'unrecognizedNotes' | 'droppedDrums' | 'approximatedDrums' | 'missed' | 'lost'>;

function addHits<K extends string>(hits: Map<K, number>, key: K, count: number): void {
  hits.set(key, (hits.get(key) ?? 0) + count);
}

function mostHitFirst<K extends string>(hits: Map<K, number>): K[] {
  return [...hits].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1)).map(([key]) => key);
}

/** The items of each loss group across a batch: unrecognized notes lowest first, dropped drums and approximated drum>stand-in pairs most hit first. */
interface LossLists {
  unrecognizedNotes: string[];
  droppedDrums: string[];
  approximatedDrums: string[];
}

/** The items of each loss group of `reports`, each once. */
export function lossLists(reports: Report[]): LossLists {
  const dropped = new Map<Canon, number>();
  const approximated = new Map<`${Canon}>${Canon}`, number>();
  const unrecognized = new Set<Note>();
  for (const report of reports) {
    for (const [canon, count] of byCanon(report.dropped)) addHits(dropped, canon, count);
    for (const [canon, { standIn, count }] of byCanon(report.fallbackUsed)) addHits(approximated, `${canon}>${standIn}`, count);
    for (const [note] of byNote(report.unmappedSource)) unrecognized.add(note);
  }
  return {
    unrecognizedNotes: [...unrecognized].sort(ascending).map(String),
    droppedDrums: mostHitFirst(dropped),
    approximatedDrums: mostHitFirst(approximated),
  };
}

/** The share of the hits read that the source missed and that the file lost, as the events bucket them. */
export function lossShares({ unrecognized, lost, read }: Pick<ReportTotals, 'unrecognized' | 'lost' | 'read'>): { missed: ShareBucket; lost: ShareBucket } {
  return { missed: shareBucket(share(unrecognized, read)), lost: shareBucket(share(lost, read)) };
}

/**
 * How many entries each loss group of the report has across `reports`, and which, each list cut
 * to what Umami keeps; the hits left unchanged; and the share of the hits read that the source
 * missed and that the file lost.
 */
export function lossProps(reports: Report[]): LossProps {
  const { unrecognizedNotes, droppedDrums, approximatedDrums } = lossLists(reports);
  const totals = lossTotals(reports);
  return {
    ...lossShares(totals),
    untouched: totals.untouched,
    dropped: droppedDrums.length,
    approximated: approximatedDrums.length,
    unrecognized: unrecognizedNotes.length,
    unrecognizedNotes: listProp(unrecognizedNotes),
    droppedDrums: listProp(droppedDrums),
    approximatedDrums: listProp(approximatedDrums),
  };
}
