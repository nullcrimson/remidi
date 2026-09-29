import type { Message } from '../generated/i18n';
import type { AppError } from './errors';

/** A line of the status notice: a message, or a file that failed to import and why. */
export type NoticeLine = { message: Message } | { failed: string; error: AppError };
