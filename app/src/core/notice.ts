import type { Message } from '../generated/i18n';
import type { EnginePair } from './enginePair';
import type { AppError } from './errors';

/** A line of the status notice: a message, a file that failed to import and why, or why a rack could not be made. */
export type NoticeLine = { message: Message } | { failed: string; error: AppError } | { rackFailed: AppError };

/** The status notice and where it shows: above the saved mappings, or under the summary row of `pair`. */
export type Notice = { lines: NoticeLine[]; at: 'engines' } | { lines: NoticeLine[]; at: 'summary'; pair: EnginePair };
