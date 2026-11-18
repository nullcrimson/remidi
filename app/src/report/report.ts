import type { FileResult } from '../core/files';
import type { Canon, Drum, Note, Report, CanonEntry, UnmappedFate } from '../core/midiremap';
import { drumLabels, standInText } from '../core/drums';
import { byCanon, canonLabels } from '../core/canon';
import { byNote, noteName, type OctaveBase } from '../core/notes';

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
/** Where a kept unrecognized note stayed: on its number, where the target plays `drum`, or no drum when `drum` is null. */
export interface Kept {
  drum: string | null;
}
/** A source note the engine does not use; `kept` is null when it was removed. */
export interface UnrecognizedEntry {
  label: string;
  count: number;
  note: Note;
  kept: Kept | null;
}

function keptOf(fate: UnmappedFate, canonLabel: (canon: Canon) => string): Kept | null {
  if (fate === 'removed') return null;
  if (fate === 'keptFree') return { drum: null };
  return { drum: canonLabel(fate.keptOnto) };
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
/** How many notes each group holds, beside the notes left unchanged, those converted, those the scope read and those left out of the file. */
export interface ReportTotals {
  dropped: number;
  approximated: number;
  unrecognized: number;
  untouched: number;
  converted: number;
  read: number;
  lost: number;
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

/** How many hits each loss group of `reports` holds across them, beside the hits left unchanged, converted, read and lost. */
export function lossTotals(reports: Report[]): ReportTotals {
  const sum = (count: (report: Report) => number) => reports.reduce((n, report) => n + count(report), 0);
  return {
    dropped: sum((report) => byCanon(report.dropped).reduce((n, [, count]) => n + count, 0)),
    approximated: sum((report) => byCanon(report.fallbackUsed).reduce((n, [, { count }]) => n + count, 0)),
    unrecognized: sum((report) => byNote(report.unmappedSource).reduce((n, [, { hits }]) => n + hits, 0)),
    untouched: sum((report) => report.untouched),
    converted: sum((report) => report.converted),
    read: sum((report) => report.read),
    lost: sum((report) => report.lost),
  };
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
      byNote(report.unmappedSource).map(([note, { hits, fate }]) => ({
        label: noteName(note, oct),
        count: hits,
        note,
        kept: keptOf(fate, canonLabel),
      })),
    ),
  });

  const fileOf = ({ name, report }: FileResult): ReportFile => ({ name, groups: groupsOf(report), totals: lossTotals([report]) });
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
  const totals = lossTotals(results.map((result) => result.report));
  const clean
    = totals.converted > 0
      && totals.dropped === 0
      && totals.approximated === 0
      && totals.unrecognized === 0;

  return { clean, totals, groups, files };
}
