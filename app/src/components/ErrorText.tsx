import type { AppError } from '../lib/errors';
import { useT } from '../localeContext';
import { errorParts } from './errorTitle';

/** An error's translated message, with its untranslated technical detail after it. */
export function ErrorText({ error }: { error: AppError }) {
  const t = useT();
  const { message, detail } = errorParts(error, t);
  return (
    <>
      {message}
      {detail !== null && (
        <>
          {' '}
          <span className="font-mono text-label text-t5">{detail}</span>
        </>
      )}
    </>
  );
}
