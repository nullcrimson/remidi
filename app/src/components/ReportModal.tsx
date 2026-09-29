import type { MessageId } from '../generated/i18n';
import { t } from '../i18n';
import { Modal } from './Modal';
import { MonoLabel } from './MonoLabel';
import { TextButton } from './TextButton';
import type { ReportEntry, ReportFile, ReportGroups, ReportView } from '../lib/report';
import { ContactFooter } from './ContactFooter';

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

const GROUPS = [
  { key: 'dropped', title: 'report-dropped', color: 'text-danger' },
  { key: 'approximated', title: 'report-approximated', color: 'text-star' },
  { key: 'unrecognized', title: 'report-unrecognized', color: 'text-t4' },
] as const satisfies readonly { key: GroupKey; title: MessageId; color: string }[];

function groupHint(key: GroupKey, sourceName: string, targetName: string): string {
  switch (key) {
    case 'dropped':
      return t({ id: 'report-dropped-hint', args: { target: targetName } });
    case 'approximated':
      return t({ id: 'report-approximated-hint' });
    case 'unrecognized':
      return t({ id: 'report-unrecognized-hint', args: { source: sourceName } });
  }
}

function entryFix(key: GroupKey, e: ReportEntry, fixes: ReportFixes): Fix | undefined {
  if (key === 'dropped' && e.canon !== undefined) {
    const canon = e.canon;
    return { label: t({ id: 'report-pick-target' }), run: () => fixes.onPickTarget(canon) };
  }
  if (key === 'unrecognized' && e.note !== undefined) {
    const note = e.note;
    return { label: t({ id: 'report-assign' }), run: () => fixes.onAssignSource(note) };
  }
  return undefined;
}

function summaryLine(view: ReportView): string {
  const parts: string[] = [];
  if (view.totals.dropped) parts.push(t({ id: 'done-tag-dropped', args: { count: view.totals.dropped } }));
  if (view.totals.approximated) parts.push(t({ id: 'done-tag-approximated', args: { count: view.totals.approximated } }));
  if (view.totals.unrecognized) parts.push(t({ id: 'done-tag-unrecognized', args: { count: view.totals.unrecognized } }));
  const line = parts.join(' · ');
  return view.files.length > 1 ? t({ id: 'report-across', args: { summary: line, count: view.files.length } }) : line;
}

function hasLoss(groups: ReportGroups): boolean {
  return groups.dropped.length + groups.approximated.length + groups.unrecognized.length > 0;
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
          title={t({ id: g.title })}
          hint={groupHint(g.key, names.source, names.target)}
          color={g.color}
          entries={groups[g.key]}
          fixOf={(e) => entryFix(g.key, e, fixes)}
        />
      ))}
      <Group
        title={t({ id: 'report-unchanged' })}
        hint={t({ id: 'report-unchanged-hint' })}
        color="text-t4"
        entries={
          untouched > 0
            ? [{ label: t({ id: 'report-unchanged-entry' }), count: untouched }]
            : []
        }
        fixOf={() => ({ label: t({ id: 'report-channel' }), run: fixes.onChannel })}
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
        <span className="font-semibold text-t1">{t({ id: 'report-nothing' })}</span>
        {' '}
        {t({ id: view.totals.untouched > 0 ? 'report-nothing-channel' : 'report-nothing-notes' })}
      </p>
    );
  }
  if (view.clean) {
    return (
      <p>
        <span className="font-semibold text-t1">{t({ id: 'report-clean' })}</span>
        {' '}
        {t({ id: 'report-clean-detail', args: { target: targetName } })}
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
  onDropMissing,
}: {
  open: boolean;
  onClose: () => void;
  view: ReportView;
  sourceName: string;
  targetName: string;
  onDropMissing?: () => void;
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
    <Modal open={open} heading={t({ id: 'report-heading' })} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Headline view={view} targetName={targetName} />
        {(hasLoss(view.groups) || view.totals.untouched > 0) && (
          <GroupList groups={view.groups} untouched={view.totals.untouched} names={names} fixes={fixes} />
        )}
        {onDropMissing && (
          <div>
            <TextButton
              onClick={() => {
                onDropMissing();
                onClose();
              }}
            >
              {t({ id: 'drop-missing' })}
            </TextButton>
          </div>
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
