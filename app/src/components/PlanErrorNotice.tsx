import { useT } from '../localeContext';
import type { AppError } from '../lib/errors';
import { ErrorText } from './ErrorText';
import { Rich } from './Rich';
import { TextButton } from './TextButton';

export function PlanErrorNotice({ error, onReset }: { error: AppError; onReset: () => void }) {
  const t = useT();
  return (
    <div
      role="alert"
      className="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-chip
        bg-danger/10 p-3 text-ui text-danger
      "
    >
      <span className="min-w-0 wrap-break-word">
        <Rich id="plan-error" slots={{ error: <ErrorText error={error} /> }} />
      </span>
      <TextButton onClick={onReset}>{t({ id: 'plan-error-reset' })}</TextButton>
    </div>
  );
}
