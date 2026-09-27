import { Modal } from './Modal';
import type { ReportEntry, ReportFile, ReportGroups, ReportView } from '../lib/report';

const GROUPS = [
  { key: 'dropped', title: 'Dropped', hint: "target can't play", color: 'text-danger' },
  { key: 'approximated', title: 'Approximated', hint: 'nearby drum', color: 'text-accent' },
  { key: 'unrecognized', title: 'Unrecognized', hint: 'not in source kit', color: 'text-t5' },
] as const;

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

const CONTACT_LINK = `
  text-star/85 underline decoration-star/30 decoration-1 underline-offset-4
  transition
  hover:text-star hover:decoration-star/60
`;

function ContactFooter() {
  return (
    <p className="border-t border-hairline pt-4 text-[14px] text-t5">
      Wrong mapping or missing engine? Open a{' '}
      <a
        href="https://github.com/nullcrimson/remidi/issues"
        target="_blank"
        rel="noopener noreferrer"
        className={CONTACT_LINK}
      >
        GitHub issue
      </a>{' '}
      or email{' '}
      <a
        href="mailto:null.crimson.dev@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className={CONTACT_LINK}
      >
        null.crimson.dev@gmail.com
      </a>
      .
    </p>
  );
}

function Group({
  title,
  hint,
  color,
  entries,
}: {
  title: string;
  hint: string;
  color: string;
  entries: ReportEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className={`
        font-mono text-[12px] tracking-[0.12em] uppercase
        ${color}
      `}
      >
        {title} <span className="text-t6">· {hint}</span>
      </div>
      {entries.map((e) => (
        <div
          key={`${e.label}-${e.sub ?? ''}`}
          className="flex items-center justify-between text-[12.5px] text-t3"
        >
          <span>{e.sub ? `${e.label} → ${e.sub}` : e.label}</span>
          <span className="font-mono text-t5">×{e.count}</span>
        </div>
      ))}
    </div>
  );
}

function GroupList({ groups, untouched }: { groups: ReportGroups; untouched: number }) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((g) => (
        <Group key={g.key} title={g.title} hint={g.hint} color={g.color} entries={groups[g.key]} />
      ))}
      <Group
        title="Unchanged"
        hint="other tracks / channels"
        color="text-t4"
        entries={untouched > 0 ? [{ label: 'Notes not converted', count: untouched }] : []}
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
  return <p className="font-mono text-[11.5px] text-t4">{summaryLine(view)}</p>;
}

export function ReportModal({
  open,
  onClose,
  view,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  view: ReportView;
  targetName: string;
}) {
  const detailFiles = view.files.filter(hasDetail);
  return (
    <Modal open={open} heading="Conversion report" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Headline view={view} targetName={targetName} />
        {(hasLoss(view.groups) || view.totals.untouched > 0) && (
          <GroupList groups={view.groups} untouched={view.totals.untouched} />
        )}
        {view.files.length > 1 && detailFiles.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-hairline pt-4">
            {detailFiles.map((f) => (
              <div key={f.name} className="flex flex-col gap-2">
                <div className="font-mono text-[13px] text-t2">{f.name}</div>
                <GroupList groups={f.groups} untouched={f.untouched} />
              </div>
            ))}
          </div>
        )}
        <ContactFooter />
      </div>
    </Modal>
  );
}
