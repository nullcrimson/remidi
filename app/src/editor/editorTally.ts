import type { Overrides } from '../core/midiremap';
import type { StatEvents } from '../core/umami';

/** Which of the two ways to pick a target note a pick was made on. */
export type PickVia = 'keyboard' | 'list';

/** How an editing session closed. */
export type CloseHow = StatEvents['editor-closed']['how'];

/** What one editing session of the note editor has done so far, and the edits it opened with. */
export interface Tally {
  keyboard: number;
  list: number;
  filtered: boolean;
  resets: number;
  opening: Overrides;
}

export const EMPTY_TALLY: Tally = { keyboard: 0, list: 0, filtered: false, resets: 0, opening: { edits: {}, srcEdits: {} } };

export type TallyAction
  = | { type: 'open'; edits: Overrides }
    | { type: 'pick'; via: PickVia }
    | { type: 'filter' }
    | { type: 'rowReset' };

export function tallyReducer(tally: Tally, action: TallyAction): Tally {
  switch (action.type) {
    case 'open':
      return { ...EMPTY_TALLY, opening: action.edits };
    case 'pick':
      return { ...tally, [action.via]: tally[action.via] + 1 };
    case 'filter':
      return { ...tally, filtered: true };
    case 'rowReset':
      return { ...tally, resets: tally.resets + 1 };
  }
}

function changedCount<V>(then: Record<string, V>, now: Record<string, V>): number {
  const keys = new Set([...Object.keys(then), ...Object.keys(now)]);
  return [...keys].filter((key) => then[key] !== now[key]).length;
}

/** The properties of the event that closes a session: what changed since it opened, and the tally. */
export function closingProps(how: CloseHow, { edits, srcEdits }: Overrides, { opening, keyboard, list, filtered, resets }: Tally): StatEvents['editor-closed'] {
  return {
    how,
    targets: changedCount(opening.edits, edits),
    sources: changedCount(opening.srcEdits, srcEdits),
    keyboard,
    list,
    filtered,
    resets,
  };
}
