import type { EngineNames } from '../core/enginePair';
import type { Canon, Note, Unrecognized } from '../core/midiremap';
import type { MessageId } from '../generated/i18n';
import type { Translate } from '../locale/i18n';
import { useT } from '../locale/localeContext';
import { track } from '../core/stats';
import { Modal } from '../ui/Modal';
import { MonoLabel } from '../ui/MonoLabel';
import type { LabelTone } from '../ui/styles';
import { TextButton } from '../ui/TextButton';
import { entryText, type ReportEntry, type ReportFile, ReportGroups, ReportView } from './report';
import { ContactFooter } from './ContactFooter';

interface ReportFixes {
  onPickTarget: (canon: Canon) => void;
  onAssignSource: (note: Note) => void;
  onChannel: () => void;
}

interface Fix {
  label: string;
  run: () => void;
}

function summaryLine(view: ReportView, t: Translate): string {
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

interface UnchangedEntry {
  label: string;
  count: number;
}

type LineEntry = ReportEntry | UnchangedEntry;

function Group<E extends LineEntry>({
  title,
  hint,
  color,
  entries,
  fixOf,
}: {
  title: string;
  hint: string;
  color: LabelTone;
  entries: E[];
  fixOf: (e: E) => Fix | undefined;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel tone={color} className="uppercase">
        <span>{`${title} `}</span>
        <span className="tracking-normal text-t5 normal-case">{`· ${hint}`}</span>
      </MonoLabel>
      {entries.map((e) => {
        const fix = fixOf(e);
        return (
          <div
            key={entryText(e)}
            className="
              flex items-center justify-between gap-3 text-label text-t3
            "
          >
            <span>{entryText(e)}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-t5">{`×${e.count}`}</span>
              {fix && <TextButton onClick={fix.run}>{fix.label}</TextButton>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const UNRECOGNIZED_HINT = {
  remove: 'report-unrecognized-hint',
  keep: 'report-unrecognized-hint-kept',
} as const satisfies Record<Unrecognized, MessageId>;

function GroupList({
  groups,
  untouched,
  names,
  unrecognized,
  fixes,
}: {
  groups: ReportGroups;
  untouched: number;
  names: EngineNames;
  unrecognized: Unrecognized;
  fixes: ReportFixes;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <Group
        title={t({ id: 'report-dropped' })}
        hint={t({ id: 'report-dropped-hint', args: { target: names.target } })}
        color="danger"
        entries={groups.dropped}
        fixOf={(e) => ({ label: t({ id: 'report-pick-target' }), run: () => fixes.onPickTarget(e.canon) })}
      />
      <Group
        title={t({ id: 'report-approximated' })}
        hint={t({ id: 'report-approximated-hint' })}
        color="bright"
        entries={groups.approximated}
        fixOf={() => undefined}
      />
      <Group
        title={t({ id: 'report-unrecognized' })}
        hint={t({ id: UNRECOGNIZED_HINT[unrecognized], args: { source: names.source } })}
        color="muted"
        entries={groups.unrecognized}
        fixOf={(e) => ({ label: t({ id: 'report-assign' }), run: () => fixes.onAssignSource(e.note) })}
      />
      <Group
        title={t({ id: 'report-unchanged' })}
        hint={t({ id: 'report-unchanged-hint' })}
        color="muted"
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
  return hasLoss(file.groups) || file.totals.untouched > 0;
}

function Headline({ view, targetName }: { view: ReportView; targetName: string }) {
  const t = useT();
  if (view.totals.converted === 0) {
    return (
      <p>
        <span className="font-semibold text-t1">{t({ id: 'report-nothing' })}</span>
        <span>{` ${t({ id: view.totals.untouched > 0 ? 'report-nothing-channel' : 'report-nothing-notes' })}`}</span>
      </p>
    );
  }
  if (view.clean) {
    return (
      <p>
        <span className="font-semibold text-t1">{t({ id: 'report-clean' })}</span>
        <span>{` ${t({ id: 'report-clean-detail', args: { target: targetName } })}`}</span>
      </p>
    );
  }
  return <p className="font-mono text-caption text-t4">{summaryLine(view, t)}</p>;
}

export function ReportModal({
  open,
  onClose,
  view,
  names,
  unrecognized,
  onPickTarget,
  onAssignSource,
  onChannel,
  onDropMissing,
}: {
  open: boolean;
  onClose: () => void;
  view: ReportView;
  names: EngineNames;
  unrecognized: Unrecognized;
  onDropMissing?: () => void;
} & ReportFixes) {
  const t = useT();
  const detailFiles = view.files.filter(hasDetail);
  const fixes: ReportFixes = {
    onPickTarget: (canon) => {
      track('report-fix-used', { fix: 'pick-target' });
      onPickTarget(canon);
      onClose();
    },
    onAssignSource: (note) => {
      track('report-fix-used', { fix: 'assign' });
      onAssignSource(note);
      onClose();
    },
    onChannel: () => {
      track('report-fix-used', { fix: 'channel-hint' });
      onChannel();
      onClose();
    },
  };
  return (
    <Modal open={open} heading={t({ id: 'report-heading' })} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <Headline view={view} targetName={names.target} />
        {(hasLoss(view.groups) || view.totals.untouched > 0) && (
          <GroupList groups={view.groups} untouched={view.totals.untouched} names={names} unrecognized={unrecognized} fixes={fixes} />
        )}
        {onDropMissing && (
          <div>
            <TextButton
              onClick={() => {
                track('missing-dropped', { where: 'report' });
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
                <GroupList groups={f.groups} untouched={f.totals.untouched} names={names} unrecognized={unrecognized} fixes={fixes} />
              </div>
            ))}
          </div>
        )}
        <ContactFooter />
      </div>
    </Modal>
  );
}
