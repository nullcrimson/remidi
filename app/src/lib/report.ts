import type { FileResult } from './files';
import type { CanonInfo, Drum, RemapReport } from './midiremap';
import { noteName, type OctaveBase } from './notes';

export interface ReportEntry {
  label: string;
  sub?: string;
  count: number;
}
export interface ReportGroups {
  dropped: ReportEntry[];
  approximated: ReportEntry[];
  unrecognized: ReportEntry[];
}
export interface ReportFile {
  name: string;
  groups: ReportGroups;
  untouched: number;
}
export interface ReportView {
  clean: boolean;
  totals: {
    dropped: number;
    approximated: number;
    unrecognized: number;
    untouched: number;
    converted: number;
  };
  groups: ReportGroups;
  files: ReportFile[];
}

function sortEntries(entries: ReportEntry[]): ReportEntry[] {
  return [...entries].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildReport(
  results: FileResult[],
  canons: CanonInfo[],
  targetDrums: Drum[],
  oct: OctaveBase,
): ReportView {
  const labelByCanon = new Map(canons.map((c) => [c.canon, c.label]));
  const drumByNote = new Map(targetDrums.map((d) => [d.note, d.label]));

  const canonLabel = (canon: string) => labelByCanon.get(canon) ?? canon;

  const groupsOf = (report: RemapReport): ReportGroups => ({
    dropped: sortEntries(
      Object.entries(report.dropped).map(([canon, count]) => ({ label: canonLabel(canon), count })),
    ),
    approximated: sortEntries(
      Object.entries(report.fallbackUsed).map(([canon, { note, count }]) => ({
        label: canonLabel(canon),
        sub: drumByNote.get(note) ?? noteName(note, oct),
        count,
      })),
    ),
    unrecognized: sortEntries(
      Object.entries(report.unmappedSource).map(([note, count]) => ({
        label: noteName(Number(note), oct),
        count,
      })),
    ),
  });

  const files: ReportFile[] = results.map((r) => ({
    name: r.name,
    groups: groupsOf(r.report),
    untouched: r.report.untouched,
  }));

  const merge = (acc: Map<string, ReportEntry>, entries: ReportEntry[]) => {
    for (const e of entries) {
      const key = e.sub === undefined ? e.label : `${e.label} ${e.sub}`;
      const existing = acc.get(key);
      if (existing) existing.count += e.count;
      else acc.set(key, { ...e });
    }
  };

  const dropAcc = new Map<string, ReportEntry>();
  const apprAcc = new Map<string, ReportEntry>();
  const unrecAcc = new Map<string, ReportEntry>();
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
  const sum = (entries: ReportEntry[]) => entries.reduce((n, e) => n + e.count, 0);
  const totals = {
    dropped: sum(groups.dropped),
    approximated: sum(groups.approximated),
    unrecognized: sum(groups.unrecognized),
    untouched: files.reduce((n, f) => n + f.untouched, 0),
    converted: results.reduce((n, r) => n + r.report.converted, 0),
  };
  const clean
    = totals.converted > 0
      && totals.dropped === 0
      && totals.approximated === 0
      && totals.unrecognized === 0;

  return { clean, totals, groups, files };
}
