import type { Translate } from '../i18n';
import { errorDetail, errorMessage, type AppError } from '../lib/errors';

/** An error's translated message, and its untranslated detail when it has one. */
export function errorParts(error: AppError, t: Translate): { message: string; detail: string | null } {
  const detail = errorDetail(error);
  return { message: t(errorMessage(error)), detail: detail === null ? null : t({ id: 'error-detail', args: { detail } }) };
}

/** An error as one line of plain text for a `title`. */
export function errorTitle(error: AppError, t: Translate): string {
  const { message, detail } = errorParts(error, t);
  return detail === null ? message : `${message} ${detail}`;
}
