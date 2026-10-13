import type { FileResult } from './files';
import type { Canon, Drum, Note, Report, VocabularyDrum } from './midiremap';
import { labelByNote } from './missing';
import { byCanon } from './canon';
import { byNote, noteName, type OctaveBase } from './notes';

export interface ReportEntry {
  label: string;
  sub?: string;
  count: number;
  /** The drum an entry is about, for dropped and approximated notes. */
  canon?: Canon;
  /** The source note an entry is about, for unrecognized notes. */
  note?: Note;
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
  converted: number;
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
  canons: VocabularyDrum[],
  targetDrums: Drum[],
  oct: OctaveBase,
): ReportView {
  const labelByCanon = new Map(canons.map((c) => [c.canon, c.label]));
  const drumByNote = labelByNote(targetDrums);

  const canonLabel = (canon: Canon) => labelByCanon.get(canon) ?? canon;

  const groupsOf = (report: Report): ReportGroups => ({
    dropped: sortEntries(
      byCanon(report.dropped).map(([canon, count]) => ({ label: canonLabel(canon), count, canon })),
    ),
    approximated: sortEntries(
      byCanon(report.fallbackUsed).map(([canon, { note, count }]) => ({
        label: canonLabel(canon),
        sub: drumByNote.get(note) ?? noteName(note, oct),
        count,
        canon,
      })),
    ),
    unrecognized: sortEntries(
      byNote(report.unmappedSource).map(([note, count]) => ({ label: noteName(note, oct), count, note })),
    ),
  });

  const files: ReportFile[] = results.map((r) => ({
    name: r.name,
    groups: groupsOf(r.report),
    untouched: r.report.untouched,
    converted: r.report.converted,
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
