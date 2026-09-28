import { TextButton } from './TextButton';

export function StatusNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-chip
        bg-white/3 p-3 text-ui text-t3
      "
    >
      <span className="min-w-0 wrap-break-word">{message}</span>
      <TextButton onClick={onDismiss}>Dismiss</TextButton>
    </div>
  );
}
