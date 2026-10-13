import type { VoiceRow } from '../core/midiremap';
import { isPlayed } from '../core/outcome';
import type { StatEvents } from '../core/umami';

/** Which rows the editor lists. */
export type EditFilter = StatEvents['editor-opened']['show'];

/** A drum some source note plays that the target does not play as written. */
export const isIssue = (row: VoiceRow) => isPlayed(row) && row.outcome.status !== 'direct';
