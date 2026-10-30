import type { AppError } from '../core/errors';
import { errorParts } from './errorTitle';
import { useT } from '../locale/localeContext';

/** An error's translated message, with its untranslated technical detail after it. */
export function ErrorText({ error }: { error: AppError }) {
  const t = useT();
  const { message, detail } = errorParts(error, t);
  return (
    <>
      <span>{message}</span>
      {detail !== null && (
        <>
          <span>{' '}</span>
          <span className="font-mono text-label text-t5">{detail}</span>
        </>
      )}
    </>
  );
}
