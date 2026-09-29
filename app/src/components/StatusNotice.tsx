import { Fragment } from 'react';
import { t } from '../i18n';
import type { NoticeLine } from '../lib/notice';
import { ErrorText } from './ErrorText';
import { Rich } from './Rich';
import { TextButton } from './TextButton';

function Line({ line }: { line: NoticeLine }) {
  if ('message' in line) return t(line.message);
  return (
    <Rich
      id="import-failed"
      args={{ file: line.failed }}
      slots={{ error: <ErrorText error={line.error} /> }}
    />
  );
}

export function StatusNotice({ lines, onDismiss }: { lines: NoticeLine[]; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-chip
        bg-white/3 p-3 text-ui text-t3
      "
    >
      <span className="min-w-0 wrap-break-word">
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <Line line={line} />
          </Fragment>
        ))}
      </span>
      <TextButton onClick={onDismiss}>{t({ id: 'notice-dismiss' })}</TextButton>
    </div>
  );
}
