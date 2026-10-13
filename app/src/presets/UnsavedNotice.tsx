import { useT } from '../locale/localeContext';

/** Says the presets are only in this session, because the browser would not store them. */
export function UnsavedNotice() {
  const t = useT();
  return (
    <p
      role="status"
      className="rounded-chip bg-danger/10 p-3 text-ui text-danger"
    >
      {t({ id: 'presets-unsaved' })}
    </p>
  );
}
