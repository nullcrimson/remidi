import type { FileResult } from '../core/files';
import type { Canon, Drum, MissingDrums, Note, Report, CanonEntry } from '../core/midiremap';
import type { EnginePair } from '../core/enginePair';
import { listProp } from '../core/stats';
import type { StatEvents } from '../core/umami';
import { drumLabels, standInText } from '../core/drums';
import { byCanon, canonLabels } from '../core/canon';
import { ascending, byNote, noteName, type OctaveBase } from '../core/notes';

/** A drum the target lacks and that was left out. */
export interface DroppedEntry {
  label: string;
  count: number;
  canon: Canon;
}
/** A drum the target lacks and that played on another note, named by `sub`. */
export interface ApproximatedEntry {
  label: string;
  sub: string;
  count: number;
  canon: Canon;
}
/** A source note the engine does not use. */
export interface UnrecognizedEntry {
  label: string;
  count: number;
  note: Note;
}
export type ReportEntry = DroppedEntry | ApproximatedEntry | UnrecognizedEntry;

/** A report line as shown: the drum or note, then what it plays as when it has a `sub`. */
export function entryText(e: { label: string; sub?: string }): string {
  return e.sub === undefined ? e.label : `${e.label} → ${e.sub}`;
}
export interface ReportGroups {
  dropped: DroppedEntry[];
  approximated: ApproximatedEntry[];
  unrecognized: UnrecognizedEntry[];
}
/** How many notes each group holds, beside the notes left unchanged and those converted. */
export interface ReportTotals {
  dropped: number;
  approximated: number;
  unrecognized: number;
  untouched: number;
  converted: number;
}
export interface ReportFile {
  name: string;
  groups: ReportGroups;
  totals: ReportTotals;
}
export interface ReportView {
  clean: boolean;
  totals: ReportTotals;
  groups: ReportGroups;
  files: ReportFile[];
}

function sortEntries<E extends ReportEntry>(entries: E[]): E[] {
  return [...entries].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildReport(
  results: FileResult[],
  canons: CanonEntry[],
  targetDrums: Drum[],
  oct: OctaveBase,
): ReportView {
  const canonLabel = canonLabels(canons);
  const labels = drumLabels(targetDrums);

  const groupsOf = (report: Report): ReportGroups => ({
    dropped: sortEntries(
      byCanon(report.dropped).map(([canon, count]) => ({ label: canonLabel(canon), count, canon })),
    ),
    approximated: sortEntries(
      byCanon(report.fallbackUsed).map(([canon, { standIn, note, count }]) => ({
        label: canonLabel(canon),
        sub: standInText(labels.ofStandIn(standIn, note, oct)),
        count,
        canon,
      })),
    ),
    unrecognized: sortEntries(
      byNote(report.unmappedSource).map(([note, count]) => ({ label: noteName(note, oct), count, note })),
    ),
  });

  const sum = (entries: { count: number }[]) => entries.reduce((n, e) => n + e.count, 0);
  const fileOf = ({ name, report }: FileResult): ReportFile => {
    const groups = groupsOf(report);
    return {
      name,
      groups,
      totals: {
        dropped: sum(groups.dropped),
        approximated: sum(groups.approximated),
        unrecognized: sum(groups.unrecognized),
        untouched: report.untouched,
        converted: report.converted,
      },
    };
  };
  const files = results.map(fileOf);

  const merge = <E extends ReportEntry>(acc: Map<string, E>, entries: E[]) => {
    for (const e of entries) {
      const key = entryText(e);
      const existing = acc.get(key);
      if (existing) existing.count += e.count;
      else acc.set(key, { ...e });
    }
  };

  const dropAcc = new Map<string, DroppedEntry>();
  const apprAcc = new Map<string, ApproximatedEntry>();
  const unrecAcc = new Map<string, UnrecognizedEntry>();
  for (const f of files) {
    merge(dropAcc, f.groups.dropped);
    merge(apprAcc, f.groups.approximated);
    merge(unrecAcc, f.groups.unrecognized);
  }

  const groups: ReportGroups = {
    dropped: sortEntries([...dropAcc.values()]),
    approximated: sortEntries([...apprAcc.values()]),
    unrecognized: sortEntries([...unrecAcc.values()]),
  };
  const total = (key: keyof ReportTotals) => files.reduce((n, f) => n + f.totals[key], 0);
  const totals: ReportTotals = {
    dropped: total('dropped'),
    approximated: total('approximated'),
    unrecognized: total('unrecognized'),
    untouched: total('untouched'),
    converted: total('converted'),
  };
  const clean
    = totals.converted > 0
      && totals.dropped === 0
      && totals.approximated === 0
      && totals.unrecognized === 0;

  return { clean, totals, groups, files };
}

/** What a batch that returned tells the `converted` event: its pair and settings, how many files failed, and the loss of the ones that converted. */
export function convertedProps(
  pair: EnginePair,
  reports: Report[],
  failed: number,
  setup: {
    damaged: number;
    channel: StatEvents['converted']['channel'];
    offered: number;
    untouched: number;
    missing: MissingDrums;
    edited: boolean;
    preset: boolean;
    closer: string;
  },
): StatEvents['converted'] {
  return {
    from: pair.src,
    to: pair.tgt,
    pair: `${pair.src}>${pair.tgt}`,
    files: reports.length,
    failed,
    ...setup,
    ...lossProps(reports),
  };
}

type LossProps = Pick<StatEvents['converted'], 'dropped' | 'approximated' | 'unrecognized' | 'unrecognizedNotes' | 'droppedDrums' | 'approximatedDrums'>;

function addHits<K extends string>(hits: Map<K, number>, key: K, count: number): void {
  hits.set(key, (hits.get(key) ?? 0) + count);
}

function mostHitFirst<K extends string>(hits: Map<K, number>): string {
  return listProp([...hits].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1)).map(([key]) => key));
}

/** How many entries each loss group of the report has across `reports`, and which: notes lowest first, drums most hit first, each list cut to what Umami keeps. */
export function lossProps(reports: Report[]): LossProps {
  const dropped = new Map<Canon, number>();
  const approximated = new Map<`${Canon}>${Canon}`, number>();
  const unrecognized = new Set<Note>();
  for (const report of reports) {
    for (const [canon, count] of byCanon(report.dropped)) addHits(dropped, canon, count);
    for (const [canon, { standIn, count }] of byCanon(report.fallbackUsed)) addHits(approximated, `${canon}>${standIn}`, count);
    for (const [note] of byNote(report.unmappedSource)) unrecognized.add(note);
  }
  return {
    dropped: dropped.size,
    approximated: approximated.size,
    unrecognized: unrecognized.size,
    unrecognizedNotes: listProp([...unrecognized].sort(ascending).map(String)),
    droppedDrums: mostHitFirst(dropped),
    approximatedDrums: mostHitFirst(approximated),
  };
}
