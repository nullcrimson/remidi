import type { VoiceRow } from '../core/midiremap';
import { isPlayed } from '../core/outcome';

/** Which rows the editor lists. */
export type EditFilter = 'all' | 'changed' | 'issues';

/** A drum some source note plays that the target does not play as written. */
export const isIssue = (row: VoiceRow) => isPlayed(row) && row.outcome.status !== 'direct';
