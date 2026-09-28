import { TextButton } from './TextButton';

export function PlanErrorNotice({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div
      role="alert"
      className="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-chip
        bg-danger/10 p-3 text-ui text-danger
      "
    >
      <span className="min-w-0 wrap-break-word">The note editor could not load: {message}</span>
      <TextButton onClick={onReset}>Reset edits</TextButton>
    </div>
  );
}
