import { Modal } from './Modal';
import { MonoLabel } from './MonoLabel';
import { ProseLink } from './ProseLink';
import { TextButton } from './TextButton';
import type { ReportEntry, ReportFile, ReportGroups, ReportView } from '../lib/report';

export interface ReportFixes {
  onPickTarget: (canon: string) => void;
  onAssignSource: (note: number) => void;
  onChannel: () => void;
}

interface Fix {
  label: string;
  run: () => void;
}

type GroupKey = keyof ReportGroups;

const GROUPS: { key: GroupKey; title: string; color: string }[] = [
  { key: 'dropped', title: 'Dropped', color: 'text-danger' },
  { key: 'approximated', title: 'Approximated', color: 'text-star' },
  { key: 'unrecognized', title: 'Unrecognized', color: 'text-t4' },
];

function groupHint(key: GroupKey, sourceName: string, targetName: string): string {
  switch (key) {
    case 'dropped':
      return `${targetName} has no such drum`;
    case 'approximated':
      return 'played on the nearest drum';
    case 'unrecognized':
      return `not in the ${sourceName} map — removed from the file`;
  }
}

function entryFix(key: GroupKey, e: ReportEntry, fixes: ReportFixes): Fix | undefined {
  if (key === 'dropped' && e.canon !== undefined) {
    const canon = e.canon;
    return { label: 'Pick a target →', run: () => fixes.onPickTarget(canon) };
  }
  if (key === 'unrecognized' && e.note !== undefined) {
    const note = e.note;
    return { label: 'Assign →', run: () => fixes.onAssignSource(note) };
  }
  return undefined;
}

function summaryLine(view: ReportView): string {
  const parts: string[] = [];
  if (view.totals.dropped) parts.push(`${view.totals.dropped} dropped`);
  if (view.totals.approximated) parts.push(`${view.totals.approximated} approximated`);
  if (view.totals.unrecognized) parts.push(`${view.totals.unrecognized} unrecognized`);
  return parts.join(' · ') + (view.files.length > 1 ? ` across ${view.files.length} files` : '');
}

function hasLoss(groups: ReportGroups): boolean {
  return groups.dropped.length + groups.approximated.length + groups.unrecognized.length > 0;
}

function ContactFooter() {
  return (
    <p className="border-t border-hairline pt-4 text-ui text-t5">
      Wrong mapping or missing engine? Open a{' '}
      <ProseLink href="https://github.com/nullcrimson/remidi/issues">GitHub issue</ProseLink>{' '}
      or email{' '}
      <ProseLink href="mailto:null.crimson.dev@gmail.com">null.crimson.dev@gmail.com</ProseLink>
      .
    </p>
  );
}

function Group({
  title,
  hint,
  color,
  entries,
  fixOf,
}: {
  title: string;
  hint: string;
  color: string;
  entries: ReportEntry[];
  fixOf: (e: ReportEntry) => Fix | undefined;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel tone={color} className="uppercase">
        {title} <span className="tracking-normal text-t5 normal-case">· {hint}</span>
      </MonoLabel>
      {entries.map((e) => {
        const fix = fixOf(e);
        return (
          <div
            key={`${e.label}-${e.sub ?? ''}`}
            className="
              flex items-center justify-between gap-3 text-label text-t3
            "
          >
            <span>{e.sub ? `${e.label} → ${e.sub}` : e.label}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-t5">×{e.count}</span>
              {fix && <TextButton onClick={fix.run}>{fix.label}</TextButton>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GroupList({
  groups,
  untouched,
  names,
  fixes,
}: {
  groups: ReportGroups;
  untouched: number;
  names: { source: string; target: string };
  fixes: ReportFixes;
}) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((g) => (
        <Group
          key={g.key}
          title={g.title}
          hint={groupHint(g.key, names.source, names.target)}
          color={g.color}
          entries={groups[g.key]}
          fixOf={(e) => entryFix(g.key, e, fixes)}
        />
      ))}
      <Group
        title="Unchanged"
        hint="other tracks / channels"
        color="text-t4"
        entries={
          untouched > 0
            ? [{ label: 'Notes on other tracks or channels, left as they were', count: untouched }]
            : []
        }
        fixOf={() => ({ label: 'Drum channel →', run: fixes.onChannel })}
      />
    </div>
  );
}

function hasDetail(file: ReportFile): boolean {
  return hasLoss(file.groups) || file.untouched > 0;
}

function Headline({ view, targetName }: { view: ReportView; targetName: string }) {
  if (view.totals.converted === 0) {
    return (
      <p>
        <span className="font-semibold text-t1">Nothing was converted</span>
        {view.totals.untouched > 0
          ? ' — no notes on the selected drum channel. Pick another drum channel or All.'
          : ' — no drum notes found in this file.'}
      </p>
    );
  }
  if (view.clean) {
    return (
      <p>
        <span className="font-semibold text-t1">Clean conversion</span> — every drum mapped
        directly to {targetName}.
      </p>
    );
  }
  return <p className="font-mono text-caption text-t4">{summaryLine(view)}</p>;
}

export function ReportModal({
  open,
  onClose,
  view,
  sourceName,
  targetName,
  onPickTarget,
  onAssignSource,
  onChannel,
}: {
  open: boolean;
  onClose: () => void;
  view: ReportView;
  sourceName: string;
  targetName: string;
} & ReportFixes) {
  const detailFiles = view.files.filter(hasDetail);
  const names = { source: sourceName, target: targetName };
  const fixes: ReportFixes = {
    onPickTarget: (canon) => {
      onPickTarget(canon);
      onClose();
    },
    onAssignSource: (note) => {
      onAssignSource(note);
      onClose();
    },
    onChannel: () => {
      onChannel();
      onClose();
    },
  };
  return (
    <Modal open={open} heading="Conversion report" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Headline view={view} targetName={targetName} />
        {(hasLoss(view.groups) || view.totals.untouched > 0) && (
          <GroupList groups={view.groups} untouched={view.totals.untouched} names={names} fixes={fixes} />
        )}
        {view.files.length > 1 && detailFiles.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-hairline pt-4">
            {detailFiles.map((f) => (
              <div key={f.name} className="flex flex-col gap-2">
                <div className="font-mono text-label text-t2">{f.name}</div>
                <GroupList groups={f.groups} untouched={f.untouched} names={names} fixes={fixes} />
              </div>
            ))}
          </div>
        )}
        <ContactFooter />
      </div>
    </Modal>
  );
}
