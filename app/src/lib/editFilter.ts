import type { VoiceRow } from './midiremap';

/** Which rows the editor lists. */
export type EditFilter = 'all' | 'changed' | 'issues';

/** A drum some source note plays that the target does not play as written. */
export const isIssue = (row: VoiceRow) => row.srcNotes.length > 0 && row.status !== 'direct';
