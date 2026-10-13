import { useT } from '../locale/localeContext';
import type { AppError } from '../core/errors';
import { ErrorText } from '../ui/ErrorText';
import { Rich } from '../ui/Rich';
import { TextButton } from '../ui/TextButton';

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
